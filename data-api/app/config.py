"""Aegis data-api — Application configuration via environment variables."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_env_path = Path(".env")
_env_file: str | None = ".env" if _env_path.is_file() and os.access(_env_path, os.R_OK) else None


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Core ---
    environment: str = "development"
    data_api_token: str = Field(min_length=32)

    # --- Encryption ---
    encryption_master_key: str = Field(default="", min_length=0)
    encryption_master_key_file: str = ""

    # --- Database ---
    postgres_user: str = "aegis"
    postgres_password: str = ""
    postgres_db: str = "aegis"
    database_url: str = ""

    # --- Plaid ---
    plaid_client_id: str = ""
    plaid_secret: str = ""
    plaid_env: str = "sandbox"

    # --- Schwab ---
    schwab_app_key: str = ""
    schwab_app_secret: str = ""
    schwab_callback_url: str = ""

    # --- Google ---
    google_client_id: str = ""
    google_client_secret: str = ""

    # --- Microsoft ---
    azure_client_id: str = ""
    azure_client_secret: str = ""
    azure_tenant_id: str = ""

    # --- Canvas ---
    canvas_api_url: str = ""

    # --- Blackboard ---
    blackboard_url: str = ""
    blackboard_username: str = ""
    blackboard_password: str = ""

    # --- LinkedIn ---
    linkedin_access_token: str = ""

    # --- X / Twitter ---
    x_api_key: str = ""
    x_api_secret: str = ""
    x_access_token: str = ""
    x_access_token_secret: str = ""
    x_bearer_token: str = ""

    # --- Garmin ---
    garmin_email: str = ""
    garmin_password: str = ""

    # --- Spotify ---
    spotify_client_id: str = ""
    spotify_client_secret: str = ""

    # --- Health Goals ---
    daily_protein_target_g: int = 175
    daily_calorie_limit: int = 1900

    # --- LLM Budget Guardrails ---
    llm_daily_budget_usd: float = 5.00
    llm_monthly_budget_usd: float = 50.00

    @property
    def async_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@localhost:5432/{self.postgres_db}"
        )

    @property
    def sync_database_url(self) -> str:
        url = self.async_database_url
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)

    @property
    def master_key_bytes(self) -> bytes:
        """Load encryption key from Docker secret file if available, else env var."""
        key_hex = self.encryption_master_key
        if self.encryption_master_key_file:
            secret_path = Path(self.encryption_master_key_file)
            if secret_path.is_file():
                key_hex = secret_path.read_text().strip()
        if not key_hex or len(key_hex) < 64:  # noqa: PLR2004
            msg = (
                "ENCRYPTION_MASTER_KEY must be at least 64 hex chars. "
                "Set via env var or ENCRYPTION_MASTER_KEY_FILE pointing to a Docker secret."
            )
            raise ValueError(msg)
        try:
            return bytes.fromhex(key_hex)
        except ValueError as exc:
            msg = f"ENCRYPTION_MASTER_KEY contains invalid hex characters: {exc}"
            raise ValueError(msg) from exc


@lru_cache
def get_settings() -> Settings:
    return Settings()
