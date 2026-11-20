# 🤖 FoodDelivery AI Service — LangGraph & Gemini Intelligence Core

Dịch vụ AI thông minh ứng dụng kiến trúc **CRAG (Corrective RAG)** kết hợp **Google Gemini + OpenAI GPT-4o (Fallback)** và **pgvector / Elasticsearch**, đóng vai trò là "bộ não" xử lý ngữ cảnh cho AI Chatbox.

---

## 1. Cấu Hình Model & Biến Môi Trường (.env)

Tạo file `.env` trong thư mục `ai-python/` dựa trên `.env.example`:

```bash
cp .env.example .env
```

### Chi tiết các biến cấu hình:

| Biến Môi Trường | Mặc Định | Mô Tả |
|:---|:---|:---|
| `GEMINI_API_KEY` | *(Bắt buộc)* | API Key lấy từ [Google AI Studio](https://aistudio.google.com/) |
| `GEMINI_MODEL_FAST` | `gemini-1.5-flash` | Model tốc độ cao cho: phân loại Intent, chấm điểm relevance, viết lại truy vấn |
| `GEMINI_MODEL_QUALITY` | `gemini-1.5-pro` | Model chất lượng cao cho: tổng hợp câu trả lời cuối cùng |
| `GEMINI_EMBEDDING_MODEL`| `models/text-embedding-004` | Model vector embedding (768 chiều) cho pgvector |
| `OPENAI_API_KEY` | *(Tùy chọn)* | API Key OpenAI làm dự phòng (Fallback sang `gpt-4o` khi Gemini lỗi) |
| `TAVILY_API_KEY` | *(Tùy chọn)* | API Key tìm kiếm web dự phòng khi knowledge base thiếu thông tin |
| `LANGCHAIN_TRACING_V2` | `true` | Bật trace tự động lên LangSmith dashboard |
| `LANGSMITH_API_KEY` | *(Tùy chọn)* | Key theo dõi observability trên [LangSmith](https://smith.langchain.com/) |
| `POSTGRES_URI` | `postgresql://...` | Kết nối PostgreSQL với pgvector (`schema_ai`) |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Kết nối tìm kiếm nhà hàng & món ăn theo vị trí địa lý |
| `ORDER_SERVICE_URL` | `http://localhost:3004` | Tra cứu đơn hàng thời gian thực |
| `USER_SERVICE_URL` | `http://localhost:3001` | Tra cứu thông tin điểm thưởng người dùng |

---

## 2. Hướng Dẫn Chạy Service (How To Run)

### Cách 1: Chạy với Docker Compose (Khuyên Dùng)

Từ thư mục gốc dự án:
```bash
docker compose up -d ai-python ai-service
```
- Python Service lắng nghe tại: `http://localhost:8000`
- NestJS Orchestrator tại: `http://localhost:3008`
- API Docs (Swagger): `http://localhost:8000/docs`

---

### Cách 2: Chạy Độc Lập Bằng Terminal (Dev Mode)

#### Bước 1: Chuẩn bị môi trường Python (Python 3.11+)
```bash
cd ai-python

# Tạo virtualenv
python -m venv venv

# Kích hoạt virtualenv (Windows)
.\venv\Scripts\activate
# Hoặc trên Linux/macOS:
# source venv/bin/activate

# Cài đặt thư viện
pip install -r requirements.txt
```

#### Bước 2: Nạp dữ liệu tri thức vào PostgreSQL Vector Store
```bash
python -m app.knowledge.seed_runner
```
*(Script sẽ đọc các chính sách trong `knowledge-base/`, tính vector embedding và lưu vào bảng `schema_ai.m_knowledge_chunks`)*.

#### Bước 3: Khởi chạy FastAPI Server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 3. Luồng Hoạt Động (CRAG StateGraph Flow)

```
[User Query]
     │
     ▼
(1) classify_intent ──► Gemini Flash (9 Intents)
     │
     ▼
(2) retrieve ──────────► pgvector + Elasticsearch + Internal APIs
     │
     ▼
(3) grade_documents ──► Chấm điểm liên quan (Relevance Score)
     │
     ├── Score >= 0.75 ───────────┐
     │                            │
     └── Score < 0.75             │
          │                       │
          ▼                       ▼
     (4) rewrite_query       (5) generate (Gemini Pro)
          │                       │
          ▼                       ▼
     (4b) web_search ──► (5) (6) check_hallucination
                                  │
                             Grounded?
                             ├── YES ──► (7) Stream SSE Chunk về User
                             └── NO  ──► Thử rewrite lại (tối đa 2 lần)
```
