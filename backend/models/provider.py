import uuid

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint, Uuid
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class Provider(Base):
    __tablename__ = "providers"

    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False,
    )
    api_key: Mapped[str] = mapped_column(
        String(500), nullable=False,
    )
    base_url_map: Mapped[dict] = mapped_column(
        JSONB(), nullable=False, server_default="{}",
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="true",
    )
    models: Mapped[list["Model"]] = relationship(back_populates="provider")


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
    manufacturer: Mapped[str] = mapped_column(
        String(20), nullable=False,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="true",
    )
    provider: Mapped["Provider"] = relationship(back_populates="models")
