"""Add Spotify listening history and top snapshot tables.

Revision ID: 002
Revises: 001
Create Date: 2026-03-09
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "listening_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("spotify_track_id", sa.String(64), nullable=False),
        sa.Column("spotify_artist_id", sa.String(64), nullable=False),
        sa.Column("spotify_album_id", sa.String(64), nullable=False),
        sa.Column("spotify_context_uri", sa.String(255), nullable=True),
        sa.Column("track_name", sa.String(512), nullable=False),
        sa.Column("artist_name", sa.String(512), nullable=False),
        sa.Column("album_name", sa.String(512), nullable=False),
        sa.Column("played_at_utc", sa.String(32), nullable=False),
        sa.Column("played_at_ts", sa.BigInteger(), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("explicit", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("popularity", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("context_type", sa.String(32), nullable=True),
        sa.Column("energy", sa.Float(), nullable=True),
        sa.Column("valence", sa.Float(), nullable=True),
        sa.Column("tempo", sa.Float(), nullable=True),
        sa.Column("danceability", sa.Float(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_listening_history_user_id", "listening_history", ["user_id"])
    op.create_index("ix_listening_history_played_at_ts", "listening_history", ["played_at_ts"])
    op.create_index(
        "uq_listening_history_user_played_at",
        "listening_history",
        ["user_id", "played_at_utc"],
        unique=True,
    )
    op.create_index(
        "ix_listening_history_user_ts",
        "listening_history",
        ["user_id", "played_at_ts"],
    )

    op.create_table(
        "spotify_top_snapshot",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("snapshot_type", sa.String(16), nullable=False),
        sa.Column("time_range", sa.String(16), nullable=False),
        sa.Column("items_json", sa.Text(), nullable=False),
        sa.Column("item_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_spotify_top_user_id", "spotify_top_snapshot", ["user_id"])
    op.create_index(
        "ix_spotify_top_user_type_range",
        "spotify_top_snapshot",
        ["user_id", "snapshot_type", "time_range"],
    )


def downgrade() -> None:
    op.drop_table("spotify_top_snapshot")
    op.drop_table("listening_history")
