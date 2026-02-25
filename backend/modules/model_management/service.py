import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from models.model import Model
from models.model_provider_link import ModelProviderLink
from models.provider import Provider
from modules.model_management.schema import (
    ModelCreateRequest,
    ModelUpdateRequest,
    ModelResponse,
    ProviderLinkResponse,
)
from utils.pagination import paginate, PaginatedResponse


def _to_response(model: Model) -> ModelResponse:
    """将 ORM Model 转换为 ModelResponse，包含 provider links 信息"""
    providers = []
    for link in model.provider_links:
        providers.append(ProviderLinkResponse(
            provider_id=link.provider_id,
            provider_name=link.provider.name,
            is_enabled=link.is_enabled,
        ))
    return ModelResponse(
        id=model.id,
        name=model.name,
        display_name=model.display_name,
        manufacturer=model.manufacturer,
        is_enabled=model.is_enabled,
        providers=providers,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


async def list_models(
    session: AsyncSession, page: int = 1, page_size: int = 10,
) -> PaginatedResponse:
    """分页查询模型列表，eager load provider_links + provider"""
    query = (
        select(Model)
        .options(joinedload(Model.provider_links).joinedload(ModelProviderLink.provider))
        .order_by(Model.updated_at.desc())
    )
    result = await paginate(session, query, page, page_size, unique=True)
    # 手动转换 items 为 ModelResponse
    result.items = [_to_response(m) for m in result.items]
    return result


async def create_model(
    session: AsyncSession, data: ModelCreateRequest,
) -> ModelResponse:
    """创建模型 + 批量创建 link"""
    # 检查 name 唯一性
    stmt = select(Model).where(Model.name == data.name)
    existing = await session.execute(stmt)
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="模型名称已存在")

    # 验证 provider_ids 存在
    if data.provider_ids:
        await _validate_provider_ids(session, data.provider_ids)

    model = Model(
        name=data.name,
        display_name=data.display_name,
        manufacturer=data.manufacturer.value,
        is_enabled=data.is_enabled,
    )
    session.add(model)
    await session.flush()

    # 创建 links
    for pid in data.provider_ids:
        link = ModelProviderLink(model_id=model.id, provider_id=pid)
        session.add(link)

    await session.commit()
    return await _get_model_response(session, model.id)


async def update_model(
    session: AsyncSession, model_id: uuid.UUID, data: ModelUpdateRequest,
) -> ModelResponse:
    """部分更新模型"""
    model = await _get_model_or_404(session, model_id)

    # 如果要改名，检查唯一性
    if data.name is not None and data.name != model.name:
        stmt = select(Model).where(Model.name == data.name)
        dup = await session.execute(stmt)
        if dup.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="模型名称已存在")

    update_fields = data.model_dump(exclude_unset=True, exclude={"provider_ids"})
    for field, value in update_fields.items():
        if field == "manufacturer" and value is not None:
            value = value.value if hasattr(value, 'value') else value
        setattr(model, field, value)

    # 同步 provider links
    if data.provider_ids is not None:
        await _sync_provider_links(session, model.id, data.provider_ids)

    await session.commit()
    return await _get_model_response(session, model.id)


async def delete_model(session: AsyncSession, model_id: uuid.UUID) -> None:
    """删除模型（cascade 自动清理 link）"""
    model = await _get_model_or_404(session, model_id)
    await session.delete(model)
    await session.commit()


# ── 内部方法 ──

async def _get_model_or_404(session: AsyncSession, model_id: uuid.UUID) -> Model:
    """查询模型，不存在则 404"""
    result = await session.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=404, detail="模型不存在")
    return model


async def _get_model_response(session: AsyncSession, model_id: uuid.UUID) -> ModelResponse:
    """查询完整模型（含 provider links）并转换为响应"""
    result = await session.execute(
        select(Model)
        .options(joinedload(Model.provider_links).joinedload(ModelProviderLink.provider))
        .where(Model.id == model_id)
    )
    model = result.unique().scalar_one()
    return _to_response(model)


async def _validate_provider_ids(session: AsyncSession, provider_ids: list[uuid.UUID]) -> None:
    """验证所有 provider_ids 都存在"""
    result = await session.execute(
        select(Provider.id).where(Provider.id.in_(provider_ids))
    )
    found_ids = {row[0] for row in result.all()}
    missing = set(provider_ids) - found_ids
    if missing:
        raise HTTPException(status_code=404, detail=f"供应商不存在: {missing}")


async def _sync_provider_links(
    session: AsyncSession, model_id: uuid.UUID, provider_ids: list[uuid.UUID],
) -> None:
    """全量同步 provider links：删旧插新"""
    if provider_ids:
        await _validate_provider_ids(session, provider_ids)

    # 删除现有 links
    result = await session.execute(
        select(ModelProviderLink).where(ModelProviderLink.model_id == model_id)
    )
    for link in result.scalars().all():
        await session.delete(link)
    await session.flush()

    # 插入新 links
    for pid in provider_ids:
        link = ModelProviderLink(model_id=model_id, provider_id=pid)
        session.add(link)
