import uuid

from sqlalchemy import Boolean, ForeignKey, Index, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class ModelProviderLink(Base):
    __tablename__ = "model_provider_links"
    __table_args__ = (
        UniqueConstraint("model_id", "provider_id", name="uq_model_provider_links_model_provider"),
        Index("ix_model_provider_links_model_id", "model_id"),
        Index("ix_model_provider_links_provider_id", "provider_id"),
    )

    model_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("models.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("providers.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="true",
    )
    model: Mapped["Model"] = relationship(back_populates="provider_links")
    provider: Mapped["Provider"] = relationship()


from models.model import Model  # noqa: E402, F401
from models.provider import Provider  # noqa: E402, F401
