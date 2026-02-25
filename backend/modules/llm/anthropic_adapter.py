"""Anthropic 适配器

处理 Anthropic API 与 OpenAI 的差异：
- system 消息需从 messages 列表中分离，作为独立 system 参数传入
- 支持 extended thinking（thinking 启用时不能设置 temperature）
- 流式响应使用原始事件迭代，区分 thinking 和 text
"""

from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from modules.llm.adapter import (
    ChunkType,
    LLMAdapter,
    LLMConfig,
    LLMMessage,
    LLMResponse,
    StreamChunk,
)


class AnthropicAdapter(LLMAdapter):
    """Anthropic LLM 适配器"""

    @staticmethod
    def _split_messages(
        messages: list[LLMMessage],
    ) -> tuple[str | None, list[dict]]:
        """将 system 消息从列表中分离

        Returns:
            (system_prompt, non_system_messages)
        """
        system_parts: list[str] = []
        chat_messages: list[dict] = []
        for m in messages:
            if m.role == "system":
                system_parts.append(m.content)
            else:
                chat_messages.append({"role": m.role, "content": m.content})
        system_prompt = "\n\n".join(system_parts) if system_parts else None
        return system_prompt, chat_messages

    def _build_kwargs(
        self, messages: list[LLMMessage], config: LLMConfig,
    ) -> dict:
        """构建 Anthropic API 调用参数"""
        system_prompt, chat_messages = self._split_messages(messages)

        kwargs: dict = {
            "model": config.model,
            "messages": chat_messages,
            "max_tokens": config.max_tokens,
        }

        if config.thinking_enabled:
            # Anthropic 约束：thinking 启用时不能设置 temperature
            kwargs["thinking"] = {
                "type": "enabled",
                "budget_tokens": config.thinking_budget_tokens,
            }
        else:
            kwargs["temperature"] = config.temperature

        if system_prompt:
            kwargs["system"] = system_prompt

        return kwargs

    async def chat(
        self, messages: list[LLMMessage], config: LLMConfig,
    ) -> LLMResponse:
        client = AsyncAnthropic(api_key=config.api_key, base_url=config.base_url)
        kwargs = self._build_kwargs(messages, config)

        response = await client.messages.create(**kwargs)

        content = ""
        thinking = ""
        for block in response.content:
            if block.type == "thinking":
                thinking += block.thinking
            elif block.type == "text":
                content += block.text

        usage = None
        if response.usage:
            usage = {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
            }
        return LLMResponse(
            content=content,
            model=response.model,
            usage=usage,
            thinking=thinking or None,
        )

    async def stream(
        self, messages: list[LLMMessage], config: LLMConfig,
    ) -> AsyncIterator[StreamChunk]:
        client = AsyncAnthropic(api_key=config.api_key, base_url=config.base_url)
        kwargs = self._build_kwargs(messages, config)

        async with client.messages.stream(**kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    if event.delta.type == "thinking_delta":
                        yield StreamChunk(ChunkType.THINKING, event.delta.thinking)
                    elif event.delta.type == "text_delta":
                        yield StreamChunk(ChunkType.TEXT, event.delta.text)
