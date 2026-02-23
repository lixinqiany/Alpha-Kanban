# CLAUDE.md

本文件为 Claude Code 提供项目上下文。

## Project Overview

Alpha-Kanban 是一个集看板管理、AI 聊天、AI 金融行情分析于一体的应用平台。后端 Python FastAPI，前端 Vue 3 + TypeScript。

## Commands

```bash
# 后端
pip install -r backend/requirements.txt
cd backend && python app.py

# 前端
cd frontend && yarn install
cd frontend && yarn dev
cd frontend && yarn build

# 数据库迁移（Alembic）
cd backend && alembic upgrade head
cd backend && alembic revision --autogenerate -m "描述"

# Docker（PostgreSQL 16 + Redis 7）
docker-compose -f docker/docker-compose.yml up -d
docker-compose -f docker/docker-compose.yml down
```

无测试框架。

## Architecture

**Backend**: FastAPI async + SQLAlchemy 2.0 (async) + asyncpg + redis.asyncio

**Frontend**: Vue 3.5 + TypeScript 5.9 + Vite 7 + Vue Router 5 + Axios，TSX 编写组件

### Directory Structure

```
backend/
├── app.py             # 入口，注册 lifespan 和路由
├── alembic/           # 数据库迁移
├── config/            # 配置与基础设施（环境变量、JWT、数据库连接、Redis、生命周期管理）
├── models/            # SQLAlchemy ORM 模型（集中管理，不放在模块内）
├── modules/           # 按业务域组织的功能模块
│   └── <xxx>/         # router.py / service.py / schema.py / dependencies.py（可选）
└── utils/             # 通用工具函数

frontend/src/
├── api/               # Axios 实例与拦截器（client.ts）+ 各业务域接口（<xxx>.ts）
├── components/        # 全局通用组件，每个组件同名文件夹 + index.tsx 入口
├── views/             # 页面视图，按功能分组
└── router/            # Vue Router 路由定义
```

## Data Models

所有模型继承 `Base`（UUID 主键 + `created_at` + `updated_at`）。

### ER 关系

```
User (users)
 ├──1:N── Conversation (conversations)      user_id FK → users.id
 │         └──1:N── Message (messages)       conversation_id FK → conversations.id (CASCADE)
 │                  └── user_id FK → users.id
 │
 └── role: admin | user（UserRole 枚举，默认 user）

Provider (providers)
 └──1:N── Model (models)                    provider_id FK → providers.id (CASCADE)
```

### 约束与索引

| 表 | 约束 |
|---|---|
| users | username UNIQUE |
| providers | name UNIQUE |
| models | (provider_id, name) UNIQUE |
| messages | (conversation_id, order) UNIQUE |
| conversations | INDEX (user_id, last_chat_time) |
| messages | INDEX (user_id) |

### 枚举

- `UserRole`: admin, user
- `MessageRole`: system, user, assistant
- `MessageStatus`: generating, completed, aborted

## API Endpoints

```
# 用户认证（无鉴权）
POST /api/user/register | login | refresh | logout

# 供应商管理（需要 admin 角色）
GET|POST   /api/provider-management/providers
GET|PUT|DELETE /api/provider-management/providers/{id}
GET|POST   /api/provider-management/providers/{id}/models
PUT|DELETE /api/provider-management/models/{model_id}
```

分页接口统一使用 `page`（1-based）和 `page_size`（默认 10，最大 100）查询参数。

## Frontend Routes

| 路径 | 组件 | 说明 |
|------|------|------|
| `/login` | LoginView | 登录 |
| `/register` | RegisterView | 注册 |
| `/providers` | ProviderListView | 供应商列表 |
| `/providers/:id/models` | ProviderModelsView | 模型列表 |
| `/` | — | 重定向到 `/login` |

## Utils

### 分页 — `utils/pagination.py`

`PaginatedResponse[T]` 泛型 Pydantic 模型 + `paginate()` 异步函数，接受 SQLAlchemy Select 查询，自动计数和分页返回。

### JWT 工具 — `config/auth.py`

- `create_access_token(config, user_id, role)` — 生成 access token，payload 含 `sub` + `role`
- `create_refresh_token(config, user_id)` — 生成 refresh token，payload 含 `jti`
- `decode_token(config, token)` — 解码验证令牌
- `make_refresh_key(user_id, jti)` — Redis 键名生成

## 开发约定

### 后端模块结构

每个业务模块在 `modules/<xxx>/` 下包含：
- `router.py` — 路由定义
- `service.py` — 业务逻辑
- `schema.py` — Pydantic 数据校验
- `dependencies.py` — 路由守卫 / 依赖注入（可选）

### 认证与权限

- **JWT 双令牌**：Access Token（15min，含 `sub` + `role`）+ Refresh Token（7天，Redis 可撤销）
- **`get_current_user`**：验证令牌 + 查库返回完整 User 对象，用于需要用户信息的路由
- **`require_roles(*roles)`**：角色守卫工厂函数，纯 JWT 解码校验角色，零数据库查询：
  ```python
  # Router 级别
  router = APIRouter(dependencies=[Depends(require_roles(UserRole.ADMIN))])
  # 单个路由
  @router.get("/x", dependencies=[Depends(require_roles(UserRole.ADMIN))])
  # 多角色（满足其一）
  Depends(require_roles(UserRole.ADMIN, UserRole.USER))
  ```
- **刷新时查库**：`refresh_access_token` 查询用户最新 role 写入新 token，确保角色变更及时生效

### 前端约定

- TSX + `defineComponent` + `setup()`，CSS Modules 样式隔离
- `components/` 每个组件同名文件夹，`index.tsx` 作为入口
- `api/client.ts` 提供 `publicClient`（无鉴权）和 `authClient`（自动注入 Bearer Token + 401 静默刷新）
- `api/<domain>.ts` 封装业务接口 + TS 类型定义
- Vite 开发环境 `/api` 代理到 `VITE_API_BASE_URL`（默认 `http://localhost:8000`）
- 令牌存 `localStorage`（`access_token` / `refresh_token`）

### Lifecycle Management

`redis_manager` / `postgres_manager` 实现 `Manageable` 接口（`start()` / `close()`），通过 `LifeSpan` 注册到 FastAPI lifespan。

### 注意事项

- Pydantic `HttpUrl` 验证后返回 URL 对象，存数据库前需转 `str`
- 新增/修改模型后需通过 Alembic 生成并执行迁移
- 新增模块后需在 `app.py` 中注册路由

## Code Style

- Python: 4 空格缩进
- JS/TS/TSX: 2 空格缩进，yarn 包管理
- 注释使用中文
- 详见 `.editorconfig`
