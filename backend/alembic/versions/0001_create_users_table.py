"""create users table

Revision ID: 0001
Revises:
Create Date: 2026-02-19 00:32:25.335340

"""
import uuid
from typing import Sequence, Union

import bcrypt
from alembic import op
import sqlalchemy as sa


revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('password_hash', sa.String(length=128), nullable=False),
        sa.Column('role', sa.String(length=20), server_default='user', nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username'),
    )

    # 内置管理员账户
    hashed = bcrypt.hashpw(b'admin123', bcrypt.gensalt()).decode()
    op.execute(
        sa.text(
            "INSERT INTO users (id, username, password_hash, role, created_at, updated_at) "
            "VALUES (:id, :username, :password_hash, :role, now(), now()) "
            "ON CONFLICT (username) DO NOTHING"
        ).bindparams(
            id=uuid.uuid4(),
            username='admin',
            password_hash=hashed,
            role='admin',
        )
    )


def downgrade() -> None:
    op.drop_table('users')
