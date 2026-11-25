import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import structlog

# Load environment variables
load_dotenv()

from app.models.llm_factory import LLMFactory
from app.api.routes import router as rag_router

logger = structlog.get_logger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Fail-Fast checks
    logger.info("ai_python_starting_up")
    try:
        LLMFactory.validate_keys()
        logger.info("gemini_api_key_validated")
    except ValueError as e:
        logger.error("startup_validation_failed", error=str(e))
        # Log rõ ràng, nếu ở dev mode mà chưa set key thì ghi cảnh báo
        if os.getenv("NODE_ENV") == "production":
            raise e
        logger.warn("running_in_dev_with_mock_keys")
    yield
    logger.info("ai_python_shutting_down")

app = FastAPI(
    title="FoodDelivery AI — LangGraph Intelligence Core",
    version="1.0.0",
    lifespan=lifespan,
)

_cors_raw = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:8080,http://localhost:3000,http://localhost:5001")
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Trace-Id"],
)

app.include_router(rag_router)

@app.get("/")
async def root():
    return {
        "service": "FoodDelivery AI Python LangGraph Service",
        "docs": "/docs",
        "health": "/internal/rag/health",
    }
