from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from config.environment import Environment, JWTConfiguration
from config.postgres import get_postgres_session
from config.redis import redis_manager
from modules.user.schema import (
    UserRegisterRequest,
    UserRegisterResponse,
    UserLoginRequest,
    TokenResponse,
    RefreshRequest,
    AccessTokenResponse,
)
from modules.user.service import register_user, login_user, refresh_access_token, logout_user

router = APIRouter(prefix="/api/user", tags=["user"])


def get_redis() -> Redis:
    return redis_manager.client


def get_jwt_config() -> JWTConfiguration:
    return Environment().jwt_configuration


@router.post("/register", response_model=UserRegisterResponse, status_code=201)
async def register(
    data: UserRegisterRequest,
    session: AsyncSession = Depends(get_postgres_session),
):
    user = await register_user(session, data)

    logger.info("用户注册成功: username={}, id={}", user.username, user.id)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLoginRequest,
    session: AsyncSession = Depends(get_postgres_session),
    redis: Redis = Depends(get_redis),
    jwt_config: JWTConfiguration = Depends(get_jwt_config),
):
    result = await login_user(session, redis, jwt_config, data.username, data.password)
    logger.info("用户登录成功: username={}", data.username)
    return result


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(
    data: RefreshRequest,
    redis: Redis = Depends(get_redis),
    jwt_config: JWTConfiguration = Depends(get_jwt_config),
):
    result = await refresh_access_token(redis, jwt_config, data.refresh_token)
    return result


@router.post("/logout", status_code=204)
async def logout(
    data: RefreshRequest,
    redis: Redis = Depends(get_redis),
    jwt_config: JWTConfiguration = Depends(get_jwt_config),
):
    await logout_user(redis, jwt_config, data.refresh_token)
