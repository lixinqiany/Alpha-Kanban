"""聊天模块路由"""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config.postgres import get_postgres_session
from models.conversation import Conversation
from models.user import User
from modules.user.dependencies import get_current_user
from modules.chat.dependencies import get_user_conversation
from modules.chat.schema import (
    ConversationResponse,
    NewChatRequest,
    ContinueChatRequest,
)
from modules.chat.service import (
    list_conversations,
    delete_conversation,
    stream_chat,
)
from utils.pagination import PaginatedResponse

router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
    dependencies=[Depends(get_current_user)],
)


# ── 会话管理 ──

@router.get("/conversations", response_model=PaginatedResponse[ConversationResponse])
async def api_list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_postgres_session),
):
    return await list_conversations(session, current_user.id, page, page_size)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def api_delete_conversation(
    conversation: Conversation = Depends(get_user_conversation),
    session: AsyncSession = Depends(get_postgres_session),
):
    await delete_conversation(session, conversation)


# ── 聊天 ──

@router.post("/conversations")
async def api_new_chat(
    data: NewChatRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_postgres_session),
):
    """创建新会话并发送首条消息"""
    return StreamingResponse(
        stream_chat(
            session=session,
            user_id=current_user.id,
            model=data.model,
            content=data.content,
            thinking_enabled=data.thinking_enabled,
            conversation_id=None,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/conversations/{conversation_id}/messages")
async def api_continue_chat(
    data: ContinueChatRequest,
    conversation: Conversation = Depends(get_user_conversation),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_postgres_session),
):
    """在已有会话中续聊"""
    return StreamingResponse(
        stream_chat(
            session=session,
            user_id=current_user.id,
            model=data.model,
            content=data.content,
            thinking_enabled=data.thinking_enabled,
            conversation_id=conversation.id,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
