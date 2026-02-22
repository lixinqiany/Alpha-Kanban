"""add user role and seed admin

Revision ID: a3f1b2c4d5e6
Revises: ec1e6cd7a1eb
Create Date: 2026-02-22 20:00:00.000000

"""
import uuid
from typing import Sequence, Union

import bcrypt
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f1b2c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'ec1e6cd7a1eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 添加 role 列，默认值为 'user'
    op.add_column(
        'users',
        sa.Column('role', sa.String(length=20), server_default='user', nullable=False),
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
    # 删除内置管理员（如果存在）
    op.execute(
        sa.text("DELETE FROM users WHERE username = 'admin' AND role = 'admin'")
    )
    op.drop_column('users', 'role')
