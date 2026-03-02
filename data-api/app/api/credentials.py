"""Credentials API — encrypted credential CRUD."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.credential import Credential
from app.security.audit import audit_log
from app.security.encryption import decrypt_field, encrypt_field

router = APIRouter(tags=["credentials"])


class CredentialCreate(BaseModel):
    user_id: str
    service_name: str
    value: str


class CredentialOut(BaseModel):
    user_id: str
    service_name: str


@router.post("", status_code=201)
async def store_credential(body: CredentialCreate, db: AsyncSession = Depends(get_db)) -> dict:
    """Encrypt and store a credential."""
    settings = get_settings()
    context = f"aegis:credentials:user:{body.user_id}:service:{body.service_name}"
    encrypted = encrypt_field(body.value, settings.master_key_bytes, context=context)

    stmt = select(Credential).where(
        Credential.user_id == body.user_id,
        Credential.service_name == body.service_name,
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        existing.encrypted_value = encrypted
    else:
        cred = Credential(
            user_id=body.user_id,
            service_name=body.service_name,
            encrypted_value=encrypted,
        )
        db.add(cred)

    await audit_log(
        db,
        action="credential_store",
        resource_type="credential",
        resource_id=body.service_name,
        detail=f"Stored credential for service: {body.service_name}",
    )
    return {"ok": True, "service_name": body.service_name}


@router.get("/{user_id}/{service_name}")
async def get_credential(
    user_id: str, service_name: str, db: AsyncSession = Depends(get_db)
) -> dict:
    """Retrieve and decrypt a stored credential."""
    settings = get_settings()
    stmt = select(Credential).where(
        Credential.user_id == user_id,
        Credential.service_name == service_name,
    )
    result = await db.execute(stmt)
    cred = result.scalar_one_or_none()

    if cred is None:
        raise HTTPException(status_code=404, detail="Credential not found")

    context = f"aegis:credentials:user:{user_id}:service:{service_name}"
    value = decrypt_field(cred.encrypted_value, settings.master_key_bytes, context=context)

    await audit_log(
        db,
        action="credential_accessed",
        resource_type="credential",
        resource_id=service_name,
    )
    return {"service_name": service_name, "value": value}


@router.delete("/{user_id}/{service_name}")
async def delete_credential(
    user_id: str, service_name: str, db: AsyncSession = Depends(get_db)
) -> dict:
    """Delete a stored credential."""
    stmt = delete(Credential).where(
        Credential.user_id == user_id,
        Credential.service_name == service_name,
    )
    result = await db.execute(stmt)
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Credential not found")

    await audit_log(
        db,
        action="credential_delete",
        resource_type="credential",
        resource_id=service_name,
    )
    return {"ok": True, "deleted": service_name}


@router.get("/{user_id}")
async def list_credentials(
    user_id: str, db: AsyncSession = Depends(get_db)
) -> list[CredentialOut]:
    """List all credentials for a user (names only, no values)."""
    stmt = select(Credential).where(Credential.user_id == user_id)
    result = await db.execute(stmt)
    creds = result.scalars().all()
    return [CredentialOut(user_id=c.user_id, service_name=c.service_name) for c in creds]
