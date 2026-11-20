import os
import psycopg2
import structlog
from typing import Any
from app.models.llm_factory import LLMFactory

logger = structlog.get_logger(__name__)

class PgVectorRetriever:
    def __init__(self) -> None:
        postgres_uri = os.getenv("POSTGRES_URI")
        if not postgres_uri:
            raise ValueError(
                "CRITICAL: POSTGRES_URI environment variable is missing. "
                "PgVectorRetriever cannot operate without database connection."
            )
        self.postgres_uri = postgres_uri
        self.similarity_threshold = float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.70"))
        self.top_k = int(os.getenv("RAG_TOP_K", "5"))

    def retrieve(self, query: str) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        try:
            embedder = LLMFactory.get_embeddings()
            query_embedding = embedder.embed_query(query)
            embedding_str = "[" + ",".join(map(str, query_embedding)) + "]"

            conn = psycopg2.connect(self.postgres_uri)
            try:
                with conn.cursor() as cur:
                    sql = """
                        SELECT id, source_type, source_ref, content,
                               1 - (embedding <=> %s::vector) AS similarity
                        FROM schema_ai.m_knowledge_chunks
                        WHERE embedding IS NOT NULL
                          AND 1 - (embedding <=> %s::vector) >= %s
                        ORDER BY similarity DESC
                        LIMIT %s;
                    """
                    cur.execute(sql, (embedding_str, embedding_str, self.similarity_threshold, self.top_k))
                    rows = cur.fetchall()
                    for row in rows:
                        results.append({
                            "source_type": row[1],
                            "source_ref": row[2],
                            "content": row[3],
                            "score": float(row[4]),
                        })
            finally:
                conn.close()
        except Exception as e:
            logger.warn("pgvector_retrieval_failed", error=str(e), query=query)
        return results
