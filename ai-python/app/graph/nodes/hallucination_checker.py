import json
import structlog
from typing import Any
from app.graph.state import GraphState
from app.models.llm_factory import LLMFactory
from app.prompts.grader_prompt import HALLUCINATION_GRADER_PROMPT

logger = structlog.get_logger(__name__)

async def check_hallucination_node(state: GraphState) -> dict[str, Any]:
    intent = state.get("intent", "MENU_RECOMMENDATION")
    documents = state.get("documents", [])
    generation = state.get("generation", "")
    rewrite_count = state.get("rewrite_count", 0)

    # Chitchat, Out of scope hoặc đã hết lượt rewrite -> Chấp nhận kết quả
    if intent in ["GENERAL_CHITCHAT", "OUT_OF_SCOPE"] or rewrite_count >= 2:
        return {"hallucination_detected": False}

    if not documents:
        return {"hallucination_detected": False}

    formatted_context = "\n\n".join(
        [f"[{doc.get('source_ref', 'Doc')}]: {doc.get('content', '')}" for doc in documents]
    )

    try:
        llm = LLMFactory.get_fast()
        prompt = HALLUCINATION_GRADER_PROMPT.format(
            context=formatted_context,
            generation=generation,
        )
        response = await llm.ainvoke(prompt)
        text = LLMFactory.extract_text(response.content)
        clean = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)
        is_grounded = bool(data.get("grounded", True))
        return {"hallucination_detected": not is_grounded}
    except Exception as e:
        logger.warn("hallucination_check_failed", error=str(e))

    return {"hallucination_detected": False}
