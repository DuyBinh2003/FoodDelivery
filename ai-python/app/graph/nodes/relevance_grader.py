import json
import structlog
from typing import Any
from app.graph.state import GraphState
from app.models.llm_factory import LLMFactory
from app.prompts.grader_prompt import RELEVANCE_GRADER_PROMPT

logger = structlog.get_logger(__name__)

async def grade_documents_node(state: GraphState) -> dict[str, Any]:
    intent = state.get("intent", "MENU_RECOMMENDATION")
    question = state.get("question", "")
    documents = state.get("documents", [])

    # Chitchat hoặc Out of scope không cần context từ retrieval
    if intent in ["GENERAL_CHITCHAT", "OUT_OF_SCOPE"]:
        return {
            "relevance_score": 1.0,
            "web_search_needed": False,
        }

    # Nếu không retrieve được tài liệu nào
    if not documents:
        return {
            "relevance_score": 0.0,
            "web_search_needed": True,
        }

    formatted_docs = "\n\n".join(
        [f"[{doc.get('source_ref', 'Doc')}]: {doc.get('content', '')}" for doc in documents]
    )

    try:
        llm = LLMFactory.get_fast()
        prompt = RELEVANCE_GRADER_PROMPT.format(
            question=question,
            documents=formatted_docs,
        )
        response = await llm.ainvoke(prompt)
        text = LLMFactory.extract_text(response.content)
        clean = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)
        score = float(data.get("score", 0.8))
        return {
            "relevance_score": score,
            "web_search_needed": score < 0.75,
        }
    except Exception as e:
        logger.warn("grade_documents_failed", error=str(e))

    # Mặc định chấp nhận nếu đã có tài liệu
    return {
        "relevance_score": 0.8,
        "web_search_needed": False,
    }
