import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from config.postgres import get_postgres_session
from models.user import UserRole
from modules.user.dependencies import require_roles
from modules.provider_management.schema import (
    ProviderCreateRequest,
    ProviderUpdateRequest,
    ProviderResponse,
)
from utils.pagination import PaginatedResponse
from modules.provider_management.service import (
    list_providers,
    list_all_providers,
    get_provider,
    create_provider,
    update_provider,
    delete_provider,
)

router = APIRouter(
    prefix="/api/provider-management",
    tags=["provider-management"],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)


# ── Provider 路由 ──

@router.get("/providers", response_model=PaginatedResponse[ProviderResponse])
async def api_list_providers(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_postgres_session),
):
    return await list_providers(session, page, page_size)


@router.get("/providers/all", response_model=list[ProviderResponse])
async def api_list_all_providers(
    session: AsyncSession = Depends(get_postgres_session),
):
    return await list_all_providers(session)


@router.get("/providers/{provider_id}", response_model=ProviderResponse)
async def api_get_provider(
    provider_id: uuid.UUID,
    session: AsyncSession = Depends(get_postgres_session),
):
    return await get_provider(session, provider_id)


@router.post("/providers", response_model=ProviderResponse, status_code=201)
async def api_create_provider(
    data: ProviderCreateRequest,
    session: AsyncSession = Depends(get_postgres_session),
):
    provider = await create_provider(session, data)
    logger.info("供应商创建成功: name={}, id={}", provider.name, provider.id)
    return provider


@router.put("/providers/{provider_id}", response_model=ProviderResponse)
async def api_update_provider(
    provider_id: uuid.UUID,
    data: ProviderUpdateRequest,
    session: AsyncSession = Depends(get_postgres_session),
):
    provider = await update_provider(session, provider_id, data)
    logger.info("供应商更新成功: id={}", provider.id)
    return provider


@router.delete("/providers/{provider_id}", status_code=204)
async def api_delete_provider(
    provider_id: uuid.UUID,
    session: AsyncSession = Depends(get_postgres_session),
):
    await delete_provider(session, provider_id)
    logger.info("供应商删除成功: id={}", provider_id)
