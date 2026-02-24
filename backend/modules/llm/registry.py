"""LLM 适配器注册表

根据 AdapterType 返回对应的适配器实例。
支持动态注册新的适配器类型。
"""

from modules.llm.adapter import AdapterType, LLMAdapter
from modules.llm.anthropic_adapter import AnthropicAdapter
from modules.llm.openai_adapter import OpenAIAdapter

_ADAPTER_MAP: dict[AdapterType, LLMAdapter] = {}


def register_adapter(adapter_type: AdapterType, adapter: LLMAdapter) -> None:
    """注册适配器"""
    _ADAPTER_MAP[adapter_type] = adapter


def get_adapter(adapter_type: AdapterType) -> LLMAdapter:
    """根据 AdapterType 返回适配器实例

    Raises:
        ValueError: 未注册的适配器类型
    """
    adapter = _ADAPTER_MAP.get(adapter_type)
    if adapter is None:
        raise ValueError(f"未注册的适配器类型: {adapter_type}")
    return adapter


# 注册内置适配器
register_adapter(AdapterType.OPENAI, OpenAIAdapter())
register_adapter(AdapterType.ANTHROPIC, AnthropicAdapter())
