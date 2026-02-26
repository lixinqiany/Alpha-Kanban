"""General Chat 模块响应模型"""

import uuid
from datetime import datetime

from pydantic import BaseModel


class ConversationResponse(BaseModel):
    id: uuid.UUID
    source: str
    title: str | None
    last_model: str
    last_chat_time: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    model: str | None
    status: str
    thinking: str | None
    order: int
    created_at: datetime

    model_config = {"from_attributes": True}
