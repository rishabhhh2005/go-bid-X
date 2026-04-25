from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine

from app.routers.auth import router as auth_router
from app.routers.bids import router as bids_router
from app.routers.rfqs import router as rfqs_router
from app.routers.ws import router as ws_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(rfqs_router)
app.include_router(bids_router)
app.include_router(ws_router)

@app.get("/")
async def root():
    return {"status": "running"}

@app.get("/test-db")
async def test_db():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT 1"))
        return {"db": "connected"}

