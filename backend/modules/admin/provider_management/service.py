import uuid

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.provider import Provider
from modules.admin.provider_management.schema import (
    ProviderCreateRequest,
    ProviderUpdateRequest,
)
from utils.pagination import paginate, PaginatedResponse


# ── Provider CRUD ──

async def list_providers(session: AsyncSession, page: int = 1, page_size: int = 10) -> PaginatedResponse:
    """分页查询供应商列表"""
    query = select(Provider).order_by(Provider.updated_at.desc())
    return await paginate(session, query, page, page_size)


async def list_all_providers(session: AsyncSession) -> list[Provider]:
    """查询所有供应商（不分页，用于下拉选择）"""
    result = await session.execute(
        select(Provider).order_by(Provider.name.asc())
    )
    return list(result.scalars().all())


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
        base_url_map={k.value: v for k, v in data.base_url_map.items()},
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
        if field == "base_url_map" and value is not None:
            value = {k: v for k, v in value.items()}
        setattr(provider, field, value)

    await session.commit()
    await session.refresh(provider)
    return provider


async def delete_provider(session: AsyncSession, provider_id: uuid.UUID) -> None:
    """删除供应商"""
    provider = await get_provider(session, provider_id)
    await session.delete(provider)
    await session.commit()
