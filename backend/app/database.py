from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base
from app.config import settings

# Async engine (Neon compatible)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=True,  # logs SQL queries (good for debugging)
    pool_size=5,
    max_overflow=10,
)

# Session
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False
)

# Base for models
Base = declarative_base()