"""聊天模块请求/响应模型"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


# ── Conversation ──

class ConversationResponse(BaseModel):
    id: uuid.UUID
    title: str | None
    last_model: str
    last_chat_time: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Chat ──

class _ChatRequestBase(BaseModel):
    """聊天请求公共字段"""
    model: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=50000)
    thinking_enabled: bool = False


class NewChatRequest(_ChatRequestBase):
    """新会话聊天请求"""
    pass


class ContinueChatRequest(_ChatRequestBase):
    """续聊请求（conversation_id 从路径参数获取）"""
    pass
