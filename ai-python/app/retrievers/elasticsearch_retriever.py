import os
from typing import Any
import structlog
from elasticsearch import Elasticsearch
from elasticsearch.exceptions import ConnectionError, ConnectionTimeout

logger = structlog.get_logger(__name__)

class ElasticsearchRetriever:
    def __init__(self) -> None:
        self.es_url = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
        try:
            self.client: Elasticsearch | None = Elasticsearch(
                self.es_url,
                request_timeout=3,
                max_retries=1,
            )
        except (ConnectionError, ConnectionTimeout) as e:
            logger.warn("elasticsearch_init_connection_error", error=str(e))
            self.client = None
        except Exception as e:
            logger.warn("elasticsearch_init_error", error=str(e))
            self.client = None

    def search(
        self,
        query: str,
        user_location: dict[str, float] | None = None,
        top_k: int = 5,
    ) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        if not self.client:
            return results

        try:
            # Multi-match query across restaurant and dish names/descriptions
            body: dict[str, Any] = {
                "size": top_k,
                "query": {
                    "bool": {
                        "should": [
                            {
                                "multi_match": {
                                    "query": query,
                                    "fields": ["name^3", "description^2", "cuisine", "items.name^2"],
                                    "fuzziness": "AUTO",
                                }
                            }
                        ]
                    }
                },
            }

            if user_location and "lat" in user_location and "lng" in user_location:
                body["query"]["bool"]["filter"] = [
                    {
                        "geo_distance": {
                            "distance": "15km",
                            "location": {
                                "lat": user_location["lat"],
                                "lon": user_location["lng"],
                            },
                        }
                    }
                ]

            response = self.client.search(index="restaurants*", body=body)
            hits = response.get("hits", {}).get("hits", [])
            for hit in hits:
                source = hit.get("_source", {})
                content_lines = [
                    f"Nhà hàng: {source.get('name', '')}",
                    f"Mô tả: {source.get('description', '')}",
                    f"Địa chỉ: {source.get('address', '')}",
                    f"Ẩm thực: {source.get('cuisine', '')}",
                ]
                results.append({
                    "source_type": "ELASTICSEARCH",
                    "source_ref": str(source.get("id", hit.get("_id"))),
                    "content": "\n".join(content_lines),
                    "score": float(hit.get("_score", 1.0)),
                })
        except (ConnectionError, ConnectionTimeout) as e:
            logger.warn("elasticsearch_connection_unreachable", error=str(e), query=query)
        except Exception as e:
            logger.warn("elasticsearch_search_failed", error=str(e), query=query)

        return results
