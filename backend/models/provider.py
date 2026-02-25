from sqlalchemy import Boolean, String
from sqlalchemy.dialects.postgresql import JSONB
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
    base_url_map: Mapped[dict] = mapped_column(
        JSONB(), nullable=False, server_default="{}",
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="true",
    )
