"""
Module-level Singleton: postgres_manager

与 redis_manager 相同的模块级单例模式。

使用方式：
    1. app.py 启动时调用 postgres_manager.setup(config) 注入配置
    2. LifeSpan 生命周期中调用 postgres_manager.start() / close() 管理连接池
    3. 业务代码通过 () 依赖注入获取数据库会话
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from loguru import logger
from config.environment import PostgresConfiguration
from config.lifecycle import Manageable


class PostgresManager(Manageable):
    """PostgreSQL 连接管理器，基于 SQLAlchemy 2.0 async + asyncpg"""

    def __init__(self):
        self._config: PostgresConfiguration | None = None
        self._engine = None
        self._session_factory: async_sessionmaker[AsyncSession] | None = None

    def setup(self, config: PostgresConfiguration) -> None:
        self._config = config

    @property
    def session_factory(self) -> async_sessionmaker[AsyncSession]:
        if self._session_factory is None:
            raise RuntimeError("PostgreSQL 还未连接，无法获取 session_factory")
        return self._session_factory

    async def start(self):
        if self._config is None:
            raise RuntimeError("PostgresManager 未配置，请先调用 setup()")

        config = self._config
        # asyncpg 驱动的连接字符串格式
        url = (
            f"postgresql+asyncpg://{config['user']}:{config['password']}"
            f"@{config['host']}:{config['port']}/{config['database']}"
        )

        self._engine = create_async_engine(
            url,
            echo=False,
        )

        self._session_factory = async_sessionmaker(
            bind=self._engine,
            expire_on_commit=False,
        )

        # 验证连接是否可用
        async with self._engine.connect() as conn:
            await conn.execute(text("SELECT 1"))

        logger.debug(
            "PostgreSQL 已连接 ({}:{}/{})",
            config["host"], config["port"], config["database"],
        )
        logger.info("PostgreSQL 连接初始化成功")

    async def close(self):
        if self._engine:
            await self._engine.dispose()
        self._engine = None
        self._session_factory = None
        logger.info("PostgreSQL 连接已关闭")


postgres_manager = PostgresManager()


async def get_postgres_session():
    """FastAPI 依赖注入：获取数据库会话

    使用方式：
        @router.get("/example")
        async def example(session: AsyncSession = Depends(get_session)):
            ...
    """
    async with postgres_manager.session_factory() as session:
        yield session
