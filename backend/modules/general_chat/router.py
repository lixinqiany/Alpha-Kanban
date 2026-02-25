"""General Chat 模块路由 — 会话管理"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.postgres import get_postgres_session
from models.conversation import Conversation
from models.user import User
from modules.user.dependencies import get_current_user
from modules.chat.dependencies import get_user_conversation
from modules.general_chat.schema import ConversationResponse, MessageResponse
from modules.general_chat.service import (
    list_conversations,
    get_conversation_messages,
    delete_conversation,
)
from utils.pagination import PaginatedResponse

router = APIRouter(
    prefix="/api/general-chat",
    tags=["general-chat"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/conversations", response_model=PaginatedResponse[ConversationResponse])
async def api_list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_postgres_session),
):
    return await list_conversations(session, current_user.id, page, page_size)


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def api_get_conversation_messages(
    conversation: Conversation = Depends(get_user_conversation),
    session: AsyncSession = Depends(get_postgres_session),
):
    return await get_conversation_messages(session, conversation.id)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def api_delete_conversation(
    conversation: Conversation = Depends(get_user_conversation),
    session: AsyncSession = Depends(get_postgres_session),
):
    await delete_conversation(session, conversation)
