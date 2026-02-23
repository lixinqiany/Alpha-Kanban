"""路由守卫：提取并验证 access token，返回当前用户"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.auth import decode_token
from config.environment import Environment, JWTConfiguration
from config.postgres import get_postgres_session
from models.user import User, UserRole

bearer_scheme = HTTPBearer()


def get_jwt_config() -> JWTConfiguration:
    return Environment().jwt_configuration


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    session: AsyncSession = Depends(get_postgres_session),
    jwt_config: JWTConfiguration = Depends(get_jwt_config),
) -> User:
    """FastAPI 依赖：从 Authorization: Bearer <token> 中提取并验证用户

    使用方式：
        @router.get("/me")
        async def me(current_user: User = Depends(get_current_user)):
            ...
    """
    token = credentials.credentials

    try:
        payload = decode_token(jwt_config, token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="访问令牌已过期")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="无效的访问令牌")

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="令牌类型错误")

    user_id = payload["sub"]

    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=401, detail="用户不存在")

    return user


def require_roles(*roles: UserRole):
    """角色守卫工厂函数，返回一个 FastAPI 依赖。
    直接从 JWT payload 中读取 role，不查数据库。

    用法：
      - 单个路由: @router.get("/admin", dependencies=[Depends(require_roles(UserRole.ADMIN))])
      - 整个Router: APIRouter(dependencies=[Depends(require_roles(UserRole.ADMIN))])
      - 多角色(OR): Depends(require_roles(UserRole.ADMIN, UserRole.USER))
    """
    allowed = [r.value for r in roles]

    async def role_checker(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
        jwt_config: JWTConfiguration = Depends(get_jwt_config),
    ) -> dict:
        token = credentials.credentials

        try:
            payload = decode_token(jwt_config, token)
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="访问令牌已过期")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="无效的访问令牌")

        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="令牌类型错误")

        if payload.get("role") not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足，无法访问该资源",
            )
        return payload

    return role_checker
