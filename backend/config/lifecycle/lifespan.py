from contextlib import asynccontextmanager
from fastapi import FastAPI
from loguru import logger
from config.lifecycle.base import Manageable

class LifeSpan:
    def __init__(self) -> None:
        self._services: list[Manageable] = []

    def register(self, service: Manageable) -> None:
        if not isinstance(service, Manageable):
            # type(service).__name__ 返回类名的字符串
            raise TypeError(f"{type(service).__name__} 必须继承 Manageable 才可以作为本应用生命周期管理项的一部分")
        self._services.append(service)

    @asynccontextmanager
    async def __call__(self, app: FastAPI):
        for service in self._services:
            await service.start()
            logger.info(f"{type(service).__name__}  已启动")
        yield
        for service in reversed(self._services):
            await service.close()
            logger.info(f"{type(service).__name__} 已关闭")
