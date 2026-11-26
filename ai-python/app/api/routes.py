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

NODE_STATUS_MAP: dict[str, dict[str, str]] = {
    "classify_intent": {"step": "classifying", "message": "Đang phân loại ý định câu hỏi..."},
    "retrieve": {"step": "retrieving", "message": "Đang tìm kiếm thực đơn và dữ liệu..."},
    "grade_documents": {"step": "grading", "message": "Đang đánh giá độ liên quan dữ liệu..."},
    "rewrite_query": {"step": "rewriting", "message": "Đang tối ưu hóa truy vấn tìm kiếm..."},
    "web_search": {"step": "searching", "message": "Đang mở rộng tìm kiếm thông tin..."},
    "generate": {"step": "generating", "message": "Đang tổng hợp câu trả lời..."},
    "check_hallucination": {"step": "checking", "message": "Đang kiểm tra độ chính xác..."},
}

async def generate_rag_sse_stream(req: RagQueryRequest) -> AsyncGenerator[str, None]:
    start_time = time.time()
    initial_state: dict[str, Any] = {
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
        # Phát ngay status đầu tiên để tránh timeout ở proxy/client
        init_payload = json.dumps(
            {"type": "status", "step": "starting", "message": "Đang phân tích yêu cầu..."},
            ensure_ascii=False,
        )
        yield f"data: {init_payload}\n\n"

        final_state: dict[str, Any] = dict(initial_state)

        # Chạy pipeline CRAG qua StateGraph dạng stream từng node
        async for event in graph.astream(initial_state, stream_mode="updates"):
            for node_name, node_output in event.items():
                if isinstance(node_output, dict):
                    final_state.update(node_output)

                logger.info(
                    "crag_node_completed",
                    node=node_name,
                    intent=final_state.get("intent"),
                    docs_count=len(final_state.get("documents", [])),
                    relevance_score=final_state.get("relevance_score"),
                    user_id=req.user_id,
                )

                status_info = NODE_STATUS_MAP.get(node_name)
                if status_info:
                    status_payload = json.dumps(
                        {
                            "type": "status",
                            "step": status_info["step"],
                            "message": status_info["message"],
                        },
                        ensure_ascii=False,
                    )
                    yield f"data: {status_payload}\n\n"

        generation = str(final_state.get("generation", ""))
        # Yield câu trả lời theo từng đoạn ngắn (chunk streaming giả lập mượt mà cho client)
        chunk_size = 12
        words = generation.split(" ")
        for i in range(0, len(words), chunk_size):
            chunk = " ".join(words[i : i + chunk_size]) + (" " if i + chunk_size < len(words) else "")
            payload = json.dumps({"type": "chunk", "content": chunk}, ensure_ascii=False)
            yield f"data: {payload}\n\n"
            await asyncio.sleep(0.04)

        latency_ms = int((time.time() - start_time) * 1000)
        logger.info(
            "crag_stream_completed",
            intent=final_state.get("intent"),
            model_used=final_state.get("model_used"),
            tokens_used=final_state.get("tokens_used"),
            latency_ms=latency_ms,
            user_id=req.user_id,
        )
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
