"""聊天模块依赖：会话所有权校验"""

import uuid

from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.postgres import get_postgres_session
from models.conversation import Conversation
from models.user import User
from modules.user.dependencies import get_current_user


async def get_user_conversation(
    conversation_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_postgres_session),
) -> Conversation:
    """校验会话存在且属于当前用户"""
    result = await session.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(status_code=404, detail="会话不存在")

    if conversation.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问该会话")

    return conversation
