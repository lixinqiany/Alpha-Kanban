from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.postgres import get_postgres_session
from modules.user.schema import UserRegisterRequest, UserRegisterResponse
from modules.user.service import register_user

router = APIRouter(prefix="/api/user", tags=["user"])


@router.post("/register", response_model=UserRegisterResponse, status_code=201)
async def register(
    data: UserRegisterRequest,
    session: AsyncSession = Depends(get_postgres_session),
):
    user = await register_user(session, data)
    return user
