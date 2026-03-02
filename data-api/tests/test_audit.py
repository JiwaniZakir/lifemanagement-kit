"""Tests for hash-chained audit logging."""

from __future__ import annotations

from app.security.audit import _compute_hash


def test_compute_hash_deterministic():
    """Same inputs should produce same hash."""
    h1 = _compute_hash("genesis", "read", "finance", "123", "user1")
    h2 = _compute_hash("genesis", "read", "finance", "123", "user1")
    assert h1 == h2


def test_compute_hash_changes_with_prev():
    """Different prev_hash should produce different entry hash."""
    h1 = _compute_hash("genesis", "read", "finance", "123", "user1")
    h2 = _compute_hash("other_hash", "read", "finance", "123", "user1")
    assert h1 != h2


def test_compute_hash_changes_with_action():
    """Different actions should produce different hashes."""
    h1 = _compute_hash("genesis", "read", "finance", "123", "user1")
    h2 = _compute_hash("genesis", "write", "finance", "123", "user1")
    assert h1 != h2


def test_compute_hash_is_sha256():
    """Hash should be a 64-char hex string (SHA-256)."""
    h = _compute_hash("genesis", "read", "finance", "123", "user1")
    assert len(h) == 64
    assert all(c in "0123456789abcdef" for c in h)
