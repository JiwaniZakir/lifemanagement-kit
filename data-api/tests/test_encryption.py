"""Tests for AES-256-GCM encryption."""

from __future__ import annotations

import pytest

from app.security.encryption import decrypt_field, encrypt_field


def test_encrypt_decrypt_roundtrip(master_key):
    """Encrypting then decrypting should return original plaintext."""
    plaintext = "my-secret-api-key-12345"
    encrypted = encrypt_field(plaintext, master_key)
    decrypted = decrypt_field(encrypted, master_key)
    assert decrypted == plaintext


def test_encrypt_with_aad_context(master_key):
    """Encryption with AAD context should require same context for decryption."""
    plaintext = "secret-value"
    context = "aegis:credentials:user:123:service:plaid"
    encrypted = encrypt_field(plaintext, master_key, context=context)

    # Correct context works
    decrypted = decrypt_field(encrypted, master_key, context=context)
    assert decrypted == plaintext

    # Wrong context fails
    with pytest.raises(ValueError):
        decrypt_field(encrypted, master_key, context="wrong-context")


def test_encrypt_no_context_different_from_with_context(master_key):
    """Ciphertext with no context should not decrypt with a context."""
    plaintext = "test"
    encrypted_no_ctx = encrypt_field(plaintext, master_key)
    encrypted_with_ctx = encrypt_field(plaintext, master_key, context="ctx")

    # They should be different ciphertexts
    assert encrypted_no_ctx != encrypted_with_ctx


def test_invalid_key_length():
    """Key must be exactly 32 bytes."""
    with pytest.raises(ValueError, match="32 bytes"):
        encrypt_field("test", b"short")


def test_each_encryption_produces_unique_ciphertext(master_key):
    """Same plaintext encrypted twice should produce different ciphertexts (random nonce)."""
    plaintext = "same-value"
    e1 = encrypt_field(plaintext, master_key)
    e2 = encrypt_field(plaintext, master_key)
    assert e1 != e2

    # But both decrypt to the same value
    assert decrypt_field(e1, master_key) == plaintext
    assert decrypt_field(e2, master_key) == plaintext
