import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine

from app.routers.auth import router as auth_router
from app.routers.bids import router as bids_router
from app.routers.rfqs import router as rfqs_router
from app.routers.ws import router as ws_router

async def _keep_db_alive():
    """Ping Neon every 4 minutes so the compute never auto-suspends."""
    while True:
        await asyncio.sleep(4 * 60)          # 4 minutes
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except Exception as e:
            print(f"[keep-alive] DB ping failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start the keep-alive task
    task = asyncio.create_task(_keep_db_alive())
    yield
    # Cancel the task on shutdown
    task.cancel()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ws_router)
app.include_router(auth_router)
app.include_router(rfqs_router)
app.include_router(bids_router)

@app.get("/")
async def root():
    return {"status": "running"}

@app.get("/test-db")
async def test_db():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        return {"db": "connected"}

