import structlog
from typing import Any
from app.graph.state import GraphState
from app.models.llm_factory import LLMFactory
from app.prompts.rewriter_prompt import QUERY_REWRITER_PROMPT

logger = structlog.get_logger(__name__)

async def rewrite_query_node(state: GraphState) -> dict[str, Any]:
    question = state.get("question", "")
    history = state.get("session_history", [])
    current_rewrites = state.get("rewrite_count", 0)

    formatted_history = "\n".join(
        [f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in history[-4:]]
    ) or "Không có"

    rewritten = question
    try:
        llm = LLMFactory.get_fast()
        prompt = QUERY_REWRITER_PROMPT.format(
            question=question,
            chat_history=formatted_history,
        )
        response = await llm.ainvoke(prompt)
        if isinstance(response.content, str) and response.content.strip():
            rewritten = response.content.strip()
    except Exception as e:
        logger.warn("query_rewrite_failed", error=str(e), question=question)

    return {
        "rewritten_question": rewritten,
        "rewrite_count": current_rewrites + 1,
    }
