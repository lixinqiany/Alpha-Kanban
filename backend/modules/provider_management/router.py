import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from config.postgres import get_postgres_session
from models.user import User
from modules.user.dependencies import get_current_user
from modules.provider_management.schema import (
    ProviderCreateRequest,
    ProviderUpdateRequest,
    ProviderResponse,
    ModelCreateRequest,
    ModelUpdateRequest,
    ModelResponse,
)
from modules.provider_management.service import (
    list_providers,
    get_provider,
    create_provider,
    update_provider,
    delete_provider,
    list_models,
    create_model,
    update_model,
    delete_model,
)

router = APIRouter(
    prefix="/api/provider-management",
    tags=["provider-management"],
    dependencies=[Depends(get_current_user)],
)


# ── Provider 路由 ──

@router.get("/providers", response_model=list[ProviderResponse])
async def api_list_providers(
    session: AsyncSession = Depends(get_postgres_session),
):
    return await list_providers(session)


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


# ── Model 路由 ──

@router.get("/providers/{provider_id}/models", response_model=list[ModelResponse])
async def api_list_models(
    provider_id: uuid.UUID,
    session: AsyncSession = Depends(get_postgres_session),
):
    return await list_models(session, provider_id)


@router.post("/providers/{provider_id}/models", response_model=ModelResponse, status_code=201)
async def api_create_model(
    provider_id: uuid.UUID,
    data: ModelCreateRequest,
    session: AsyncSession = Depends(get_postgres_session),
):
    model = await create_model(session, provider_id, data)
    logger.info("模型创建成功: name={}, id={}", model.name, model.id)
    return model


@router.put("/models/{model_id}", response_model=ModelResponse)
async def api_update_model(
    model_id: uuid.UUID,
    data: ModelUpdateRequest,
    session: AsyncSession = Depends(get_postgres_session),
):
    model = await update_model(session, model_id, data)
    logger.info("模型更新成功: id={}", model.id)
    return model


@router.delete("/models/{model_id}", status_code=204)
async def api_delete_model(
    model_id: uuid.UUID,
    session: AsyncSession = Depends(get_postgres_session),
):
    await delete_model(session, model_id)
    logger.info("模型删除成功: id={}", model_id)
