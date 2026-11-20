import sys
import os

# Ensure current working directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dotenv import load_dotenv
load_dotenv()

from app.models.llm_factory import LLMFactory
from app.knowledge.embedder import KnowledgeEmbedder

def main():
    print("=== FoodDelivery AI — Seeding Knowledge Base ===")
    try:
        LLMFactory.validate_keys()
        embedder = KnowledgeEmbedder()
        base_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "knowledge-base")
        count = embedder.embed_and_save_all(base_dir=base_dir)
        print(f"✅ Thành công! Đã tạo và lưu {count} knowledge chunks vào schema_ai.m_knowledge_chunks")
    except Exception as e:
        print(f"❌ Thất bại: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
