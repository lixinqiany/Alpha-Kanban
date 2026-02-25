"""General Chat 业务逻辑 — 会话/消息查询与删除"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.conversation import Conversation, Message
from utils.pagination import PaginatedResponse, paginate


async def list_conversations(
    session: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 10,
) -> PaginatedResponse:
    """按 last_chat_time 降序分页查询用户的会话列表"""
    query = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.last_chat_time.desc())
    )
    return await paginate(session, query, page, page_size)


async def get_conversation_messages(
    session: AsyncSession,
    conversation_id: uuid.UUID,
) -> list[Message]:
    """获取某会话的全部消息（按 order 升序）"""
    result = await session.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.order.asc())
    )
    return list(result.scalars().all())


async def delete_conversation(
    session: AsyncSession,
    conversation: Conversation,
) -> None:
    """删除会话（级联删除消息）"""
    await session.delete(conversation)
    await session.commit()
