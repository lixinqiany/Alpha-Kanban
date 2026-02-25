"""LLM 适配器注册表

根据 Manufacturer 返回对应的适配器实例。
"""

from enums import Manufacturer
from modules.llm.adapter import LLMAdapter
from modules.llm.anthropic_adapter import AnthropicAdapter
from modules.llm.openai_adapter import OpenAIAdapter

_ADAPTER_MAP: dict[Manufacturer, LLMAdapter] = {}


def register_adapter(manufacturer: Manufacturer, adapter: LLMAdapter) -> None:
    """注册适配器"""
    _ADAPTER_MAP[manufacturer] = adapter


def get_adapter(manufacturer: str) -> LLMAdapter:
    """根据原厂商返回适配器实例

    Raises:
        ValueError: 未注册的原厂商
    """
    adapter = _ADAPTER_MAP.get(Manufacturer(manufacturer))
    if adapter is None:
        raise ValueError(f"未注册的原厂商: {manufacturer}")
    return adapter


# 注册内置适配器
register_adapter(Manufacturer.OPENAI, OpenAIAdapter())
register_adapter(Manufacturer.ANTHROPIC, AnthropicAdapter())
