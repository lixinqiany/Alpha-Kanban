from sqlalchemy import Boolean, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from models.base import Base


class Model(Base):
    __tablename__ = "models"
    __table_args__ = (
        UniqueConstraint("name", name="uq_models_name"),
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
    provider_links: Mapped[list["ModelProviderLink"]] = relationship(
        back_populates="model", cascade="all, delete-orphan",
    )


# 避免循环导入
from models.model_provider_link import ModelProviderLink  # noqa: E402, F401
