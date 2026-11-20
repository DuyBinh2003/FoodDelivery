QUERY_REWRITER_PROMPT = """Bạn là trợ lý tối ưu hóa câu truy vấn tìm kiếm cho hệ thống RAG FoodDelivery.

Câu hỏi ban đầu của người dùng không đủ rõ ràng hoặc chưa tìm được tài liệu phù hợp trong kho kiến thức nội bộ:
Câu hỏi gốc: {question}

Lịch sử trò chuyện gần nhất:
{chat_history}

Nhiệm vụ: Viết lại câu hỏi thành một truy vấn tìm kiếm độc lập, rõ nghĩa, bổ sung từ khóa liên quan đến ẩm thực, nhà hàng, quy định hoàn tiền/đơn hàng để có thể tra cứu hiệu quả hơn trên công cụ tìm kiếm bên ngoài.

Chỉ trả về duy nhất câu truy vấn đã viết lại, không giải thích gì thêm.
"""
