"""原厂商枚举

标识模型所属的原厂商，用于选择对应的 LLM 适配器。
"""

from enum import Enum


class Manufacturer(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
