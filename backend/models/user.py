from enum import Enum

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from models.base import Base


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class User(Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(
        String(128), nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default=UserRole.USER.value,
    )
