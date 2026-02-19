from dotenv import load_dotenv, find_dotenv
import os
from typing import TypedDict, Literal, NotRequired


LogLevel = Literal["TRACE", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]

class PostgresConfiguration(TypedDict):
    host: str
    port: int
    user: str
    password: str
    database: str


class RedisConfiguration(TypedDict):
    mode: Literal["STANDALONE", "SENTINEL"]

    host: str
    port: int

    username: str | None
    password: str | None
    db: int

    sentinel_hosts: NotRequired[list[tuple[str, int]]]
    sentinel_name: NotRequired[str]
    sentinel_username: NotRequired[str | None]
    sentinel_password: NotRequired[str | None]


class JWTConfiguration(TypedDict):
    secret: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int


class Environment:
    def __init__(self):
        self.env_path = find_dotenv()
        # 未在同级目录或者向上递归找到 .env 文件，会返回 empty string
        if not self.env_path:
            raise FileNotFoundError("环境变量文件未找到")

        load_dotenv(self.env_path)
        self.isLoaded = True

    @property
    def port(self) -> int:
        return int(os.getenv("PORT", "8000"))

    def _parse_sentinel_hosts(self, hosts_str: str) -> list[tuple[str, int]]:
        sentinels: list[tuple[str, int]] = []
        for item in hosts_str.split(","):
            item = item.strip()
            if not item:
                continue
            host, port = item.rsplit(":", 1)
            sentinels.append((host, int(port)))
        return sentinels

    @property
    def log_level(self) -> LogLevel:
        if not self.isLoaded:
            raise RuntimeError("环境变量未加载")

        level = os.getenv("LOG_LEVEL")
        if not level:
            level = "INFO" if os.getenv("START_MODE") == "production" else "DEBUG"
        level = level.upper()

        valid_levels = ("TRACE", "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL")
        if level not in valid_levels:
            raise ValueError(f"不支持的 LOG_LEVEL: {level}")

        return level

    @property
    def postgres_configuration(self) -> PostgresConfiguration:
        if not self.isLoaded:
            raise RuntimeError("环境变量未加载")

        return PostgresConfiguration(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            user=os.getenv("POSTGRES_USER", "alpha_kanban"),
            password=os.getenv("POSTGRES_PASSWORD", "alpha_kanban_dev"),
            database=os.getenv("POSTGRES_DB", "alpha_kanban"),
        )

    @property
    def redis_configuration(self) -> RedisConfiguration:
        if not self.isLoaded:
            raise RuntimeError("环境变量未加载")

        mode = os.getenv("REDIS_MODE", "STANDALONE").upper()
        if mode not in ("STANDALONE", "SENTINEL"):
            raise ValueError(f"不支持连接的 REDIS_MODE: {mode}")

        config = RedisConfiguration(
            mode=mode,
            host=os.getenv("REDIS_HOST", "localhost"),
            port=int(os.getenv("REDIS_PORT", "6379")),
            username=os.getenv("REDIS_USERNAME"),
            password=os.getenv("REDIS_PASSWORD"),
            db=int(os.getenv("REDIS_DB", "0")),
        )

        if mode == "SENTINEL":
            hosts_str = os.getenv("REDIS_SENTINEL_HOSTS")
            if not hosts_str:
                raise ValueError("REDIS_SENTINEL_HOSTS 未配置，但指定用哨兵模式连接")
            sentinel_hosts = self._parse_sentinel_hosts(hosts_str)
            if not sentinel_hosts:
                raise ValueError(f"REDIS_SENTINEL_HOSTS 的格式错误解析失败，请检查: {hosts_str}")
            config["sentinel_hosts"] = sentinel_hosts
            config["sentinel_name"] = os.getenv("REDIS_SENTINEL_NAME", "mymaster")
            config["sentinel_username"] = os.getenv("REDIS_SENTINEL_USERNAME")
            config["sentinel_password"] = os.getenv("REDIS_SENTINEL_PASSWORD")

        return config

    @property
    def jwt_configuration(self) -> JWTConfiguration:
        if not self.isLoaded:
            raise RuntimeError("环境变量未加载")

        secret = os.getenv("JWT_SECRET")
        if not secret:
            raise ValueError("JWT_SECRET 未配置，请在 .env 中设置")

        return JWTConfiguration(
            secret=secret,
            access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15")),
            refresh_token_expire_days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")),
        )


if __name__ == "__main__":
    env = Environment()
    print(env.redis_configuration)
