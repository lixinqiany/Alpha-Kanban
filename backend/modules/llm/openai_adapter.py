"""OpenAI 适配器

使用 Responses API，支持 reasoning（思考过程）。
"""

from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from modules.llm.adapter import (
    ChunkType,
    LLMAdapter,
    LLMConfig,
    LLMMessage,
    LLMResponse,
    StreamChunk,
)


class OpenAIAdapter(LLMAdapter):
    """OpenAI LLM 适配器"""

    async def chat(
        self, messages: list[LLMMessage], config: LLMConfig,
    ) -> LLMResponse:
        client = AsyncOpenAI(api_key=config.api_key, base_url=config.base_url)

        kwargs: dict = {
            "model": config.model,
            "input": [{"role": m.role, "content": m.content} for m in messages],
            "max_output_tokens": config.max_tokens,
        }

        if config.thinking_enabled:
            kwargs["reasoning"] = {"effort": "medium"}
            kwargs["temperature"] = 1.0
        else:
            kwargs["temperature"] = config.temperature

        response = await client.responses.create(**kwargs)

        content = ""
        thinking = ""
        for item in response.output:
            if item.type == "reasoning":
                for summary in getattr(item, "summary", []) or []:
                    thinking += getattr(summary, "text", "")
            elif item.type == "message":
                for part in item.content:
                    if part.type == "output_text":
                        content += part.text

        usage = None
        if response.usage:
            usage = {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.total_tokens,
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
        client = AsyncOpenAI(api_key=config.api_key, base_url=config.base_url)

        kwargs: dict = {
            "model": config.model,
            "input": [{"role": m.role, "content": m.content} for m in messages],
            "max_output_tokens": config.max_tokens,
            "stream": True,
        }

        if config.thinking_enabled:
            kwargs["reasoning"] = {"effort": "medium"}
            kwargs["temperature"] = 1.0
        else:
            kwargs["temperature"] = config.temperature

        stream = await client.responses.create(**kwargs)
        async for event in stream:
            if event.type == "response.output_text.delta":
                yield StreamChunk(ChunkType.TEXT, event.delta)
            elif event.type == "response.reasoning_summary_text.delta":
                yield StreamChunk(ChunkType.THINKING, event.delta)
