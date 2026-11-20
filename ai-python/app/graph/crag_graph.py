from langgraph.graph import StateGraph, END
from langgraph.graph.state import CompiledStateGraph
from app.graph.state import GraphState
from app.graph.nodes.intent_classifier import classify_intent_node
from app.graph.nodes.retriever import retrieve_node
from app.graph.nodes.relevance_grader import grade_documents_node
from app.graph.nodes.query_rewriter import rewrite_query_node
from app.graph.nodes.web_search import web_search_node
from app.graph.nodes.answer_generator import generate_node
from app.graph.nodes.hallucination_checker import check_hallucination_node

def decide_after_grading(state: GraphState) -> str:
    score = state.get("relevance_score", 0.8)
    rewrite_count = state.get("rewrite_count", 0)

    # Nếu tài liệu đạt chuẩn hoặc đã thử rewrite tối đa 2 lần -> sinh câu trả lời
    if score >= 0.75 or rewrite_count >= 2:
        return "generate"
    return "rewrite_query"

def decide_after_hallucination(state: GraphState) -> str:
    hallucinated = state.get("hallucination_detected", False)
    rewrite_count = state.get("rewrite_count", 0)

    # Nếu phát hiện bịa đặt và chưa quá số lần rewrite -> rewrite lại
    if hallucinated and rewrite_count < 2:
        return "rewrite_query"
    return "done"

def build_crag_graph() -> CompiledStateGraph:
    workflow = StateGraph(GraphState)

    # Add Nodes
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("grade_documents", grade_documents_node)
    workflow.add_node("rewrite_query", rewrite_query_node)
    workflow.add_node("web_search", web_search_node)
    workflow.add_node("generate", generate_node)
    workflow.add_node("check_hallucination", check_hallucination_node)

    # Connect Edges
    workflow.set_entry_point("classify_intent")
    workflow.add_edge("classify_intent", "retrieve")
    workflow.add_edge("retrieve", "grade_documents")

    # Conditional after grading
    workflow.add_conditional_edges(
        "grade_documents",
        decide_after_grading,
        {
            "generate": "generate",
            "rewrite_query": "rewrite_query",
        },
    )

    workflow.add_edge("rewrite_query", "web_search")
    workflow.add_edge("web_search", "generate")
    workflow.add_edge("generate", "check_hallucination")

    # Conditional after hallucination check
    workflow.add_conditional_edges(
        "check_hallucination",
        decide_after_hallucination,
        {
            "done": END,
            "rewrite_query": "rewrite_query",
        },
    )

    return workflow.compile()
