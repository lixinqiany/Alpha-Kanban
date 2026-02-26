import sys
from fastapi import FastAPI
from loguru import logger
from config.environment import Environment
from config.lifecycle import LifeSpan
from config.redis import redis_manager
from config.postgres import postgres_manager
# 注册业务路由
from modules.user.router import router as user_router
from modules.admin.provider_management.router import router as provider_management_router
from modules.admin.model_management.router import router as model_management_router
from modules.chat.router import router as chat_router
from modules.general_chat.router import router as general_chat_router
from modules.model.router import router as model_router

env = Environment()
# 在 lifespan 初始化前配置日志级别，因为 lifespan 也需要使用 logger
# 如果在 lifespan 初始化后配置，在不使用lifespan的情况下就无法正确初始化日志系统
logger.remove()
logger.add(sys.stderr, level=env.log_level)

# 连接参数配置
redis_manager.setup(env.redis_configuration)
postgres_manager.setup(env.postgres_configuration)

# FastAPI 生命周期管理注册
lifespan = LifeSpan()
lifespan.register(postgres_manager)
lifespan.register(redis_manager)
app = FastAPI(lifespan=lifespan)

app.include_router(user_router)
app.include_router(provider_management_router)
app.include_router(model_management_router)
app.include_router(chat_router)
app.include_router(general_chat_router)
app.include_router(model_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=env.port, reload=True)
