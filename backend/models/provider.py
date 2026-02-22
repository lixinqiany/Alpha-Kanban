import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class Provider(Base):
    __tablename__ = "providers"

    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False,
    )
    api_key: Mapped[str] = mapped_column(
        String(500), nullable=False,
    )
    base_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="true",
    )


class Model(Base):
    __tablename__ = "models"
    __table_args__ = (
        UniqueConstraint("provider_id", "name", name="uq_models_provider_id_name"),
    )

    provider_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False,
    )
    display_name: Mapped[str] = mapped_column(
        String(100), nullable=False,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="true",
    )
