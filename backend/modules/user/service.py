import bcrypt
import jwt
from fastapi import HTTPException
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    make_refresh_key,
)
from config.environment import JWTConfiguration
from models.user import User
from modules.user.schema import UserRegisterRequest


async def register_user(session: AsyncSession, data: UserRegisterRequest) -> User:
    """注册新用户：检查用户名唯一性 → 哈希密码 → 写入数据库"""

    # 检查用户名是否已存在
    stmt = select(User).where(User.username == data.username)
    result = await session.execute(stmt)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="用户名已存在")

    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt())
    user = User(
        username=data.username,
        password_hash=hashed.decode(),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def login_user(
    session: AsyncSession,
    redis: Redis,
    jwt_config: JWTConfiguration,
    username: str,
    password: str,
) -> dict[str, str]:
    """用户登录：验证凭据 → 签发双令牌 → 将 refresh token 存入 Redis"""

    # 查询用户
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    # 用户不存在或密码错误，返回相同的错误信息（防止用户名枚举）
    if user is None or not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 生成令牌
    access_token = create_access_token(jwt_config, user.id, user.role)
    refresh_token, jti = create_refresh_token(jwt_config, user.id)

    # 将 refresh token 的 jti 存入 Redis，TTL 与令牌过期时间一致
    redis_key = make_refresh_key(str(user.id), jti)
    ttl_seconds = jwt_config["refresh_token_expire_days"] * 86400
    await redis.set(redis_key, "1", ex=ttl_seconds)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


async def refresh_access_token(
    session: AsyncSession,
    redis: Redis,
    jwt_config: JWTConfiguration,
    refresh_token: str,
) -> dict[str, str]:
    """用 refresh token 换取新的 access token"""

    try:
        payload = decode_token(jwt_config, refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="刷新令牌已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的刷新令牌")

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="令牌类型错误")

    user_id = payload["sub"]
    jti = payload["jti"]

    # 检查 Redis 中是否存在（未被撤销）
    redis_key = make_refresh_key(user_id, jti)
    if not await redis.exists(redis_key):
        raise HTTPException(status_code=401, detail="刷新令牌已被撤销")

    # 查询用户最新角色，确保 access token 中的角色信息是最新的
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在")

    access_token = create_access_token(jwt_config, user.id, user.role)
    return {
        "access_token": access_token,
        "token_type": "bearer",
    }


async def logout_user(
    redis: Redis,
    jwt_config: JWTConfiguration,
    refresh_token: str,
) -> None:
    """登出：从 Redis 删除 refresh token（幂等操作）"""

    try:
        payload = decode_token(jwt_config, refresh_token)
    except jwt.InvalidTokenError:
        # 无效令牌直接忽略，保持幂等
        return

    if payload.get("type") != "refresh":
        return

    user_id = payload["sub"]
    jti = payload["jti"]

    redis_key = make_refresh_key(user_id, jti)
    await redis.delete(redis_key)
