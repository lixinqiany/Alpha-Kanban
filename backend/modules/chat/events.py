"""SSE 事件协议 v1 — 事件枚举 + payload 模型 + 类型安全的 pack 函数"""

from enum import StrEnum

from pydantic import BaseModel


class ChatSSEEvent(StrEnum):
    """聊天 SSE 事件类型"""
    CONVERSATION_START = "conversation.start"
    MESSAGE_STARTED = "message.started"
    THINKING_DELTA = "thinking.delta"
    TEXT_DELTA = "text.delta"
    MESSAGE_DONE = "message.done"
    CONVERSATION_DONE = "conversation.done"
    ERROR = "error"


# ── Payload 模型 ──

class ConversationStartPayload(BaseModel):
    conversation_id: str
    is_new: bool
    title: str | None = None

class MessageStartedPayload(BaseModel):
    message_id: str

class DeltaPayload(BaseModel):
    delta: str

class MessageDonePayload(BaseModel):
    message_id: str
    content: str
    thinking: str | None = None

class ConversationDonePayload(BaseModel):
    conversation_id: str
    # TODO: 后续增加 usage 字段，从 adapter 层获取 token 用量

class ErrorPayload(BaseModel):
    type: str
    message: str


# ── 类型安全的 pack 函数 ──

def _pack(event: ChatSSEEvent, payload: BaseModel) -> str:
    """内部：构建标准 SSE 帧"""
    return f"event: {event}\ndata: {payload.model_dump_json()}\n\n"


def pack_conversation_start(payload: ConversationStartPayload) -> str:
    return _pack(ChatSSEEvent.CONVERSATION_START, payload)

def pack_message_started(payload: MessageStartedPayload) -> str:
    return _pack(ChatSSEEvent.MESSAGE_STARTED, payload)

def pack_thinking_delta(payload: DeltaPayload) -> str:
    return _pack(ChatSSEEvent.THINKING_DELTA, payload)

def pack_text_delta(payload: DeltaPayload) -> str:
    return _pack(ChatSSEEvent.TEXT_DELTA, payload)

def pack_message_done(payload: MessageDonePayload) -> str:
    return _pack(ChatSSEEvent.MESSAGE_DONE, payload)

def pack_conversation_done(payload: ConversationDonePayload) -> str:
    return _pack(ChatSSEEvent.CONVERSATION_DONE, payload)

def pack_error(payload: ErrorPayload) -> str:
    return _pack(ChatSSEEvent.ERROR, payload)
