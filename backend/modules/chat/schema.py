"""聊天模块请求模型"""

from pydantic import BaseModel, Field

from models.conversation import ConversationSource


class _ChatRequestBase(BaseModel):
    """聊天请求公共字段"""
    model: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=50000)
    thinking_enabled: bool = False


class NewChatRequest(_ChatRequestBase):
    """新会话聊天请求"""
    source: ConversationSource


class ContinueChatRequest(_ChatRequestBase):
    """续聊请求（conversation_id 从路径参数获取）"""
    pass
