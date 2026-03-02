"""Schwab integration — portfolio management and trade execution."""

from __future__ import annotations

import hashlib
import secrets
import time
from decimal import Decimal
from urllib.parse import urlencode

import httpx
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.integrations.base import BaseIntegration

logger = structlog.get_logger()

_SCHWAB_AUTH_URL = "https://api.schwabapi.com/v1/oauth/authorize"
_SCHWAB_TOKEN_URL = "https://api.schwabapi.com/v1/oauth/token"  # noqa: S105
_SCHWAB_API_BASE = "https://api.schwabapi.com/trader/v1"
_CONFIRMATION_TTL_SECONDS = 300


class SchwabAuthError(Exception):
    """Raised when Schwab OAuth authentication fails."""


class SchwabTradeError(Exception):
    """Raised when a trade operation fails."""


class SchwabClient(BaseIntegration):
    """Integration client for Schwab brokerage APIs.

    Trade execution requires a TWO-STEP confirmation process.
    """

    _pending_confirmations: dict[str, tuple[dict, float, str]] = {}
    _pending_oauth_states: dict[str, tuple[str, float]] = {}
    _OAUTH_STATE_TTL_SECONDS = 600

    def __init__(self, user_id: str, db: AsyncSession) -> None:
        super().__init__(user_id, db)
        settings = get_settings()
        self._app_key = settings.schwab_app_key
        self._app_secret = settings.schwab_app_secret
        self._callback_url = settings.schwab_callback_url

    def get_authorization_url(self) -> tuple[str, str]:
        """Generate Schwab OAuth authorization URL and CSRF state token."""
        state = secrets.token_urlsafe(32)
        self._pending_oauth_states[state] = (
            self.user_id,
            time.time() + self._OAUTH_STATE_TTL_SECONDS,
        )
        params = urlencode(
            {
                "client_id": self._app_key,
                "redirect_uri": self._callback_url,
                "response_type": "code",
                "state": state,
            }
        )
        url = f"{_SCHWAB_AUTH_URL}?{params}"
        return url, state

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def authenticate(self, authorization_code: str, *, state: str) -> dict:
        """Exchange an OAuth authorization code for access and refresh tokens."""
        pending = self._pending_oauth_states.pop(state, None)
        if pending is None:
            raise SchwabAuthError("Invalid or expired OAuth state parameter")
        state_user_id, expiry = pending
        if state_user_id != self.user_id or time.time() > expiry:
            raise SchwabAuthError("Invalid or expired OAuth state parameter")

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                _SCHWAB_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "redirect_uri": self._callback_url,
                    "client_id": self._app_key,
                    "client_secret": self._app_secret,
                },
            )
            response.raise_for_status()
            data = response.json()

        await self.store_credential("schwab_access_token", data["access_token"])
        await self.store_credential("schwab_refresh_token", data["refresh_token"])
        await self._audit(action="schwab_authenticate", resource_type="schwab")
        return {
            "token_type": data.get("token_type", "Bearer"),
            "expires_in": data.get("expires_in", 1800),
        }

    async def _refresh_access_token(self) -> str:
        refresh_token = await self.get_credential("schwab_refresh_token")
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(
                _SCHWAB_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self._app_key,
                    "client_secret": self._app_secret,
                },
            )
            response.raise_for_status()
            data = response.json()
        await self.store_credential("schwab_access_token", data["access_token"])
        if "refresh_token" in data:
            await self.store_credential("schwab_refresh_token", data["refresh_token"])
        return data["access_token"]

    async def _get_access_token(self) -> str:
        try:
            return await self.get_credential("schwab_access_token")
        except KeyError:
            return await self._refresh_access_token()

    async def _api_request(
        self, method: str, path: str, *, json: dict | None = None, params: dict | None = None
    ) -> dict:
        access_token = await self._get_access_token()
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{_SCHWAB_API_BASE}{path}"

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(method, url, headers=headers, json=json, params=params)
            if response.status_code == 401:
                access_token = await self._refresh_access_token()
                headers["Authorization"] = f"Bearer {access_token}"
                response = await client.request(
                    method, url, headers=headers, json=json, params=params
                )
            response.raise_for_status()
            return response.json() if response.content else {}

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException)),
        reraise=True,
    )
    async def get_portfolio(self) -> dict:
        """Fetch portfolio positions and total value across all Schwab accounts."""
        data = await self._api_request("GET", "/accounts")
        accounts_data = data if isinstance(data, list) else data.get("accounts", [])

        portfolio: dict = {"accounts": [], "total_value": Decimal("0")}
        for acct in accounts_data:
            acct_info = acct.get("securitiesAccount", acct)
            positions = [
                {
                    "symbol": pos.get("instrument", {}).get("symbol", ""),
                    "quantity": pos.get("longQuantity", 0),
                    "market_value": pos.get("marketValue", 0),
                    "average_price": pos.get("averagePrice", 0),
                    "asset_type": pos.get("instrument", {}).get("assetType", "EQUITY"),
                }
                for pos in acct_info.get("positions", [])
            ]

            account_value = Decimal(
                str(acct_info.get("currentBalances", {}).get("liquidationValue", 0))
            )
            portfolio["accounts"].append(
                {
                    "account_number_masked": _mask_account(acct_info.get("accountNumber", "")),
                    "type": acct_info.get("type", ""),
                    "value": float(account_value),
                    "positions": positions,
                }
            )
            portfolio["total_value"] += account_value

        portfolio["total_value"] = float(portfolio["total_value"])
        await self._audit(action="schwab_portfolio_fetch", resource_type="portfolio")
        return portfolio

    async def place_trade(
        self,
        symbol: str,
        quantity: int,
        order_type: str,
        action: str,
        *,
        limit_price: float | None = None,
    ) -> dict:
        """Preview a trade order (step 1 of 2). Returns a confirmation token."""
        if order_type.upper() == "LIMIT" and limit_price is None:
            raise SchwabTradeError("limit_price is required for LIMIT orders")

        order_payload = {
            "orderType": order_type.upper(),
            "session": "NORMAL",
            "duration": "DAY",
            "orderStrategyType": "SINGLE",
            "orderLegCollection": [
                {
                    "instruction": action.upper(),
                    "quantity": quantity,
                    "instrument": {"symbol": symbol.upper(), "assetType": "EQUITY"},
                }
            ],
        }
        if limit_price is not None:
            order_payload["price"] = str(limit_price)

        preview = {
            "symbol": symbol.upper(),
            "quantity": quantity,
            "order_type": order_type.upper(),
            "action": action.upper(),
            "limit_price": limit_price,
            "estimated_cost": round(limit_price * quantity, 2) if limit_price else None,
            "status": "PENDING_CONFIRMATION",
        }

        token = self._generate_confirmation_token(preview)
        self._pending_confirmations[token] = (
            {**preview, "_order_payload": order_payload},
            time.time() + _CONFIRMATION_TTL_SECONDS,
            self.user_id,
        )
        await self._audit(action="schwab_trade_preview", resource_type="trade", metadata=preview)
        return {
            "preview": preview,
            "confirmation_token": token,
            "expires_in_seconds": _CONFIRMATION_TTL_SECONDS,
        }

    async def confirm_trade(self, confirmation_token: str) -> dict:
        """Execute a previously previewed trade (step 2 of 2)."""
        self._cleanup_expired_confirmations()
        pending = self._pending_confirmations.pop(confirmation_token, None)
        if pending is None:
            raise SchwabTradeError("Invalid or expired confirmation token")

        order_data, expiry, token_user_id = pending
        if token_user_id != self.user_id or time.time() > expiry:
            raise SchwabTradeError("Invalid or expired confirmation token")

        order_payload = order_data.pop("_order_payload")
        result = await self._api_request("POST", "/accounts/orders", json=order_payload)
        order_id = result.get("orderId", "")
        await self._audit(
            action="schwab_trade_execute", resource_type="trade", resource_id=order_id
        )
        return {"order_id": order_id, "status": "EXECUTED", "details": order_data}

    @staticmethod
    def _generate_confirmation_token(preview: dict) -> str:
        nonce = secrets.token_hex(16)
        payload = f"{preview['symbol']}:{preview['quantity']}:{preview['action']}:{nonce}"
        return hashlib.sha256(payload.encode()).hexdigest()

    @classmethod
    def _cleanup_expired_confirmations(cls) -> None:
        now = time.time()
        expired = [t for t, (_, exp, _) in cls._pending_confirmations.items() if now > exp]
        for t in expired:
            cls._pending_confirmations.pop(t, None)

    async def sync(self) -> None:
        """Pull latest portfolio data from Schwab."""
        await self.get_portfolio()

    async def health_check(self) -> bool:
        """Verify Schwab API connectivity and OAuth tokens."""
        try:
            await self.get_portfolio()
            return True
        except Exception:
            return False


def _mask_account(account_number: str) -> str:
    if len(account_number) <= 4:
        return "****"
    return "*" * (len(account_number) - 4) + account_number[-4:]
