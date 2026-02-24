"""聊天业务逻辑

会话查询/删除 + 流式聊天编排。
"""

import json
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone

from fastapi import HTTPException
from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from models.conversation import Conversation, Message, MessageRole, MessageStatus
from models.model import Model
from models.model_provider_link import ModelProviderLink
from models.provider import Provider
from modules.llm.adapter import ChunkType, LLMConfig, LLMMessage
from modules.llm.registry import get_adapter
from utils.pagination import PaginatedResponse, paginate


# ── 会话查询/删除 ──

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


async def delete_conversation(
    session: AsyncSession,
    conversation: Conversation,
) -> None:
    """删除会话（级联删除消息）"""
    await session.delete(conversation)
    await session.commit()


# ── 流式聊天 ──

async def stream_chat(
    session: AsyncSession,
    user_id: uuid.UUID,
    model: str,
    content: str,
    thinking_enabled: bool = False,
    conversation_id: uuid.UUID | None = None,
) -> AsyncIterator[str]:
    """流式聊天核心流程，yield SSE 格式事件

    conversation_id 为空时自动创建新会话。
    """
    assistant_msg = None
    full_content = ""
    full_thinking = ""

    try:
        # 1. 解析模型和供应商
        resolved_model, provider = await _resolve_model(session, model)

        # 2. 获取或创建会话
        if conversation_id is not None:
            conversation = await _get_user_conversation(session, conversation_id, user_id)
        else:
            conversation = Conversation(
                user_id=user_id,
                title=None,
                last_model=resolved_model.name,
            )
            session.add(conversation)
            await session.flush()
            # 通知前端新会话 ID
            yield _sse_event({
                "type": "conversation_created",
                "conversation_id": str(conversation.id),
            })

        # 3. 获取适配器
        adapter = get_adapter(resolved_model.manufacturer)

        # 4. 计算下一个 order
        next_order = await _get_next_order(session, conversation.id)

        # 5. 保存用户消息
        user_msg = Message(
            conversation_id=conversation.id,
            user_id=user_id,
            order=next_order,
            role=MessageRole.USER.value,
            content=content,
            status=MessageStatus.COMPLETED.value,
        )
        session.add(user_msg)
        await session.flush()

        # 6. 创建助手消息占位
        assistant_msg = Message(
            conversation_id=conversation.id,
            user_id=user_id,
            order=next_order + 1,
            role=MessageRole.ASSISTANT.value,
            content="",
            model=resolved_model.name,
            status=MessageStatus.GENERATING.value,
        )
        session.add(assistant_msg)
        await session.flush()

        # 7. 构建历史消息上下文
        history = await _build_message_context(session, conversation.id)

        # 8. 构建 LLM 配置
        base_url = (provider.base_url_map or {}).get(resolved_model.manufacturer)
        config = LLMConfig(
            api_key=provider.api_key,
            base_url=base_url,
            model=resolved_model.name,
            temperature=1.0,
            max_tokens=4096,
            thinking_enabled=thinking_enabled,
        )

        # 9. 流式调用 LLM
        async for chunk in adapter.stream(history, config):
            if chunk.type == ChunkType.THINKING:
                full_thinking += chunk.content
                yield _sse_event({"type": "thinking", "content": chunk.content})
            else:
                full_content += chunk.content
                yield _sse_event({"type": "chunk", "content": chunk.content})

        # 10. 完成：更新助手消息
        assistant_msg.content = full_content
        assistant_msg.thinking = full_thinking or None
        assistant_msg.status = MessageStatus.COMPLETED.value
        await session.flush()

        yield _sse_event({
            "type": "done",
            "message_id": str(assistant_msg.id),
            "full_content": full_content,
            "thinking": full_thinking or None,
        })

        # 11. 更新会话元数据
        conversation.last_model = resolved_model.name
        conversation.last_chat_time = datetime.now(timezone.utc)
        await session.flush()

        # 12. 首条消息时自动生成标题
        if conversation.title is None:
            try:
                title = await _generate_title(adapter, config, content, full_content)
                conversation.title = title
                await session.flush()
                yield _sse_event({"type": "title", "title": title})
            except Exception:
                logger.warning("自动生成会话标题失败，跳过")

        await session.commit()

    except Exception as e:
        logger.error("流式聊天异常: {}", str(e))
        # 标记助手消息为中止（保留部分内容）
        if assistant_msg is not None:
            assistant_msg.content = full_content
            assistant_msg.thinking = full_thinking or None
            assistant_msg.status = MessageStatus.ABORTED.value
            try:
                await session.commit()
            except Exception:
                logger.error("标记消息中止失败")
        yield _sse_event({"type": "error", "detail": str(e)})


# ── 内部方法 ──

async def _get_user_conversation(
    session: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Conversation:
    """查询会话并校验所有权"""
    result = await session.execute(
        select(Conversation).where(Conversation.id == conversation_id)
    )
    conversation = result.scalar_one_or_none()

    if conversation is None:
        raise HTTPException(status_code=404, detail="会话不存在")
    if conversation.user_id != user_id:
        raise HTTPException(status_code=403, detail="无权访问该会话")

    return conversation


async def _resolve_model(
    session: AsyncSession,
    model_name: str,
) -> tuple[Model, Provider]:
    """通过 ModelProviderLink 查找第一个启用的模型+供应商组合

    TODO: 同名模型存在多个供应商时，可扩展为负载均衡策略
    """
    result = await session.execute(
        select(ModelProviderLink)
        .options(
            joinedload(ModelProviderLink.model),
            joinedload(ModelProviderLink.provider),
        )
        .join(Model)
        .where(
            Model.name == model_name,
            Model.is_enabled.is_(True),
        )
        .join(Provider)
        .where(Provider.is_enabled.is_(True))
        .where(ModelProviderLink.is_enabled.is_(True))
    )
    links = result.unique().scalars().all()

    if not links:
        raise HTTPException(status_code=404, detail=f"无可用模型: {model_name}")

    return links[0].model, links[0].provider


async def _get_next_order(
    session: AsyncSession,
    conversation_id: uuid.UUID,
) -> int:
    """获取会话中下一个消息的 order 值"""
    result = await session.execute(
        select(func.max(Message.order))
        .where(Message.conversation_id == conversation_id)
    )
    max_order = result.scalar_one_or_none()
    return (max_order or 0) + 1


async def _build_message_context(
    session: AsyncSession,
    conversation_id: uuid.UUID,
) -> list[LLMMessage]:
    """加载会话中已完成的消息作为上下文"""
    result = await session.execute(
        select(Message)
        .where(
            Message.conversation_id == conversation_id,
            Message.status == MessageStatus.COMPLETED.value,
        )
        .order_by(Message.order.asc())
    )
    messages = result.scalars().all()
    return [LLMMessage(role=m.role, content=m.content) for m in messages]


async def _generate_title(
    adapter,
    config: LLMConfig,
    user_content: str,
    assistant_content: str,
) -> str:
    """使用 LLM 生成会话标题"""
    prompt = (
        "请根据以下对话内容，生成一个简短的会话标题（不超过20个字，不要加引号和标点）：\n\n"
        f"用户：{user_content[:500]}\n"
        f"助手：{assistant_content[:500]}"
    )
    title_messages = [LLMMessage(role="user", content=prompt)]
    # 标题生成不开 thinking，保持快速
    title_config = LLMConfig(
        api_key=config.api_key,
        base_url=config.base_url,
        model=config.model,
        temperature=config.temperature,
        max_tokens=config.max_tokens,
        thinking_enabled=False,
    )
    response = await adapter.chat(title_messages, title_config)
    # 清理标题：去除引号和多余空白
    title = response.content.strip().strip('"\'""''')
    return title[:200]


def _sse_event(data: dict) -> str:
    """构建 SSE 格式事件"""
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
