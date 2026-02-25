import math
from typing import TypeVar, Generic

from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import Select


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """泛型分页响应"""
    items: list[T]
    total: int        # 总记录数
    page: int         # 当前页码（从1开始）
    page_size: int    # 每页条数
    total_pages: int  # 总页数


async def paginate(
    session: AsyncSession,
    query: Select,
    page: int = 1,
    page_size: int = 10,
    unique: bool = False,
) -> PaginatedResponse:
    """异步分页查询帮助函数

    接受任意 SQLAlchemy Select 语句（单表、JOIN、子查询等均可），
    自动统计总数并返回分页结果。

    Args:
        session: 数据库会话
        query: 已构建好的 SQLAlchemy Select 语句
        page: 页码（从1开始）
        page_size: 每页条数
        unique: 是否对结果去重（joinedload 场景需要）
    """
    # 将原始查询包装为子查询，用 COUNT(*) 统计总数（标准 SQL 聚合）
    count_query = select(func.count()).select_from(query.subquery())
    total = (await session.execute(count_query)).scalar_one()

    # 分页查询
    paginated_query = query.offset((page - 1) * page_size).limit(page_size)
    result = await session.execute(paginated_query)
    if unique:
        items = list(result.unique().scalars().all())
    else:
        items = list(result.scalars().all())

    total_pages = math.ceil(total / page_size) if page_size > 0 else 0

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
