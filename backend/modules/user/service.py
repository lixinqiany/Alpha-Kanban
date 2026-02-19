import bcrypt
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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
