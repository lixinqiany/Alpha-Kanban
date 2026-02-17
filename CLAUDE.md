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

**Lifecycle management pattern**: Services (Redis, Postgres) implement a `Manageable` abstract interface (`start()`/`close()` methods) and register with a `LifeSpan` context manager that handles startup/shutdown via FastAPI's lifespan. Singletons `redis_manager` and `postgres_manager` are module-level instances.

**Configuration**: `Environment` class in `config/environment.py` loads from `.env` files. Typed configuration dicts (`PostgresConfiguration`, `RedisConfiguration`) are used throughout. Redis supports both STANDALONE and SENTINEL modes.

**Key entry point**: `backend/app.py` creates the FastAPI app and wires up the lifespan. No API routes or SQLAlchemy models are defined yet.

## Code Style

- Python: 4-space indentation
- JS/TS: 2-space indentation
- Code comments are primarily in Chinese
- See `.editorconfig` for full formatting rules
