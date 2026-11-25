import json
import structlog
from app.graph.state import GraphState
from app.models.llm_factory import LLMFactory

logger = structlog.get_logger(__name__)

INTENT_CLASSIFIER_PROMPT = """Bạn là bộ phân loại ý định (Intent Classifier) cho ứng dụng FoodDelivery.
Hãy phân loại câu hỏi của người dùng vào ĐÚNG 1 trong 9 danh mục sau:

1. MENU_RECOMMENDATION: Gợi ý món ăn, thèm ăn gì, đồ uống, chọn món theo sở thích/ngân sách.
2. ORDER_STATUS: Hỏi vị trí đơn hàng, thời gian giao đơn, tình trạng đơn vừa đặt.
3. REFUND_POLICY: Khiếu nại hoàn tiền, đổi trả món hỏng, bồi thường, không nhận được món.
4. RESTAURANT_SEARCH: Tìm quán ăn gần đây, địa chỉ quán, giờ mở cửa quán, thương hiệu nhà hàng.
5. LOYALTY_PROGRAM: Điểm thưởng, đổi quà, hạng thành viên, mã giảm giá FoodPoints.
6. DELIVERY_SUPPORT: Dành cho tài xế hỏi đường, báo cáo sự cố giao hàng, cách nhận cuốc.
7. PARTNER_SUPPORT: Dành cho đối tác quán ăn hỏi về đăng ký menu, đóng mở quán, phí chiết khấu.
8. GENERAL_CHITCHAT: Lời chào hỏi, cảm ơn, hỏi tên bot, trò chuyện xã giao thông thường.
9. OUT_OF_SCOPE: Các chủ đề hoàn toàn không liên quan (thời tiết, chính trị, code lập trình, toán học...).

Câu hỏi người dùng: "{question}"
Vai trò người dùng: "{user_role}"

Trả về JSON duy nhất định dạng:
{{"intent": "TEN_INTENT"}}
"""

async def classify_intent_node(state: GraphState) -> dict[str, str]:
    question = state.get("question", "")
    user_role = state.get("user_role", "CUSTOMER")

    # Fast rules cho các lời chào đơn giản
    lowered = question.lower().strip()
    if lowered in ["hi", "hello", "xin chào", "chào bạn", "bạn là ai"]:
        return {"intent": "GENERAL_CHITCHAT"}

    try:
        llm = LLMFactory.get_fast()
        prompt = INTENT_CLASSIFIER_PROMPT.format(question=question, user_role=user_role)
        response = await llm.ainvoke(prompt)
        text = LLMFactory.extract_text(response.content)
        clean_text = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        intent = data.get("intent", "MENU_RECOMMENDATION")
        return {"intent": intent}
    except Exception as e:
        logger.warn("intent_classification_fallback", error=str(e), question=question)

    return {"intent": "MENU_RECOMMENDATION"}
