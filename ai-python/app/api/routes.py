import json
import os
import time
import asyncio
from typing import Any, AsyncGenerator
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import structlog
from app.graph.crag_graph import build_crag_graph
from app.knowledge.embedder import KnowledgeEmbedder

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/internal/rag", tags=["RAG"])

class RagQueryRequest(BaseModel):
    user_id: str
    user_role: str = "CUSTOMER"
    message: str = Field(..., max_length=2000)
    session_history: list[dict[str, str]] = Field(default_factory=list)
    user_location: dict[str, float] | None = None
    auth_context: dict[str, Any] = Field(default_factory=dict)

# Khởi tạo Graph một lần duy nhất khi service khởi động
graph = build_crag_graph()

async def generate_rag_sse_stream(req: RagQueryRequest) -> AsyncGenerator[str, None]:
    start_time = time.time()
    initial_state = {
        "user_id": req.user_id,
        "user_role": req.user_role,
        "question": req.message,
        "user_location": req.user_location,
        "auth_context": req.auth_context,
        "session_history": req.session_history,
        "intent": "MENU_RECOMMENDATION",
        "documents": [],
        "relevance_score": 0.0,
        "web_search_needed": False,
        "rewritten_question": None,
        "rewrite_count": 0,
        "generation": "",
        "model_used": os.getenv("GEMINI_MODEL_QUALITY", "gemini-3.5-flash"),
        "tokens_used": 0,
        "sources_used": [],
        "langsmith_run_id": None,
    }

    try:
        # Chạy pipeline CRAG qua StateGraph
        final_state = await graph.ainvoke(initial_state)

        generation = final_state.get("generation", "")
        # Yield câu trả lời theo từng đoạn ngắn (chunk streaming giả lập mượt mà cho client)
        chunk_size = 12
        words = generation.split(" ")
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i : i + chunk_size]) + (" " if i + chunk_size < len(words) else "")
            payload = json.dumps({"type": "chunk", "content": chunk}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.04)

        latency_ms = int((time.time() - start_time) * 1000)
        done_payload = json.dumps(
            {
                "type": "done",
                "intent": final_state.get("intent"),
                "modelUsed": final_state.get("model_used"),
                "relevanceScore": final_state.get("relevance_score"),
                "tokensUsed": final_state.get("tokens_used"),
                "latencyMs": latency_ms,
                "sourcesUsed": final_state.get("sources_used", []),
            },
            ensure_ascii=False,
        )
        yield f"data: {done_payload}\n\n"

    except Exception as e:
        logger.error("crag_stream_error", error=str(e), user_id=req.user_id)
        error_payload = json.dumps(
            {"type": "error", "message": f"Lỗi hệ thống AI: {str(e)}"},
            ensure_ascii=False,
        )
        yield f"data: {error_payload}\n\n"

@router.post("/query")
async def rag_query_endpoint(request: RagQueryRequest) -> StreamingResponse:
    return StreamingResponse(
        generate_rag_sse_stream(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

@router.post("/embed")
async def rag_embed_endpoint() -> dict[str, Any]:
    embedder = KnowledgeEmbedder()
    count = embedder.embed_and_save_all()
    return {
        "message": "Knowledge re-embedded successfully",
        "count": count,
    }

@router.get("/health")
async def rag_health_check() -> dict[str, str]:
    return {
        "status": "UP",
        "service": "ai-python-langgraph",
    }
