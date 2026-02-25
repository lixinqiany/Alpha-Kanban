"""模型通用模块路由 — 面向普通用户的模型查询"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.postgres import get_postgres_session
from modules.user.dependencies import get_current_user
from modules.model.schema import AvailableModelsResponse
from modules.model.service import get_available_models

router = APIRouter(
    prefix="/api/model",
    tags=["model"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/available", response_model=AvailableModelsResponse)
async def api_get_available_models(
    session: AsyncSession = Depends(get_postgres_session),
):
    return await get_available_models(session)
