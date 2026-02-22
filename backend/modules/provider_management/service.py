import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.provider import Provider, Model
from modules.provider_management.schema import (
    ProviderCreateRequest,
    ProviderUpdateRequest,
    ModelCreateRequest,
    ModelUpdateRequest,
)
from utils.pagination import paginate, PaginatedResponse


# ── Provider CRUD ──

async def list_providers(session: AsyncSession, page: int = 1, page_size: int = 10) -> PaginatedResponse:
    """分页查询供应商列表"""
    query = select(Provider).order_by(Provider.updated_at.desc())
    return await paginate(session, query, page, page_size)


async def get_provider(session: AsyncSession, provider_id: uuid.UUID) -> Provider:
    """查询单个供应商，不存在则 404"""
    result = await session.execute(select(Provider).where(Provider.id == provider_id))
    provider = result.scalar_one_or_none()
    if provider is None:
        raise HTTPException(status_code=404, detail="供应商不存在")
    return provider


async def create_provider(session: AsyncSession, data: ProviderCreateRequest) -> Provider:
    """创建供应商：检查 name 唯一性"""
    stmt = select(Provider).where(Provider.name == data.name)
    result = await session.execute(stmt)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="供应商名称已存在")

    provider = Provider(
        name=data.name,
        api_key=data.api_key,
        base_url=str(data.base_url),
        is_enabled=data.is_enabled,
    )
    session.add(provider)
    await session.commit()
    await session.refresh(provider)
    return provider


async def update_provider(
    session: AsyncSession, provider_id: uuid.UUID, data: ProviderUpdateRequest,
) -> Provider:
    """部分更新供应商"""
    provider = await get_provider(session, provider_id)

    # 如果要改名，检查唯一性
    if data.name is not None and data.name != provider.name:
        stmt = select(Provider).where(Provider.name == data.name)
        result = await session.execute(stmt)
        if result.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="供应商名称已存在")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "base_url" and value is not None:
            value = str(value)
        setattr(provider, field, value)

    await session.commit()
    await session.refresh(provider)
    return provider


async def delete_provider(session: AsyncSession, provider_id: uuid.UUID) -> None:
    """删除供应商（级联删除关联模型）"""
    provider = await get_provider(session, provider_id)
    await session.delete(provider)
    await session.commit()


# ── Model CRUD ──

async def list_models(session: AsyncSession, provider_id: uuid.UUID, page: int = 1, page_size: int = 10) -> PaginatedResponse:
    """分页查询某供应商下的模型"""
    # 先确认供应商存在
    await get_provider(session, provider_id)
    query = select(Model).where(Model.provider_id == provider_id).order_by(Model.created_at.desc())
    return await paginate(session, query, page, page_size)


async def create_model(
    session: AsyncSession, provider_id: uuid.UUID, data: ModelCreateRequest,
) -> Model:
    """创建模型：检查供应商存在 + (provider_id, name) 唯一性"""
    await get_provider(session, provider_id)

    stmt = select(Model).where(Model.provider_id == provider_id, Model.name == data.name)
    result = await session.execute(stmt)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="该供应商下模型名称已存在")

    model = Model(
        provider_id=provider_id,
        name=data.name,
        display_name=data.display_name,
        is_enabled=data.is_enabled,
    )
    session.add(model)
    await session.commit()
    await session.refresh(model)
    return model


async def update_model(
    session: AsyncSession, model_id: uuid.UUID, data: ModelUpdateRequest,
) -> Model:
    """部分更新模型"""
    result = await session.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=404, detail="模型不存在")

    # 如果要改名，检查 (provider_id, name) 唯一性
    if data.name is not None and data.name != model.name:
        stmt = select(Model).where(Model.provider_id == model.provider_id, Model.name == data.name)
        dup = await session.execute(stmt)
        if dup.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="该供应商下模型名称已存在")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(model, field, value)

    await session.commit()
    await session.refresh(model)
    return model


async def delete_model(session: AsyncSession, model_id: uuid.UUID) -> None:
    """删除模型"""
    result = await session.execute(select(Model).where(Model.id == model_id))
    model = result.scalar_one_or_none()
    if model is None:
        raise HTTPException(status_code=404, detail="模型不存在")
    await session.delete(model)
    await session.commit()
