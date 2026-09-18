from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import ALLOWED_ORIGINS
from .routers import analytics, api_keys, settings_router, verify
from .security import ensure_default_key


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_default_key()
    yield


app = FastAPI(
    title="SAFE-RAG Verification API",
    description="Hallucination detection and fact verification API for LLM outputs.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(verify.router)
app.include_router(analytics.router)
app.include_router(api_keys.router)
app.include_router(settings_router.router)


@app.get("/", tags=["health"])
async def root():
    return {"service": "safe-rag-api", "status": "ok", "docs": "/docs"}


@app.get("/v1/health", tags=["health"])
async def health():
    return {"status": "ok"}
