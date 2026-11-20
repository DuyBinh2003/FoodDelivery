import os
import glob
import psycopg2
import structlog
from app.models.llm_factory import LLMFactory

logger = structlog.get_logger(__name__)

class KnowledgeEmbedder:
    def __init__(self) -> None:
        postgres_uri = os.getenv("POSTGRES_URI")
        if not postgres_uri:
            raise ValueError(
                "CRITICAL: POSTGRES_URI environment variable is missing. "
                "KnowledgeEmbedder cannot operate without database connection."
            )
        self.postgres_uri = postgres_uri

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
        words = text.split()
        chunks: list[str] = []
        if not words:
            return chunks

        start = 0
        while start < len(words):
            end = min(start + chunk_size, len(words))
            chunk = " ".join(words[start:end])
            chunks.append(chunk)
            if end == len(words):
                break
            start += chunk_size - overlap
        return chunks

    def embed_and_save_all(self, base_dir: str = "knowledge-base") -> int:
        embedder = LLMFactory.get_embeddings()
        files = glob.glob(f"{base_dir}/**/*.md", recursive=True)
        total_inserted = 0

        conn = psycopg2.connect(self.postgres_uri)
        try:
            with conn.cursor() as cur:
                # Clear previous knowledge chunks for fresh indexing
                cur.execute("DELETE FROM schema_ai.m_knowledge_chunks;")

                for file_path in files:
                    source_ref = os.path.basename(file_path)
                    source_type = "POLICY" if "policies" in file_path else "FAQ"

                    with open(file_path, "r", encoding="utf-8") as f:
                        raw_content = f.read()

                    chunks = self.chunk_text(raw_content)
                    for chunk in chunks:
                        if not chunk.strip():
                            continue
                        vector = embedder.embed_query(chunk)
                        vector_str = "[" + ",".join(map(str, vector)) + "]"

                        insert_sql = """
                            INSERT INTO schema_ai.m_knowledge_chunks
                            (source_type, source_ref, content, embedding, metadata)
                            VALUES (%s, %s, %s, %s::vector, %s);
                        """
                        cur.execute(
                            insert_sql,
                            (source_type, source_ref, chunk, vector_str, '{"language": "vi"}'),
                        )
                        total_inserted += 1

                conn.commit()
                logger.info("knowledge_embed_success", total_chunks=total_inserted)
        finally:
            conn.close()

        return total_inserted
