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
        await asyncio.sleep(4 * 60)   # Wait FIRST, ping after
        try:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        except Exception as e:
            print(f"[keep-alive] DB ping failed: {e}")

async def _poll_rfq_status():
    """Poll for expired RFQs every minute and update their status."""
    from app.database import AsyncSessionLocal
    from app.models.rfq import RFQ
    from app.routers.bids import _refresh_rfq_status
    from sqlalchemy import select

    while True:
        await asyncio.sleep(60)
        try:
            async with AsyncSessionLocal() as db:
                # Only check RFQs that are not already closed
                result = await db.execute(
                    select(RFQ).where(RFQ.status.in_(["draft", "active"]))
                )
                rfqs = result.scalars().all()
                for rfq in rfqs:
                    await _refresh_rfq_status(rfq, db)
        except Exception as e:
            print(f"[scheduler] RFQ poll failed: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm up immediately on start
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as e:
        print(f"[startup] DB warm-up failed: {e}")
    
    # Start the background tasks
    keep_alive_task = asyncio.create_task(_keep_db_alive())
    scheduler_task = asyncio.create_task(_poll_rfq_status())
    yield
    # Cancel the tasks on shutdown
    keep_alive_task.cancel()
    scheduler_task.cancel()

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

