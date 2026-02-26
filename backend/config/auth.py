import uuid
from datetime import datetime, timedelta, timezone

import jwt

from config.environment import JWTConfiguration


def create_access_token(config: JWTConfiguration, user_id: uuid.UUID, role: str, username: str) -> str:
    """生成访问令牌（短期有效）"""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "role": role,
        "username": username,
        "exp": now + timedelta(minutes=config["access_token_expire_minutes"]),
        "iat": now,
        "type": "access",
    }
    return jwt.encode(payload, config["secret"], algorithm="HS256")


def create_refresh_token(config: JWTConfiguration, user_id: uuid.UUID) -> tuple[str, str]:
    """生成刷新令牌（长期有效），返回 (token, jti)"""
    now = datetime.now(timezone.utc)
    jti = uuid.uuid4().hex
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(days=config["refresh_token_expire_days"]),
        "iat": now,
        "type": "refresh",
        "jti": jti,
    }
    token = jwt.encode(payload, config["secret"], algorithm="HS256")
    return token, jti


def decode_token(config: JWTConfiguration, token: str) -> dict:
    """解码并验证令牌（PyJWT 自动检查过期）"""
    return jwt.decode(token, config["secret"], algorithms=["HS256"])


def make_refresh_key(user_id: str, jti: str) -> str:
    """生成 Redis 中存储 refresh token 的键名"""
    return f"refresh_token:{user_id}:{jti}"
