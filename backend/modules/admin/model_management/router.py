import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from config.postgres import get_postgres_session
from models.user import UserRole
from modules.user.dependencies import require_roles
from modules.admin.model_management.schema import (
    ModelCreateRequest,
    ModelUpdateRequest,
    ModelResponse,
)
from utils.pagination import PaginatedResponse
from modules.admin.model_management.service import (
    list_models,
    create_model,
    update_model,
    delete_model,
)

router = APIRouter(
    prefix="/api/model-management",
    tags=["model-management"],
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)


@router.get("/models", response_model=PaginatedResponse[ModelResponse])
async def api_list_models(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    session: AsyncSession = Depends(get_postgres_session),
):
    return await list_models(session, page, page_size)


@router.post("/models", response_model=ModelResponse, status_code=201)
async def api_create_model(
    data: ModelCreateRequest,
    session: AsyncSession = Depends(get_postgres_session),
):
    model = await create_model(session, data)
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
