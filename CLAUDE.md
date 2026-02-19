# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alpha-Kanban is a kanban board application with a Python FastAPI backend. The frontend is not yet implemented.

## Commands

```bash
# Install backend dependencies
pip install -r backend/requirements.txt

# Run backend (development with hot reload)
cd backend && python app.py

# Start PostgreSQL via Docker
docker-compose -f docker/docker-compose.yml up -d

# Stop Docker services
docker-compose -f docker/docker-compose.yml down
```

No test framework is configured yet.

## Architecture

**Backend** (`backend/`): FastAPI async application using SQLAlchemy 2.0 (async) with asyncpg for PostgreSQL and redis.asyncio for Redis.

### Directory Structure

```
backend/
├── app.py                 # 入口，创建 FastAPI 实例并注册 lifespan 和路由
├── config/                # 配置与基础设施
│   ├── environment.py     # Environment 类，从 .env 加载配置（含 JWT、Postgres、Redis 配置）
│   ├── auth.py            # JWT 令牌工具函数（签发、验证、Redis 键名生成）
│   ├── lifecycle/         # Manageable 抽象接口 + LifeSpan 上下文管理器
│   ├── postgres.py        # PostgreSQL 连接管理（postgres_manager 单例）
│   └── redis.py           # Redis 连接管理（redis_manager 单例）
├── models/                # SQLAlchemy ORM 表定义（集中管理，处理外键依赖）
└── modules/               # 按业务域组织的功能模块
    └── <模块>/
        ├── router.py      # 路由
        ├── service.py     # 业务逻辑
        ├── schema.py      # 数据校验（Pydantic）
        └── dependencies.py  # 路由守卫 / 依赖注入（可选）
```

### Key Patterns

- **Lifecycle management**: Services (Redis, Postgres) implement `Manageable` abstract interface (`start()`/`close()`) and register with `LifeSpan` context manager via FastAPI's lifespan. `redis_manager` and `postgres_manager` are module-level singletons.
- **Configuration**: `Environment` class loads from `.env` files. Typed configuration dicts (`PostgresConfiguration`, `RedisConfiguration`, `JWTConfiguration`) are used throughout. Redis supports STANDALONE and SENTINEL modes.
- **Authentication**: JWT 双令牌方案（Access Token 15分钟 + Refresh Token 7天）。Access Token 纯签名验证，Refresh Token 存 Redis 可撤销。工具函数在 `config/auth.py`，路由守卫在 `modules/user/dependencies.py`（`get_current_user`）。
- **Module convention**: Each business module under `modules/` contains `router.py`（路由）、`service.py`（业务逻辑）、`schema.py`（数据校验）、`dependencies.py`（路由守卫，可选）。Models 集中放在 `models/` 目录下。

## Code Style

- Python: 4-space indentation
- JS/TS: 2-space indentation
- Code comments are primarily in Chinese
- See `.editorconfig` for full formatting rules
