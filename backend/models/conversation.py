import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base


class ConversationSource(str, Enum):
    GENERAL_CHAT = "general_chat"


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class MessageStatus(str, Enum):
    GENERATING = "generating"
    COMPLETED = "completed"
    ABORTED = "aborted"


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        Index("ix_conversations_user_id_last_chat_time", "user_id", "last_chat_time"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("users.id"), nullable=False,
    )
    source: Mapped[str] = mapped_column(
        String(30), nullable=False,
    )
    title: Mapped[str | None] = mapped_column(
        String(200), nullable=True,
    )
    last_model: Mapped[str] = mapped_column(
        String(100), nullable=False,
    )
    last_chat_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(),
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (
        UniqueConstraint("conversation_id", "order", name="uq_messages_conversation_id_order"),
    )

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(), ForeignKey("users.id"), nullable=False, index=True,
    )
    order: Mapped[int] = mapped_column(
        Integer(), nullable=False,
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text(), nullable=False, server_default="",
    )
    model: Mapped[str | None] = mapped_column(
        String(100), nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="completed",
    )
    thinking: Mapped[str | None] = mapped_column(
        Text(), nullable=True,
    )
