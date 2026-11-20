from datetime import datetime
import structlog
from typing import Any
from app.graph.state import GraphState
from app.models.llm_factory import LLMFactory
from app.prompts.system_prompt import SYSTEM_PROMPT

logger = structlog.get_logger(__name__)

async def generate_node(state: GraphState) -> dict[str, Any]:
    question = state.get("question", "")
    documents = state.get("documents", [])
    history = state.get("session_history", [])
    user_id = state.get("user_id", "khách hàng")
    user_role = state.get("user_role", "CUSTOMER")
    user_location = str(state.get("user_location") or "TP. Hồ Chí Minh")
    intent = state.get("intent", "MENU_RECOMMENDATION")

    # Format context docs
    if documents:
        context_parts = []
        sources = []
        for i, doc in enumerate(documents):
            ref = doc.get("source_ref", f"Nguồn #{i+1}")
            sources.append(ref)
            context_parts.append(f"--- Nguồn [{ref}] ({doc.get('source_type', 'DOC')}):\n{doc.get('content', '')}")
        context_text = "\n\n".join(context_parts)
    else:
        sources = []
        if intent == "GENERAL_CHITCHAT":
            context_text = "Người dùng đang trò chuyện xã giao, chào hỏi hoặc cảm ơn. Hãy đáp lại thân thiện, lịch thiệp và sẵn sàng hỗ trợ đặt món."
        elif intent == "OUT_OF_SCOPE":
            context_text = "Câu hỏi nằm ngoài phạm vi dịch vụ FoodDelivery (đồ ăn, đặt món, nhà hàng, tài xế, bồi thường). Hãy từ chối lịch sự và gợi ý đặt món ngon."
        else:
            context_text = "Không tìm thấy dữ liệu liên quan trong kho kiến thức."

    # Format chat history
    formatted_history = "\n".join(
        [f"{msg.get('role', 'user')}: {msg.get('content', '')}" for msg in history[-6:]]
    ) or "Chưa có tin nhắn trước đó."

    system_instruction = SYSTEM_PROMPT.format(
        user_role=user_role,
        user_id=user_id,
        user_location=user_location,
        current_time=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        retrieved_context=context_text,
        chat_history=formatted_history,
    )

    full_prompt = f"{system_instruction}\n\nCâu hỏi hiện tại của người dùng: {question}"

    model_used = "gemini-1.5-pro"
    generation_text = ""

    # Primary: Gemini Pro
    try:
        llm = LLMFactory.get_quality()
        response = await llm.ainvoke(full_prompt)
        generation_text = str(response.content)
    except Exception as gemini_err:
        logger.warn("gemini_pro_failed_trying_fallback", error=str(gemini_err))
        # Fallback: OpenAI GPT-4o
        fallback_llm = LLMFactory.get_fallback()
        if fallback_llm:
            try:
                model_used = "gpt-4o"
                response = await fallback_llm.ainvoke(full_prompt)
                generation_text = str(response.content)
            except Exception as openai_err:
                logger.error("openai_fallback_also_failed", error=str(openai_err))
                generation_text = (
                    "Xin lỗi, hiện tại tôi đang gặp chút sự cố kết nối với hệ thống AI. "
                    "Vui lòng thử lại sau giây lát hoặc liên hệ tổng đài 1900 6868 nhé!"
                )
        else:
            generation_text = (
                "Xin lỗi, hiện tại dịch vụ AI đang bận. Bạn vui lòng thử lại sau ít phút nhé!"
            )

    # Ước lượng tokens used tương đối (1 word ~ 1.3 token)
    estimated_tokens = int(len(full_prompt.split() + generation_text.split()) * 1.3)

    return {
        "generation": generation_text,
        "model_used": model_used,
        "tokens_used": estimated_tokens,
        "sources_used": sources,
    }
