"""create provider and model tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision: str = '0003'
down_revision: Union[str, Sequence[str], None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # providers
    op.create_table('providers',
        sa.Column('name', sa.String(length=50), nullable=False),
        sa.Column('api_key', sa.String(length=500), nullable=False),
        sa.Column('base_url_map', JSONB(), server_default='{}', nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )

    # models（M:N，模型名全局唯一）
    op.create_table('models',
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('display_name', sa.String(length=100), nullable=False),
        sa.Column('manufacturer', sa.String(length=20), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name', name='uq_models_name'),
    )

    # model_provider_links（关联表）
    op.create_table('model_provider_links',
        sa.Column('model_id', sa.Uuid(), nullable=False),
        sa.Column('provider_id', sa.Uuid(), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['model_id'], ['models.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['provider_id'], ['providers.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('model_id', 'provider_id', name='uq_model_provider_links_model_provider'),
    )
    op.create_index('ix_model_provider_links_model_id', 'model_provider_links', ['model_id'])
    op.create_index('ix_model_provider_links_provider_id', 'model_provider_links', ['provider_id'])


def downgrade() -> None:
    op.drop_index('ix_model_provider_links_provider_id', table_name='model_provider_links')
    op.drop_index('ix_model_provider_links_model_id', table_name='model_provider_links')
    op.drop_table('model_provider_links')
    op.drop_table('models')
    op.drop_table('providers')
