"""模型通用模块响应类型"""

from pydantic import BaseModel


class AvailableModel(BaseModel):
    name: str
    display_name: str


class ModelGroup(BaseModel):
    manufacturer: str
    manufacturer_label: str
    models: list[AvailableModel]


class AvailableModelsResponse(BaseModel):
    groups: list[ModelGroup]
