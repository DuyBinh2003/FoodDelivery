import os
from typing import Any
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_openai import ChatOpenAI

class LLMFactory:
    @staticmethod
    def validate_keys() -> None:
        """Fail-Fast validation for required API keys."""
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key or gemini_key == "your_gemini_api_key_here":
            raise ValueError(
                "CRITICAL: GEMINI_API_KEY is missing or invalid in environment. "
                "AI service cannot start without Google Gemini credentials."
            )

    @staticmethod
    def extract_text(content: Any) -> str:
        """Helper to extract clean text from LLM response.content across providers."""
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, dict) and "text" in item:
                    parts.append(str(item["text"]))
                elif hasattr(item, "text"):
                    parts.append(str(item.text))
                elif isinstance(item, str):
                    parts.append(item)
                else:
                    parts.append(str(item))
            return "".join(parts)
        return str(content)

    @staticmethod
    def get_fast() -> ChatGoogleGenerativeAI:
        """gemini-3.1-flash-lite: Used for intent classification, grading, rewriting."""
        api_key = os.getenv("GEMINI_API_KEY")
        model = os.getenv("GEMINI_MODEL_FAST", "gemini-3.1-flash-lite")
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0,
            streaming=True,
        )

    @staticmethod
    def get_quality() -> ChatGoogleGenerativeAI:
        """gemini-3.5-flash: Answer generation (primary)."""
        api_key = os.getenv("GEMINI_API_KEY")
        model = os.getenv("GEMINI_MODEL_QUALITY", "gemini-3.5-flash")
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=api_key,
            temperature=0.3,
            streaming=True,
        )

    @staticmethod
    def get_fallback() -> ChatOpenAI | None:
        """gpt-4o: Fallback when Gemini is unavailable or errors out."""
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key or api_key == "your_openai_api_key_here":
            return None
        return ChatOpenAI(
            model="gpt-4o",
            api_key=api_key,
            temperature=0.3,
            streaming=True,
        )

    @staticmethod
    def get_embeddings() -> GoogleGenerativeAIEmbeddings:
        """Embedding model for pgvector knowledge chunks."""
        api_key = os.getenv("GEMINI_API_KEY")
        model = os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001")
        return GoogleGenerativeAIEmbeddings(
            model=model,
            google_api_key=api_key,
            output_dimensionality=768,
        )
