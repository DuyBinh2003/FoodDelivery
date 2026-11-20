# `[COMPLETED]` AI Chatbox — RAG + Gemini LLM Integration (Hybrid Architecture)

> **Task ID:** `ai-chatbox-rag-gemini`
> **Category:** `platform`
> **Actors:** Customer (chính), Driver, Partner (phụ)
> **Độ ưu tiên:** High — Trải nghiệm người dùng thế hệ mới
> **Ngày lập:** 2026-11-19 *(Revise: Chuyển sang Python LangGraph)*

---

## 1. Bối Cảnh & Vấn Đề (Context & Problem Statement)

### 1.1 Nhu Cầu Nghiệp Vụ

Người dùng hiện tại phải tìm kiếm thủ công, đọc menu từng trang, gọi hotline để được tư vấn món ăn, kiểm tra trạng thái đơn, hỏi chính sách hoàn tiền... Điều này gây ma sát lớn và tăng chi phí vận hành.

**Giải pháp đề xuất:** AI Chatbox với kiến trúc **CRAG (Corrective RAG)** kết hợp **Google Gemini + OpenAI GPT-4o** (multi-model), xây dựng trên **Python LangGraph** — framework mạnh mẽ nhất cho Agentic AI, có hệ sinh thái phong phú, dễ mở rộng về sau.

### 1.2 Lý Do Chọn Python LangGraph

| Tiêu chí | Python LangGraph | NestJS Thuần | LangChain.js |
|:---|:---:|:---:|:---:|
| **CRAG pattern** | ✅ Built-in StateGraph | ❌ Tự build | ⚠️ Experimental |
| **Multi-model switching** | ✅ 1 dòng code | ❌ Manual adapter | ✅ Có nhưng types yếu |
| **LangSmith observability** | ✅ Native | ❌ Không có | ✅ Partial |
| **Ecosystem AI** | ✅ ragas, spacy, faiss... | ❌ Không | ⚠️ Hạn chế |
| **Phát triển về sau** | ✅ Dễ thêm Agent/Tool | ❌ Rewrite nhiều | ⚠️ Breaking changes |
| **Stability** | ✅ Production-ready | ✅ | ⚠️ Thay đổi API thường |

### 1.3 Phạm Vi Nghiệp Vụ

| Khả năng | Mô tả | Actor |
|:---|:---|:---:|
| **Tư vấn món ăn** | Gợi ý theo khẩu vị, chế độ ăn, ngân sách | Customer |
| **Truy vấn đơn hàng** | "Đơn của tôi đang ở đâu?" → fetch real-time | Customer |
| **Hỏi đáp chính sách** | Hoàn tiền, hủy đơn, chương trình điểm thưởng | Customer |
| **Tìm nhà hàng & món** | Tích hợp Elasticsearch geo-search | Customer |
| **Hỗ trợ Driver** | Chính sách phạt, thu nhập, lộ trình | Driver |
| **Hỗ trợ Partner** | Hướng dẫn tạo menu, cài đặt giờ mở cửa | Partner |

### 1.4 Yêu Cầu Phi Chức Năng

- **Latency:** Streaming < 2s time-to-first-token
- **CRAG Quality:** Relevance score ≥ 0.75 trước khi generate, tự rewrite query nếu context yếu
- **Multi-model:** Gemini Flash (intent/classify) → Gemini Pro (generation) → OpenAI GPT-4o (fallback)
- **Observability:** LangSmith trace toàn bộ pipeline (latency, tokens, relevance score)
- **Bảo mật:** Authorization filter — user chỉ xem data của chính họ
- **Persistence:** Lịch sử hội thoại 30 ngày, tối đa 50 messages/session

---

## 2. Kiến Trúc Hệ Thống (Hybrid Architecture)

### 2.1 Tổng Quan

```mermaid
graph TD
    subgraph "Frontend (Next.js)"
        UI["💬 ChatBox Widget\nFloating Button"]
        SM["🗂️ useChatStore\n(Zustand)"]
    end

    subgraph "NGINX Gateway (:3000)"
        GW_AI["/api/v1/ai/*"]
    end

    subgraph "NestJS ai-service (:3008) — Thin Orchestrator"
        CTRL["ChatController\nSSE Streaming"]
        AUTH["JwtAuthGuard\nAuthorization"]
        RATE["RateLimiter\n(Redis 20msg/min)"]
        SESS["SessionService\n(Redis + PostgreSQL)"]
        PROXY["LangGraphClient\nHTTP Proxy"]
    end

    subgraph "Python LangGraph Service (:8000) — Intelligence Core"
        API["FastAPI\n/rag/query (stream)\n/rag/embed"]
        CRAG["CRAG StateGraph\n(LangGraph)"]
        IC["Intent Classifier\nGemini Flash"]
        RET["Context Retriever\nMulti-source"]
        GRD["Relevance Grader\nGemini Flash"]
        RWRITE["Query Rewriter\nGemini Flash"]
        GEN["Answer Generator\nGemini Pro / GPT-4o"]
        HALL["Hallucination Checker\nGemini Flash"]
        LS["LangSmith\nTracing & Eval"]
    end

    subgraph "Knowledge Sources"
        PGV["pgvector\n(schema_ai)\nFAQ + Policy embeddings"]
        ES["Elasticsearch\nMenu + Restaurant index"]
        IAPI["Internal APIs\norder-service:3004\nuser-service:3001"]
        WEB["Tavily Web Search\nCRAG fallback"]
    end

    subgraph "LLM Providers"
        GFLASH["Gemini 1.5 Flash\nIntent / Grade / Rewrite"]
        GPRO["Gemini 1.5 Pro\nAnswer Generation"]
        OAI["OpenAI GPT-4o\nFallback"]
        GEMBED["text-embedding-004\nVector Indexing"]
    end

    UI --> SM --> GW_AI --> CTRL
    CTRL --> AUTH --> RATE --> SESS
    SESS --> PROXY --> API
    API --> CRAG
    CRAG --> IC --> GFLASH
    CRAG --> RET --> PGV & ES & IAPI
    CRAG --> GRD --> GFLASH
    CRAG --> RWRITE --> GFLASH
    GRD -->|"Context yếu"| RWRITE
    RWRITE -->|"Fallback"| WEB
    CRAG --> GEN --> GPRO
    GEN -.->|"Fallback"| OAI
    CRAG --> HALL --> GFLASH
    CRAG --> LS
    PGV -.->|"Embed"| GEMBED
```

### 2.2 Phân Tách Trách Nhiệm

| Layer | Service | Trách nhiệm |
|:---|:---|:---|
| **Frontend** | Next.js | ChatBox UI, SSE client, Zustand state |
| **Orchestrator** | NestJS ai-service (:3008) | Auth, rate limit, session, SSE proxy, business rules |
| **Intelligence** | Python LangGraph (:8000) | CRAG pipeline, multi-model, observability |
| **Data** | pgvector + Elasticsearch | Vector search + full-text search |
| **LLM** | Gemini + OpenAI | Generation, classification, embedding |

### 2.3 CRAG StateGraph Flow

```mermaid
flowchart TD
    A["📥 User Query\n+ Context (userId, location, history)"] --> B["Intent Classify\nGemini Flash"]
    B --> C["Multi-source Retrieve\npgvector + ES + Internal APIs"]
    C --> D{"Grade Relevance\nGemini Flash\n≥ 0.75?"}
    D -->|"✅ Relevant"| E["Generate Answer\nGemini Pro"]
    D -->|"❌ Weak Context"| F["Rewrite Query\nGemini Flash"]
    F --> G["Web Search Fallback\nTavily API"]
    G --> E
    E --> H{"Hallucination Check\nGemini Flash\nGrounded?"}
    H -->|"✅ Grounded"| I["✅ Stream Response\n(SSE chunks)"]
    H -->|"❌ Hallucinated"| F
    I --> J["LangSmith Trace\nLog: tokens, latency, scores"]
```

### 2.4 Giao Tiếp NestJS ↔ Python

```
NestJS ai-service                     Python LangGraph
─────────────────                     ────────────────
POST /internal/rag/query  ──────────► FastAPI route handler
{                                      Nhận context đầy đủ
  userId: string,                      Chạy CRAG StateGraph
  userRole: string,                    Yield SSE chunks
  message: string,         ◄────────  text/event-stream
  sessionHistory: [...],
  userLocation: {...},
  authContext: {...}        # Authorization info
}

Response: text/event-stream
data: {"type":"chunk","content":"Dựa trên..."}
data: {"type":"chunk","content":"vị trí của bạn..."}
data: {"type":"done","intent":"MENU_RECOMMENDATION","tokensUsed":423}
data: {"type":"error","message":"..."}
```

---

## 3. Thiết Kế Database (Schema `schema_ai`)

### 3.1 Danh Sách Bảng

| Bảng | Loại | Mô tả |
|:---|:---:|:---|
| `m_chat_sessions` | Master | Phiên hội thoại của người dùng |
| `m_knowledge_chunks` | Master | Chunks văn bản + pgvector embeddings |
| `t_chat_messages` | Transaction | Tin nhắn trong session (user & assistant) |
| `t_chat_feedback` | Transaction | Đánh giá câu trả lời (👍/👎) |

### 3.2 DDL Chi Tiết

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- m_chat_sessions
CREATE TABLE schema_ai.m_chat_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL,
    user_role     VARCHAR(20) NOT NULL,   -- 'CUSTOMER' | 'DRIVER' | 'PARTNER'
    title         VARCHAR(255),           -- Auto-generated từ first message
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    expires_at    TIMESTAMPTZ            -- NOW() + INTERVAL '30 days'
);

-- t_chat_messages
CREATE TABLE schema_ai.t_chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES schema_ai.m_chat_sessions(id) ON DELETE CASCADE,
    role            VARCHAR(10) NOT NULL,   -- 'user' | 'assistant'
    content         TEXT NOT NULL,
    intent          VARCHAR(50),           -- 'MENU_RECOMMENDATION' | 'ORDER_STATUS' | ...
    model_used      VARCHAR(50),           -- 'gemini-1.5-pro' | 'gpt-4o'
    context_sources JSONB,                 -- Danh sách sources được retrieve
    relevance_score FLOAT,                 -- CRAG grader score
    tokens_used     INTEGER,
    latency_ms      INTEGER,
    langsmith_run_id VARCHAR(100),         -- Link trace về LangSmith
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- m_knowledge_chunks
CREATE TABLE schema_ai.m_knowledge_chunks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type  VARCHAR(30) NOT NULL,  -- 'POLICY' | 'FAQ' | 'GUIDE'
    source_ref   VARCHAR(100),
    content      TEXT NOT NULL,
    embedding    vector(768),           -- text-embedding-004 (768 dims)
    metadata     JSONB,                 -- { "language":"vi", "category":"refund" }
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index HNSW cho cosine similarity search
CREATE INDEX idx_knowledge_embedding
    ON schema_ai.m_knowledge_chunks
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- t_chat_feedback
CREATE TABLE schema_ai.t_chat_feedback (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES schema_ai.t_chat_messages(id),
    rating     SMALLINT NOT NULL CHECK (rating IN (1, -1)),
    comment    TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. API Contracts

### 4.1 Public APIs — NestJS ai-service (qua Gateway)

| Endpoint | Method | Auth | Mô tả |
|:---|:---:|:---:|:---|
| `POST /api/v1/ai/chat` | POST | `JwtAuthGuard` | Gửi message, nhận SSE stream |
| `GET /api/v1/ai/sessions` | GET | `JwtAuthGuard` | Danh sách sessions (phân trang) |
| `GET /api/v1/ai/sessions/:id/messages` | GET | `JwtAuthGuard` | Lịch sử messages |
| `DELETE /api/v1/ai/sessions/:id` | DELETE | `JwtAuthGuard` | Xóa session |
| `POST /api/v1/ai/messages/:id/feedback` | POST | `JwtAuthGuard` | Gửi feedback 👍/👎 |

### 4.2 Internal APIs — Python LangGraph (chỉ NestJS gọi)

| Endpoint | Method | Mô tả |
|:---|:---:|:---|
| `POST /internal/rag/query` | POST | Chạy CRAG pipeline, trả SSE stream |
| `POST /internal/rag/embed` | POST | Embed và index knowledge chunks |
| `GET /internal/rag/health` | GET | Health check |

### 4.3 DTO

```typescript
// NestJS — ChatRequestDto
interface ChatRequestDto {
  sessionId?: string;        // null → tạo session mới
  message: string;           // max 2000 chars
  userLocation?: {
    lat: number;
    lng: number;
  };
}

// SSE Event Format
// data: {"type":"chunk","content":"Tôi gợi ý..."}
// data: {"type":"done","sessionId":"uuid","messageId":"uuid","intent":"MENU_RECOMMENDATION","tokensUsed":423}
// data: {"type":"error","message":"Lỗi kết nối LLM"}
```

```python
# Python FastAPI — RagQueryRequest
class RagQueryRequest(BaseModel):
    user_id: str
    user_role: str              # 'CUSTOMER' | 'DRIVER' | 'PARTNER'
    message: str
    session_history: list[dict] # [{"role":"user","content":"..."}]
    user_location: dict | None  # {"lat": 10.78, "lng": 106.69}
    auth_context: dict          # Thông tin để filter data theo user
```

### 4.4 Intent Enum

```python
class ChatIntent(str, Enum):
    MENU_RECOMMENDATION = "MENU_RECOMMENDATION"
    ORDER_STATUS        = "ORDER_STATUS"
    REFUND_POLICY       = "REFUND_POLICY"
    RESTAURANT_SEARCH   = "RESTAURANT_SEARCH"
    LOYALTY_PROGRAM     = "LOYALTY_PROGRAM"
    DELIVERY_SUPPORT    = "DELIVERY_SUPPORT"
    PARTNER_SUPPORT     = "PARTNER_SUPPORT"
    GENERAL_CHITCHAT    = "GENERAL_CHITCHAT"
    OUT_OF_SCOPE        = "OUT_OF_SCOPE"
```

---

## 5. Cấu Trúc Source Code

### 5.1 NestJS ai-service (Thin Orchestrator)

```
backend/apps/ai-service/
├── src/
│   ├── main.ts
│   ├── ai-service.module.ts
│   └── modules/
│       ├── chat/
│       │   ├── chat.module.ts
│       │   ├── chat.controller.ts          # SSE endpoint
│       │   ├── dto/
│       │   │   ├── chat-request.dto.ts
│       │   │   └── feedback.dto.ts
│       │   ├── services/
│       │   │   ├── chat.service.ts          # Điều phối NestJS logic
│       │   │   ├── session.service.ts       # Redis + PostgreSQL session
│       │   │   ├── langgraph-client.service.ts  # HTTP client → Python
│       │   │   └── rate-limit.service.ts    # Redis INCR rate limiting
│       │   ├── entities/
│       │   │   ├── chat-session.entity.ts
│       │   │   └── chat-message.entity.ts
│       │   └── tests/
│       │       ├── chat.service.spec.ts
│       │       ├── session.service.spec.ts
│       │       └── langgraph-client.service.spec.ts
│       └── knowledge/
│           ├── knowledge.module.ts
│           ├── knowledge.controller.ts      # Admin: trigger re-embed
│           └── tests/
│               └── knowledge.controller.spec.ts
```

### 5.2 Python LangGraph Service (Intelligence Core)

```
ai-python/
├── Dockerfile
├── requirements.txt
├── .env.example
├── main.py                          # FastAPI app entrypoint
├── app/
│   ├── api/
│   │   └── routes.py                # FastAPI routes
│   ├── graph/
│   │   ├── crag_graph.py            # LangGraph StateGraph definition
│   │   ├── state.py                 # GraphState TypedDict
│   │   └── nodes/
│   │       ├── intent_classifier.py  # Node: phân loại intent
│   │       ├── retriever.py          # Node: multi-source retrieval
│   │       ├── relevance_grader.py   # Node: grade context quality
│   │       ├── query_rewriter.py     # Node: rewrite yếu query
│   │       ├── web_search.py         # Node: Tavily fallback
│   │       ├── answer_generator.py   # Node: generate + stream
│   │       └── hallucination_checker.py # Node: check groundedness
│   ├── retrievers/
│   │   ├── pgvector_retriever.py     # pgvector cosine search
│   │   ├── elasticsearch_retriever.py # ES geo-search
│   │   └── internal_api_retriever.py  # Gọi order/user service
│   ├── models/
│   │   └── llm_factory.py            # Multi-model: Gemini + OpenAI
│   ├── prompts/
│   │   ├── system_prompt.py
│   │   ├── grader_prompt.py
│   │   └── rewriter_prompt.py
│   └── knowledge/
│       ├── embedder.py               # Chunk + embed text files
│       └── seed_runner.py            # Script seed knowledge base
├── knowledge-base/
│   ├── policies/
│   │   ├── refund-policy.md
│   │   └── cancellation-policy.md
│   └── faq/
│       ├── loyalty-program-faq.md
│       └── general-faq.md
└── tests/
    ├── test_crag_graph.py
    ├── test_retrievers.py
    └── test_graders.py
```

---

## 6. Triển Khai Chi Tiết CRAG (Python LangGraph)

### 6.1 GraphState

```python
# app/graph/state.py
from typing import TypedDict, Annotated
from langgraph.graph.message import add_messages

class GraphState(TypedDict):
    # Input
    user_id: str
    user_role: str
    question: str
    user_location: dict | None
    auth_context: dict
    session_history: list[dict]

    # Pipeline state
    intent: str
    documents: list[dict]           # Retrieved context docs
    relevance_score: float          # CRAG grader output
    web_search_needed: bool
    rewritten_question: str | None

    # Output
    generation: str                 # Final answer
    model_used: str                 # Which LLM generated
    tokens_used: int
    sources_used: list[str]         # Danh sách sources
```

### 6.2 Multi-model Factory

```python
# app/models/llm_factory.py
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

class LLMFactory:
    @staticmethod
    def get_fast() -> ChatGoogleGenerativeAI:
        """gemini-1.5-flash: Intent classify, grading, rewriting"""
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            temperature=0,
            streaming=True
        )

    @staticmethod
    def get_quality() -> ChatGoogleGenerativeAI:
        """gemini-1.5-pro: Answer generation (default)"""
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-pro",
            temperature=0.3,
            streaming=True
        )

    @staticmethod
    def get_fallback() -> ChatOpenAI:
        """gpt-4o: Fallback khi Gemini lỗi hoặc context rất phức tạp"""
        return ChatOpenAI(
            model="gpt-4o",
            temperature=0.3,
            streaming=True
        )
```

### 6.3 CRAG Graph Definition

```python
# app/graph/crag_graph.py
from langgraph.graph import StateGraph, END

def build_crag_graph() -> CompiledGraph:
    workflow = StateGraph(GraphState)

    # Nodes
    workflow.add_node("classify_intent",    classify_intent_node)
    workflow.add_node("retrieve",           retrieve_node)
    workflow.add_node("grade_documents",    grade_documents_node)
    workflow.add_node("rewrite_query",      rewrite_query_node)
    workflow.add_node("web_search",         web_search_node)
    workflow.add_node("generate",           generate_node)
    workflow.add_node("check_hallucination",check_hallucination_node)

    # Edges
    workflow.set_entry_point("classify_intent")
    workflow.add_edge("classify_intent", "retrieve")
    workflow.add_edge("retrieve", "grade_documents")

    # Conditional: context đủ tốt?
    workflow.add_conditional_edges(
        "grade_documents",
        decide_after_grading,
        {
            "generate":      "generate",       # Context đủ → generate ngay
            "rewrite_query": "rewrite_query",  # Context yếu → rewrite
        }
    )

    workflow.add_edge("rewrite_query", "web_search")
    workflow.add_edge("web_search", "generate")

    # Conditional: có hallucinate không?
    workflow.add_conditional_edges(
        "check_hallucination",
        decide_after_hallucination_check,
        {
            "done":          END,              # Groundd → trả kết quả
            "rewrite_query": "rewrite_query",  # Hallucinated → rewrite lại
        }
    )

    workflow.add_edge("generate", "check_hallucination")

    return workflow.compile()
```

### 6.4 System Prompt

```python
# app/prompts/system_prompt.py
SYSTEM_PROMPT = """
Bạn là FoodBot — trợ lý AI thông minh của nền tảng Food Delivery.

**Vai trò:**
- Tư vấn món ăn và nhà hàng dựa trên sở thích người dùng
- Trả lời câu hỏi về đơn hàng, chính sách, điểm thưởng
- Hỗ trợ tài xế và đối tác nhà hàng

**QUY TẮC BẮT BUỘC:**
1. CHỈ trả lời dựa trên [CONTEXT] bên dưới
2. Nếu context không có thông tin → nói: "Tôi chưa có thông tin cụ thể về điều này"
3. KHÔNG bịa tên quán, món ăn, giá cả, địa chỉ
4. Tiếng Việt, thân thiện, ngắn gọn (tối đa 300 từ)
5. Với đơn hàng: hiển thị trạng thái thực tế từ hệ thống

**Người dùng:** {user_role} | {user_name}
**Vị trí:** {user_location}
**Thời gian:** {current_time}

[CONTEXT]
{retrieved_context}
[/CONTEXT]

[LỊCH SỬ HỘI THOẠI]
{chat_history}
[/LỊCH SỬ HỘI THOẠI]
"""
```

---

## 7. Cấu Hình Docker & Infrastructure

### 7.1 docker-compose.yml (bổ sung)

```yaml
services:
  # === AI Python LangGraph Service ===
  ai-python:
    build:
      context: ./ai-python
      dockerfile: Dockerfile
    container_name: food_ai_python
    ports:
      - "8000:8000"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - TAVILY_API_KEY=${TAVILY_API_KEY}
      - LANGCHAIN_TRACING_V2=true
      - LANGCHAIN_API_KEY=${LANGSMITH_API_KEY}
      - LANGCHAIN_PROJECT=food-delivery-chatbox
      - POSTGRES_URI=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/food_delivery
      - ELASTICSEARCH_URL=http://elasticsearch:9200
      - ORDER_SERVICE_URL=http://order-service:3004
      - USER_SERVICE_URL=http://user-service:3001
    depends_on:
      - postgres
      - elasticsearch
      - redis
    networks:
      - food_delivery_network

  # === NestJS AI Orchestrator Service ===
  ai-service:
    build:
      context: ./backend
      dockerfile: apps/ai-service/Dockerfile
    container_name: food_ai_service
    ports:
      - "3008:3008"
    environment:
      - AI_SERVICE_PORT=3008
      - LANGGRAPH_SERVICE_URL=http://ai-python:8000
      - REDIS_URL=redis://redis:6379
      - POSTGRES_URI=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/food_delivery
      - JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
      - CHAT_RATE_LIMIT_PER_MINUTE=20
      - CHAT_SESSION_TTL_DAYS=30
    depends_on:
      - postgres
      - redis
      - ai-python
    networks:
      - food_delivery_network
```

### 7.2 Python Dockerfile

```dockerfile
# ai-python/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s \
    CMD curl -f http://localhost:8000/internal/rag/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
```

### 7.3 requirements.txt

```txt
# LangChain ecosystem
langchain==0.3.*
langchain-google-genai==2.*
langchain-openai==0.2.*
langgraph==0.2.*
langchain-community==0.3.*
langsmith==0.1.*

# Web framework
fastapi==0.115.*
uvicorn[standard]==0.32.*
pydantic==2.*

# Vector store
psycopg2-binary==2.9.*
pgvector==0.3.*

# Elasticsearch
elasticsearch==8.*

# Web search fallback
tavily-python==0.5.*

# Utilities
httpx==0.27.*           # Gọi internal services
python-dotenv==1.0.*
structlog==24.*         # Structured logging
```

---

## 8. Môi Trường (Environment Variables)

### 8.1 `.env.example` — Bổ sung

```env
# ============================================================
# AI Service — NestJS Orchestrator (:3008)
# ============================================================
AI_SERVICE_PORT=3008
LANGGRAPH_SERVICE_URL=http://localhost:8000    # Docker: http://ai-python:8000
CHAT_SESSION_TTL_DAYS=30
CHAT_MAX_HISTORY_MESSAGES=20
CHAT_RATE_LIMIT_PER_MINUTE=20

# ============================================================
# AI Python — LangGraph Intelligence Core (:8000)
# ============================================================

# Google Gemini (BẮT BUỘC — Fail-Fast nếu thiếu)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_FAST=gemini-1.5-flash
GEMINI_MODEL_QUALITY=gemini-1.5-pro
GEMINI_EMBEDDING_MODEL=text-embedding-004

# OpenAI (Fallback)
OPENAI_API_KEY=your_openai_api_key_here

# LangSmith Observability (BẮT BUỘC cho dev)
LANGCHAIN_TRACING_V2=true
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGCHAIN_PROJECT=food-delivery-chatbox

# Tavily Web Search (CRAG fallback)
TAVILY_API_KEY=your_tavily_api_key_here

# RAG Configuration
RAG_TOP_K=5
RAG_SIMILARITY_THRESHOLD=0.75
RAG_MAX_REWRITE_ATTEMPTS=2
```

### 8.2 Hướng Dẫn Vận Hành & Khởi Chạy Service AI (How-To-Run & Model Configuration)

#### A. Vị trí cấu hình Model
1. **File môi trường**:
   - `ai-python/.env` (tạo từ [ai-python/.env.example](file:///d:/code/FoodDelivery/ai-python/.env.example))
   - Root [.env.example](file:///d:/code/FoodDelivery/.env.example) (cho Docker Compose)
2. **File khởi tạo Model trong mã nguồn**:
   - [ai-python/app/models/llm_factory.py](file:///d:/code/FoodDelivery/ai-python/app/models/llm_factory.py)
     - `get_fast()`: Sử dụng `GEMINI_MODEL_FAST` (mặc định: `gemini-1.5-flash`, temperature = 0) để phân loại Intent, chấm điểm relevance và rewrite query.
     - `get_quality()`: Sử dụng `GEMINI_MODEL_QUALITY` (mặc định: `gemini-1.5-pro`, temperature = 0.3) để sinh câu trả lời giàu ngữ cảnh.
     - `get_fallback()`: Tự động fallback sang `gpt-4o` qua `OPENAI_API_KEY` nếu Gemini gặp sự cố mạng hoặc quota limit.
     - `get_embeddings()`: Sử dụng `models/text-embedding-004` để tạo vector 768 chiều nạp vào pgvector.

#### B. Cách khởi chạy Service AI

##### Cách 1: Chạy bằng Docker Compose (Khuyên dùng)
```bash
# Khởi động toàn bộ container (PostgreSQL pgvector, Redis, Elasticsearch, ai-python, ai-service)
docker compose up -d ai-python ai-service
```
- API Docs Swagger: `http://localhost:8000/docs`
- NestJS Orchestrator: `http://localhost:3008`
- Healthcheck: `http://localhost:8000/internal/rag/health`

##### Cách 2: Chạy cục bộ từng phần (Dev Mode)
1. **Nạp tri thức vào pgvector (chạy 1 lần ban đầu hoặc khi cập nhật tài liệu)**:
   ```bash
   cd ai-python
   python -m venv venv
   .\venv\Scripts\activate      # Trên Windows
   pip install -r requirements.txt
   python -m app.knowledge.seed_runner
   ```
2. **Khởi chạy Python LangGraph Core (:8000)**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
3. **Khởi chạy NestJS ai-service (:3008)**:
   ```bash
   cd backend
   npm run start:ai
   ```
4. **Khởi chạy Frontend Next.js (:3000)**:
   ```bash
   cd frontend
   npm run dev
   ```

---

## 9. Kế Hoạch Triển Khai (Implementation Checklist)

### Phase 1 — Hạ Tầng & Setup

- [ ] **P1.1** Tạo thư mục `ai-python/` tại root dự án, init FastAPI + LangGraph project
- [ ] **P1.2** Tạo NestJS app `ai-service` tại `backend/apps/ai-service/`
- [ ] **P1.3** Thêm `pgvector` extension vào PostgreSQL init script
- [ ] **P1.4** Tạo migration `schema_ai` (4 bảng + HNSW index)
- [ ] **P1.5** Cập nhật `docker-compose.yml`: thêm `ai-python` (:8000) + `ai-service` (:3008)
- [ ] **P1.6** Cập nhật NGINX gateway: proxy `/api/v1/ai/*` → `ai-service:3008`
- [ ] **P1.7** Cập nhật `.env.example` với 12 biến mới
- [ ] **P1.8** `LLMFactory` với Fail-Fast validation cho API keys

### Phase 2 — Python LangGraph CRAG Pipeline

- [ ] **P2.1** `GraphState` TypedDict definition
- [ ] **P2.2** Node `classify_intent`: Gemini Flash phân loại 9 intents
- [ ] **P2.3** Node `retrieve`: Multi-source retrieval theo intent
  - `pgvector_retriever.py`: cosine similarity search
  - `elasticsearch_retriever.py`: geo-search + text match
  - `internal_api_retriever.py`: gọi order-service + user-service
- [ ] **P2.4** Node `grade_documents`: Relevance grader với Gemini Flash (score 0-1)
- [ ] **P2.5** Node `rewrite_query`: Query rewriter khi context yếu
- [ ] **P2.6** Node `web_search`: Tavily fallback search
- [ ] **P2.7** Node `generate`: Answer generator với streaming (Gemini Pro → GPT-4o fallback)
- [ ] **P2.8** Node `check_hallucination`: Groundedness checker
- [ ] **P2.9** `build_crag_graph()`: Wiring toàn bộ nodes + conditional edges
- [ ] **P2.10** FastAPI `/internal/rag/query` endpoint (SSE streaming)
- [ ] **P2.11** LangSmith tracing tự động (set env vars)

### Phase 3 — NestJS Orchestrator

- [ ] **P3.1** `LangGraphClientService`: HTTP client gọi Python service, pipe SSE stream
- [ ] **P3.2** `SessionService`: Redis HASH lưu history, PostgreSQL persist messages
- [ ] **P3.3** `RateLimitService`: Redis INCR + TTL 60s
- [ ] **P3.4** `ChatController`: SSE endpoint `/api/v1/ai/chat`, JWT guard
- [ ] **P3.5** CRUD endpoints: sessions, messages, feedback

### Phase 4 — Knowledge Base

- [ ] **P4.1** Tạo thư mục `ai-python/knowledge-base/` với 4 file `.md`
- [ ] **P4.2** `embedder.py`: chunk văn bản (500 tokens overlap 50) → `text-embedding-004` → pgvector
- [ ] **P4.3** `seed_runner.py`: script chạy 1 lần để embed toàn bộ knowledge
- [ ] **P4.4** FastAPI `/internal/rag/embed` endpoint (re-embed khi update policies)

### Phase 5 — Frontend ChatBox

- [ ] **P5.1** `ChatButton` component (floating, bottom-right, pulse animation)
- [ ] **P5.2** `ChatPanel` (slide-up drawer mobile, side panel 380px desktop)
- [ ] **P5.3** `ChatMessage` component (render Markdown, typing dots animation)
- [ ] **P5.4** Hook `useChatStream()`: SSE client, append tokens, error handling
- [ ] **P5.5** Zustand store `useChatStore`: sessions, messages, loading
- [ ] **P5.6** `chatApi.ts`: API layer tại `src/lib/api/`
- [ ] **P5.7** Feedback UI: 👍/👎 sau mỗi response
- [ ] **P5.8** Session history panel (danh sách cuộc hội thoại cũ)

---

## 10. Kịch Bản Kiểm Thử 3 Nhánh

### 10.1 Happy Path ✅

| TC | Input | Expected |
|:---|:---|:---|
| TC-HP-01 | "Gợi ý món bún bò ngon gần quận 1" | Intent: `MENU_RECOMMENDATION`, ES geo-search, relevance ≥ 0.75, stream response |
| TC-HP-02 | "Đơn #ABC của tôi đang ở đâu?" | Intent: `ORDER_STATUS`, internal API fetch, trả trạng thái thực |
| TC-HP-03 | "Điểm thưởng của tôi là bao nhiêu?" | Intent: `LOYALTY_PROGRAM`, user-service API, số điểm chính xác |
| TC-HP-04 | Tin nhắn thứ 2 cùng session | Load history Redis, context-aware response |
| TC-HP-05 | Gửi feedback 👍 | Ghi `t_chat_feedback`, response 201 |
| TC-HP-06 | CRAG rewrite: câu hỏi mơ hồ | Query rewritten → web search → relevant answer |

### 10.2 Edge Cases ⚠️

| TC | Điều kiện | Expected |
|:---|:---|:---|
| TC-EC-01 | Message > 2000 chars | DTO validate → 400, không gọi Python |
| TC-EC-02 | Câu hỏi ngoài phạm vi ("Thời tiết?") | Intent: `OUT_OF_SCOPE`, từ chối lịch sự |
| TC-EC-03 | Hỏi đơn của người khác | Auth filter → không trả data, "không tìm thấy đơn" |
| TC-EC-04 | CRAG loop: hallucinate liên tục | Dừng sau `RAG_MAX_REWRITE_ATTEMPTS=2`, fallback answer |
| TC-EC-05 | Vector search 0 kết quả | Fallback sang web search, không crash |
| TC-EC-06 | Rate limit: > 20 msg/phút | 429 + `Retry-After` header |

### 10.3 Error / Rejection Flow ❌

| TC | Lỗi | Expected |
|:---|:---|:---|
| TC-ER-01 | `GEMINI_API_KEY` thiếu | Python service Fail-Fast khi start, log ERROR |
| TC-ER-02 | Gemini timeout > 10s | Fallback GPT-4o, nếu cũng fail → SSE `{"type":"error"}` |
| TC-ER-03 | Python service unreachable | NestJS catch → SSE error, log ERROR, không crash |
| TC-ER-04 | Elasticsearch down | `RESTAURANT_SEARCH` fallback pgvector only, log WARN |
| TC-ER-05 | order-service unreachable | "Không thể kiểm tra đơn lúc này", log WARN |
| TC-ER-06 | Redis session down | Stateless mode (không có history), log WARN, tiếp tục |

---

## 11. Đồng Bộ Tài Liệu Cần Cập Nhật

Sau khi plan duyệt và triển khai xong:

- [ ] `docs/services/ai-service.md` — Tạo mới (NestJS Orchestrator spec)
- [ ] `docs/services/README.md` — Thêm `ai-service` (:3008)
- [ ] `docs/architecture/system-architecture.md` — Thêm `ai-service` + `ai-python` vào sơ đồ
- [ ] `docs/features/customer/ai-chatbox.md` — Tạo mới (Feature flow spec)
- [ ] `docs/architecture/README.md` — Thêm link tài liệu AI/RAG architecture
- [ ] `README.md` (root) — Thêm vào sơ đồ ASCII, tech stack (LangGraph, Gemini), lịch sử triển khai
- [ ] `docs/plans/README.md` — Cập nhật trạng thái `[DRAFT]` → `[APPROVED]`
