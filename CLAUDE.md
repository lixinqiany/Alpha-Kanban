# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alpha-Kanban is a kanban board application with a Python FastAPI backend and a Vue 3 frontend.

## Commands

```bash
# Install backend dependencies
pip install -r backend/requirements.txt

# Run backend (development with hot reload)
cd backend && python app.py

# Install frontend dependencies
cd frontend && yarn install

# Run frontend (development with hot reload)
cd frontend && yarn dev

# Build frontend for production
cd frontend && yarn build

# Start PostgreSQL via Docker
docker-compose -f docker/docker-compose.yml up -d

# Stop Docker services
docker-compose -f docker/docker-compose.yml down
```

No test framework is configured yet.

## Architecture

**Backend** (`backend/`): FastAPI async application using SQLAlchemy 2.0 (async) with asyncpg for PostgreSQL and redis.asyncio for Redis.

**Frontend** (`frontend/`): Vue 3 + TypeScript + Vite 单页应用，使用 Vue Router 管理路由，Axios 处理 HTTP 请求，TSX 编写组件。

### Directory Structure

```
frontend/
├── index.html                 # HTML 入口
├── vite.config.ts             # Vite 配置（含 /api 代理到后端）
├── src/
│   ├── main.ts                # 应用入口，挂载 Vue 实例与 Router
│   ├── App.tsx                # 根组件（RouterView）
│   ├── router/index.ts        # Vue Router 路由定义
│   ├── api/
│   │   ├── client.ts          # Axios 实例（publicClient / authClient）与拦截器
│   │   └── <xxx>.ts           # xxx 业务相关 API
│   ├── components/            # 公共抽象组件
│   └── views/                 # 页面视图
└── .env.example               # 环境变量示例（VITE_API_BASE_URL）

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
- **Authentication（后端）**: JWT 双令牌方案（Access Token 15分钟 + Refresh Token 7天）。Access Token 纯签名验证，Refresh Token 存 Redis 可撤销。工具函数在 `config/auth.py`，路由守卫在 `modules/user/dependencies.py`（`get_current_user`）。
- **Authentication（前端）**: 令牌存储在 `localStorage`（`access_token` / `refresh_token`）。`api/client.ts` 提供两个 Axios 实例：`publicClient`（无鉴权，用于登录/注册/刷新）和 `authClient`（自动注入 Bearer Token）。`authClient` 响应拦截器实现 401 静默刷新：维护 `isRefreshing` 锁和 `pendingQueue` 队列，确保并发请求在刷新期间排队等待，刷新失败时清除令牌并跳转 `/login`。
- **Module convention**: Each business module under `modules/` contains `router.py`（路由）、`service.py`（业务逻辑）、`schema.py`（数据校验）、`dependencies.py`（路由守卫，可选）。Models 集中放在 `models/` 目录下。

### Frontend Patterns

- **技术栈**: Vue 3.5 + TypeScript 5.9 + Vite 7 + Vue Router 5 + Axios
- **组件风格**: 使用 TSX（`@vitejs/plugin-vue-jsx`），通过 `defineComponent` + `setup()` 编写，CSS Modules 做样式隔离
- **组件组织**: `components/` 存放全项目通用的样式组件抽象，每个组件用同名文件夹管理，`index.tsx` 作为导出入口（如 `components/AuthLayout/index.tsx`）
- **API 代理**: 开发环境 Vite 将 `/api` 代理到 `VITE_API_BASE_URL`（默认 `http://localhost:8000`），前端请求统一使用 `/api` 前缀
- **API 分层**: `api/client.ts` 负责 Axios 实例与拦截器，`api/<domain>.ts` 封装具体业务接口并定义 TypeScript 接口类型
- **路由**: Vue Router history 模式，页面组件放在 `views/` 目录下按功能分组

## Code Style

- Python: 4-space indentation
- JS/TS/Vue: 2-space indentation, yarn 作为包管理器
- Code comments are primarily in Chinese
- See `.editorconfig` for full formatting rules
