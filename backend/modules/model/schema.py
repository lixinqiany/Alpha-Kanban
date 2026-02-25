"""模型通用模块响应类型"""

from pydantic import BaseModel, RootModel


class AvailableModel(BaseModel):
    name: str
    display_name: str


# 按厂商分组：{ "OpenAI": [model, ...], "Anthropic": [...] }
class AvailableModelsByManufacturer(RootModel[dict[str, list[AvailableModel]]]):
    pass
