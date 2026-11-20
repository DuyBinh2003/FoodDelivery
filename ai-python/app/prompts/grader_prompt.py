RELEVANCE_GRADER_PROMPT = """Bạn là một giám định viên đánh giá chất lượng tài liệu trích xuất (retrieved documents) cho hệ thống RAG FoodDelivery.

Nhiệm vụ: Đánh giá xem các tài liệu trích xuất có chứa thông tin trả lời được câu hỏi của người dùng hay không.

Câu hỏi của người dùng:
{question}

Tài liệu trích xuất:
{documents}

Hãy trả về điểm số phù hợp:
- Trả về JSON: {{"score": 0.0 - 1.0, "reason": "giải thích ngắn gọn"}}
- Điểm >= 0.75: Tài liệu chứa thông tin rõ ràng, trả lời được câu hỏi.
- Điểm < 0.75: Tài liệu mơ hồ, thiếu thông tin hoặc lạc đề.

Chỉ trả về cú pháp JSON hợp lệ, không kèm văn bản thừa.
"""

HALLUCINATION_GRADER_PROMPT = """Bạn là chuyên gia thẩm định kiểm tra ảo giác (hallucination check) cho hệ thống AI FoodDelivery.

Nhiệm vụ: Kiểm tra xem câu trả lời được sinh ra có hoàn toàn dựa trên sự thật trong tài liệu ngữ cảnh (grounded in context) hay bịa đặt.

Tài liệu gốc (Context):
{context}

Câu trả lời của AI:
{generation}

Hãy trả về JSON:
{{"grounded": true/false, "explanation": "lý do"}}
- grounded = true: Toàn bộ thông tin quan trọng đều có trong tài liệu.
- grounded = false: Chứa chi tiết bịa đặt không có trong tài liệu (tên quán, giá tiền, điều khoản).

Chỉ trả về cú pháp JSON hợp lệ.
"""
