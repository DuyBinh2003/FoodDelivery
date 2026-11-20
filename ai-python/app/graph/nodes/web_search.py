import os
import structlog
from typing import Any
from app.graph.state import GraphState

logger = structlog.get_logger(__name__)

async def web_search_node(state: GraphState) -> dict[str, Any]:
    tavily_key = os.getenv("TAVILY_API_KEY")
    query = state.get("rewritten_question") or state.get("question", "")
    existing_docs = list(state.get("documents", []))

    if not tavily_key or tavily_key == "your_tavily_api_key_here":
        logger.info("web_search_skipped_no_key", query=query)
        return {"documents": existing_docs}

    try:
        from tavily import TavilyClient
        client = TavilyClient(api_key=tavily_key)
        response = client.search(query=f"{query} món ăn ẩm thực Việt Nam", max_results=3)
        results = response.get("results", [])

        web_docs = []
        for res in results:
            web_docs.append({
                "source_type": "TAVILY_WEB",
                "source_ref": res.get("url", "Web"),
                "content": res.get("content", ""),
                "score": 0.85,
            })
        existing_docs.extend(web_docs)
    except Exception as e:
        logger.warn("web_search_failed", error=str(e), query=query)

    return {"documents": existing_docs}
