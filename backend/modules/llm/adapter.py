"""LLM 适配器协议与数据类型定义

所有 LLM 适配器实现此协议，业务层通过 LLMConfig 传入凭证和参数，
适配器不依赖数据库。
"""

from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass
from enum import Enum
from typing import Literal

LLMRole = Literal["system", "user", "assistant"]


class AdapterType(str, Enum):
    """LLM 原厂适配器类型"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"


class ChunkType(str, Enum):
    """流式块类型"""
    THINKING = "thinking"
    TEXT = "text"


@dataclass
class StreamChunk:
    """流式块，区分 thinking 和 text"""
    type: ChunkType
    content: str


@dataclass
class LLMMessage:
    """LLM 消息"""
    role: LLMRole
    content: str


@dataclass
class LLMConfig:
    """LLM 调用配置，由调用方构建传入"""
    api_key: str
    base_url: str | None = None
    model: str = ""
    temperature: float = 1.0
    max_tokens: int = 4096
    thinking_enabled: bool = False
    thinking_budget_tokens: int = 10000


@dataclass
class LLMResponse:
    """LLM 非流式响应"""
    content: str
    model: str
    usage: dict | None = None
    thinking: str | None = None


class LLMAdapter(ABC):
    """LLM 适配器抽象基类"""

    @abstractmethod
    async def chat(
        self, messages: list[LLMMessage], config: LLMConfig,
    ) -> LLMResponse:
        """非流式对话"""

    @abstractmethod
    async def stream(
        self, messages: list[LLMMessage], config: LLMConfig,
    ) -> AsyncIterator[StreamChunk]:
        """流式对话，逐块 yield StreamChunk"""
