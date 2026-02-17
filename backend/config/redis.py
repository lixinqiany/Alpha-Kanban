"""
Module-level Singleton: redis_manager

本模块在底部创建了唯一的 RedisManager 实例 ``redis_manager``。
Python 模块只会被导入一次，因此无论多少处 ``from config.redis import redis_manager``，
拿到的始终是同一个对象，即"模块级单例"。

使用方式：
    1. app.py 启动时调用 redis_manager.setup(config) 注入配置
    2. LifeSpan 生命周期中调用 redis_manager.start() / close() 管理连接
    3. 业务代码通过 get_redis() 依赖注入获取客户端
"""

from redis.asyncio import Redis
from redis.asyncio.sentinel import Sentinel
from loguru import logger
from config.environment import RedisConfiguration
from config.lifecycle import Manageable


class RedisManager(Manageable):
    """Redis 连接管理器，支持 standalone 和 sentinel 两种模式"""

    def __init__(self):
        self._config: RedisConfiguration | None = None
        self._mode: str | None = None
        self._sentinel: Sentinel | None = None
        self._master: Redis | None = None
        self._slave: Redis | None = None

    def setup(self, config: RedisConfiguration) -> None:
        self._config = config
        self._mode = config["mode"]

    @property
    def client(self) -> Redis:
        if self._master is None:
            raise RuntimeError("Redis还未连接，无法获得客户端实例")
        return self._master

    @property
    def slave(self) -> Redis:
        if self._mode != "SENTINEL":
            raise RuntimeError("当前Redis连接不属于哨兵模式，调用slave不合法！")
        if self._slave is None:
            raise RuntimeError("Slave 连接不可用")
        return self._slave

    async def start(self):
        if self._config is None:
            raise RuntimeError("RedisManager 未配置，请先调用 setup()")

        config = self._config

        if self._mode == "SENTINEL":
            self._sentinel = Sentinel(
                config["sentinel_hosts"],
                sentinel_kwargs={
                    "username": config.get("sentinel_username"),
                    "password": config.get("sentinel_password"),
                },
            )
            sentinel_name = config.get("sentinel_name")
            connection_kwargs = dict(
                username=config["username"],
                password=config["password"],
                db=config["db"],
                decode_responses=True,
            )
            self._master = self._sentinel.master_for(sentinel_name, **connection_kwargs)
            self._slave = self._sentinel.slave_for(sentinel_name, **connection_kwargs)
        else:
            self._master = Redis(
                host=config["host"],
                port=config["port"],
                username=config["username"],
                password=config["password"],
                db=config["db"],
                decode_responses=True,
            )

        await self._master.ping()
        if self._mode == "SENTINEL":
            await self._slave.ping()
            logger.debug("Redis 已连接 (sentinel 模式, master集群={})", config.get("sentinel_name"))
        else:
            logger.debug("Redis 已连接 (standalone 模式, {}:{})", config["host"], config["port"])

        logger.info("Redis 连接初始化成功")

    async def close(self):
        for conn in (self._slave, self._master):
            if conn:
                await conn.close()
        self._master = None
        self._slave = None
        self._sentinel = None
        self._mode = None
        logger.info("Redis 连接已关闭")


redis_manager = RedisManager()
