from typing import TypedDict, Any

class GraphState(TypedDict):
    # Input
    user_id: str
    user_role: str
    question: str
    user_location: dict[str, float] | None
    auth_context: dict[str, Any]
    session_history: list[dict[str, str]]

    # Pipeline State
    intent: str
    documents: list[dict[str, Any]]
    relevance_score: float
    web_search_needed: bool
    rewritten_question: str | None
    rewrite_count: int

    # Output
    generation: str
    model_used: str
    tokens_used: int
    sources_used: list[str]
    langsmith_run_id: str | None
