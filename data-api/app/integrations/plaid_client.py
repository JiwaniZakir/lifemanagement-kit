"""Plaid integration — banking transactions, balances, and recurring charges."""

from __future__ import annotations

import asyncio
from decimal import Decimal

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.integrations.base import BaseIntegration
from app.models.account import Account
from app.models.transaction import Transaction
from app.security.encryption import encrypt_field

logger = structlog.get_logger()

try:
    from plaid.api import plaid_api
    from plaid.api_client import ApiClient
    from plaid.configuration import Configuration
    from plaid.exceptions import ApiException as PlaidApiException
    from plaid.model.accounts_balance_get_request import AccountsBalanceGetRequest
    from plaid.model.country_code import CountryCode
    from plaid.model.item_public_token_exchange_request import (
        ItemPublicTokenExchangeRequest,
    )
    from plaid.model.link_token_create_request import LinkTokenCreateRequest
    from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
    from plaid.model.products import Products
    from plaid.model.transactions_sync_request import TransactionsSyncRequest

    PLAID_AVAILABLE = True
except ImportError:
    PLAID_AVAILABLE = False
    PlaidApiException = Exception  # type: ignore[assignment,misc]

_PLAID_ENV_MAP = {
    "sandbox": "https://sandbox.plaid.com",
    "development": "https://development.plaid.com",
    "production": "https://production.plaid.com",
}


class PlaidUnavailableError(RuntimeError):
    """Raised when the plaid-python package is not installed."""


class PlaidClient(BaseIntegration):
    """Integration client for Plaid banking APIs."""

    def __init__(self, user_id: str, db: AsyncSession) -> None:
        super().__init__(user_id, db)
        if not PLAID_AVAILABLE:
            msg = (
                "plaid-python is not installed. "
                "Install with: uv pip install 'aegis-data-api[integrations]'"
            )
            raise PlaidUnavailableError(msg)

        settings = get_settings()
        self._client_id = settings.plaid_client_id
        self._secret = settings.plaid_secret
        self._env = settings.plaid_env
        self._api_client = self._build_api_client()
        self._plaid = plaid_api.PlaidApi(self._api_client)

    def _build_api_client(self) -> ApiClient:
        host = _PLAID_ENV_MAP.get(self._env, _PLAID_ENV_MAP["sandbox"])
        configuration = Configuration(host=host)
        configuration.api_key["clientId"] = self._client_id
        configuration.api_key["secret"] = self._secret
        return ApiClient(configuration)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, PlaidApiException)),
        reraise=True,
    )
    async def create_link_token(self) -> dict:
        """Create a Plaid Link token."""
        request = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(client_user_id=self.user_id),
            client_name="Aegis",
            products=[Products("transactions")],
            country_codes=[CountryCode("US")],
            language="en",
        )
        response = await asyncio.to_thread(self._plaid.link_token_create, request)
        self._log.info("plaid_link_token_created")
        await self._audit(action="plaid_link_token_create", resource_type="plaid")
        return {"link_token": response.link_token, "expiration": response.expiration}

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, PlaidApiException)),
        reraise=True,
    )
    async def exchange_public_token(self, public_token: str) -> str:
        """Exchange a public token for a persistent access token."""
        request = ItemPublicTokenExchangeRequest(public_token=public_token)
        response = await asyncio.to_thread(self._plaid.item_public_token_exchange, request)
        await self.store_credential("plaid_access_token", response.access_token)
        self._log.info("plaid_token_exchanged", item_id=response.item_id)
        await self._audit(
            action="plaid_token_exchange",
            resource_type="plaid",
            resource_id=response.item_id,
        )
        return response.item_id

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, PlaidApiException)),
        reraise=True,
    )
    async def sync_transactions(self) -> list[dict]:
        """Fetch transactions via Plaid Transactions Sync and persist to DB."""
        settings = get_settings()
        access_token = await self.get_credential("plaid_access_token")
        added: list[dict] = []
        has_more = True

        # Load persisted cursor for incremental sync
        try:
            cursor = await self.get_credential("plaid_sync_cursor")
        except (KeyError, ValueError):
            cursor = ""

        while has_more:
            request = TransactionsSyncRequest(
                access_token=access_token,
                cursor=cursor if cursor else None,
            )
            response = await asyncio.to_thread(self._plaid.transactions_sync, request)
            cursor = response.next_cursor
            has_more = response.has_more

            for txn in response.added:
                encrypted_memo = None
                if txn.name:
                    encrypted_memo = encrypt_field(
                        txn.name,
                        settings.master_key_bytes,
                        context=f"transaction.memo.{self.user_id}",
                    )

                existing = await self.db.execute(
                    select(Transaction).where(
                        Transaction.plaid_transaction_id == txn.transaction_id
                    )
                )
                if existing.scalar_one_or_none() is not None:
                    continue

                account = await self._get_or_create_account(txn.account_id)
                db_txn = Transaction(
                    account_id=account.id,
                    amount=Decimal(str(txn.amount)),
                    transaction_date=txn.date,
                    category=txn.personal_finance_category.primary
                    if txn.personal_finance_category
                    else (txn.category[0] if txn.category else None),
                    merchant=txn.merchant_name,
                    encrypted_memo=encrypted_memo,
                    plaid_transaction_id=txn.transaction_id,
                    is_recurring=False,
                )
                self.db.add(db_txn)
                added.append(
                    {
                        "amount": float(txn.amount),
                        "date": str(txn.date),
                        "category": db_txn.category,
                        "merchant": txn.merchant_name,
                    }
                )

        # Persist cursor for next incremental sync
        if cursor:
            await self.store_credential("plaid_sync_cursor", cursor)

        await self.db.flush()
        self._log.info("plaid_transactions_synced", count=len(added))
        await self._audit(
            action="plaid_transaction_sync",
            resource_type="transaction",
            metadata={"count": len(added)},
        )
        return added

    async def _get_or_create_account(self, plaid_account_id: str) -> Account:
        result = await self.db.execute(
            select(Account).where(Account.plaid_account_id == plaid_account_id)
        )
        account = result.scalar_one_or_none()
        if account is not None:
            return account

        account = Account(
            user_id=self.user_id,
            institution="Plaid",
            account_type="depository",
            account_name=f"Account {plaid_account_id[:8]}",
            plaid_account_id=plaid_account_id,
        )
        self.db.add(account)
        await self.db.flush()
        return account

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((ConnectionError, PlaidApiException)),
        reraise=True,
    )
    async def get_balances(self) -> list[dict]:
        """Fetch current balances across all linked accounts."""
        access_token = await self.get_credential("plaid_access_token")
        request = AccountsBalanceGetRequest(access_token=access_token)
        response = await asyncio.to_thread(self._plaid.accounts_balance_get, request)

        balances = []
        for acct in response.accounts:
            balances.append(
                {
                    "account_id": acct.account_id,
                    "name": acct.name,
                    "type": acct.type.value if acct.type else None,
                    "current": float(acct.balances.current) if acct.balances.current else 0,
                    "available": float(acct.balances.available)
                    if acct.balances.available
                    else None,
                    "currency": acct.balances.iso_currency_code or "USD",
                }
            )

            db_result = await self.db.execute(
                select(Account).where(Account.plaid_account_id == acct.account_id)
            )
            db_account = db_result.scalar_one_or_none()
            if db_account:
                db_account.balance = Decimal(str(acct.balances.current or 0))

        await self.db.flush()
        self._log.info("plaid_balances_fetched", count=len(balances))
        await self._audit(
            action="plaid_balance_fetch",
            resource_type="account",
            metadata={"account_count": len(balances)},
        )
        return balances

    async def sync(self) -> None:
        await self.sync_transactions()
        await self.get_balances()

    async def health_check(self) -> bool:
        try:
            await self.get_balances()
            return True
        except Exception:
            return False
