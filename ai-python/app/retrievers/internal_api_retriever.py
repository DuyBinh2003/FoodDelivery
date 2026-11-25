import os
import httpx
import structlog
from typing import Any

logger = structlog.get_logger(__name__)

class InternalApiRetriever:
    def __init__(self) -> None:
        self.order_service_url = os.getenv("ORDER_SERVICE_URL", "http://localhost:4004")
        self.user_service_url = os.getenv("USER_SERVICE_URL", "http://localhost:4001")

    async def fetch_user_orders(self, user_id: str, query: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"{self.order_service_url}/orders",
                    params={"userId": user_id, "limit": 3},
                )
                if resp.status_code == 200:
                    orders_data = resp.json()
                    orders = orders_data.get("data", orders_data) if isinstance(orders_data, dict) else orders_data
                    if isinstance(orders, list) and orders:
                        formatted_orders = []
                        for order in orders:
                            formatted_orders.append(
                                f"Mã đơn: {order.get('id', 'N/A')}\n"
                                f"Trạng thái: {order.get('status', 'N/A')}\n"
                                f"Tổng tiền: {order.get('totalAmount', order.get('total', 0))} VNĐ\n"
                                f"Thời gian tạo: {order.get('createdAt', 'N/A')}"
                            )
                        results.append({
                            "source_type": "ORDER_SERVICE",
                            "source_ref": "recent_orders",
                            "content": "\n---\n".join(formatted_orders),
                            "score": 1.0,
                        })
                    else:
                        results.append({
                            "source_type": "ORDER_SERVICE",
                            "source_ref": "no_orders",
                            "content": "Người dùng hiện tại chưa có đơn hàng nào được ghi nhận gần đây.",
                            "score": 0.9,
                        })
                else:
                    logger.warn("order_service_bad_status", status=resp.status_code)
        except Exception as e:
            logger.warn("order_service_call_failed", error=str(e), user_id=user_id)
            results.append({
                "source_type": "ORDER_SERVICE",
                "source_ref": "service_down",
                "content": "Hệ thống tra cứu đơn hàng hiện đang bảo trì, không thể truy xuất danh sách đơn lúc này.",
                "score": 0.5,
            })
        return results

    async def fetch_loyalty_info(self, user_id: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.user_service_url}/users/{user_id}/loyalty")
                if resp.status_code == 200:
                    loyalty = resp.json()
                    results.append({
                        "source_type": "USER_SERVICE",
                        "source_ref": "loyalty_program",
                        "content": (
                            f"Thông tin điểm thưởng người dùng:\n"
                            f"- Điểm tích lũy: {loyalty.get('points', 0)} FoodPoints\n"
                            f"- Hạng thành viên: {loyalty.get('tier', 'Thành viên mới')}\n"
                            f"- Mã ưu đãi khả dụng: {loyalty.get('vouchersCount', 0)}"
                        ),
                        "score": 1.0,
                    })
                else:
                    logger.warn("user_loyalty_service_bad_status", status=resp.status_code)
        except Exception as e:
            logger.warn("user_service_call_failed", error=str(e), user_id=user_id)
        return results
