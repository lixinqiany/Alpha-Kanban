from abc import ABC, abstractmethod


class Manageable(ABC):
    """所有需要生命周期管理的服务必须继承此类，并实现 start 和 close 方法。"""

    @abstractmethod
    async def start(self) -> None: ...

    @abstractmethod
    async def close(self) -> None: ...
