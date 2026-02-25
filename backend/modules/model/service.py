"""模型通用模块业务逻辑 — 查询可用模型"""

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.model import Model
from models.model_provider_link import ModelProviderLink
from models.provider import Provider
from modules.model.schema import AvailableModel, AvailableModelsByManufacturer

async def get_available_models_by_manufacturer(
    session: AsyncSession,
) -> AvailableModelsByManufacturer:
    """查询所有启用的模型，按厂商分组返回 { "openai": [model, ...] }"""
    result = await session.execute(
        select(Model.name, Model.display_name, Model.manufacturer)
        .distinct()
        .join(ModelProviderLink, ModelProviderLink.model_id == Model.id)
        .join(Provider, Provider.id == ModelProviderLink.provider_id)
        .where(
            Model.is_enabled.is_(True),
            ModelProviderLink.is_enabled.is_(True),
            Provider.is_enabled.is_(True),
        )
        .order_by(Model.manufacturer, Model.display_name)
    )
    rows = result.all()

    grouped: dict[str, list[AvailableModel]] = defaultdict(list)
    for name, display_name, manufacturer in rows:
        grouped[manufacturer].append(
            AvailableModel(name=name, display_name=display_name)
        )

    return AvailableModelsByManufacturer(dict(grouped))
