import structlog
from typing import Any
from app.graph.state import GraphState
from app.retrievers.pgvector_retriever import PgVectorRetriever
from app.retrievers.elasticsearch_retriever import ElasticsearchRetriever
from app.retrievers.internal_api_retriever import InternalApiRetriever

logger = structlog.get_logger(__name__)

pg_retriever = PgVectorRetriever()
es_retriever = ElasticsearchRetriever()
api_retriever = InternalApiRetriever()

async def retrieve_node(state: GraphState) -> dict[str, Any]:
    intent = state.get("intent", "MENU_RECOMMENDATION")
    question = state.get("rewritten_question") or state.get("question", "")
    user_id = state.get("user_id", "")
    user_location = state.get("user_location")

    documents: list[dict[str, Any]] = []

    try:
        if intent == "ORDER_STATUS":
            # Gọi internal API lấy orders
            docs = await api_retriever.fetch_user_orders(user_id, question)
            documents.extend(docs)

        elif intent == "LOYALTY_PROGRAM":
            loyalty_docs = await api_retriever.fetch_loyalty_info(user_id)
            documents.extend(loyalty_docs)
            faq_docs = pg_retriever.retrieve(question)
            documents.extend(faq_docs)

        elif intent in ["RESTAURANT_SEARCH", "MENU_RECOMMENDATION"]:
            es_docs = es_retriever.search(question, user_location=user_location, top_k=3)
            documents.extend(es_docs)
            vector_docs = pg_retriever.retrieve(question)
            documents.extend(vector_docs)

        elif intent in ["REFUND_POLICY", "DELIVERY_SUPPORT", "PARTNER_SUPPORT"]:
            vector_docs = pg_retriever.retrieve(question)
            documents.extend(vector_docs)

        elif intent in ["GENERAL_CHITCHAT", "OUT_OF_SCOPE"]:
            # Không cần retrieve kiến thức
            pass

    except Exception as e:
        logger.warn("retriever_node_error", error=str(e), intent=intent)

    return {"documents": documents}
