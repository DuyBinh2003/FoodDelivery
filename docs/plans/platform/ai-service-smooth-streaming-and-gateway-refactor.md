# `[COMPLETED]` Kế Hoạch Refactor AI Service: Streaming Mượt Mà, Observability & Chuẩn Hóa NGINX Gateway

- **Mã Task:** `ai-service-smooth-streaming-and-gateway-refactor`
- **Miền:** `platform` (`ai-python`, `ai-service`, `gateway`, `frontend`)
- **Trạng thái:** `[COMPLETED]`

---

## 1. Bối Cảnh & Vấn Đề Hiện Tại

Qua khảo sát thực tế hệ thống (`ai-python`, `ai-service`, `gateway`, `frontend`), luồng AI Chat hiện gặp 4 điểm nghẽn chính:

1. **Blocking `graph.ainvoke()` tại `ai-python` gây timeout:**
   - `generate_rag_sse_stream()` trong `ai-python/app/api/routes.py` gọi `await graph.ainvoke(initial_state)`, khiến server **không gửi bất kỳ byte nào** về `ai-service` / NGINX / Client cho đến khi toàn bộ chu trình CRAG (gồm nhiều lượt gọi Gemini/Embedding) hoàn tất (thường 15–30+ giây).
   - Khi đi qua proxy có timeout ngắn (như Next.js dev `:3000`) hoặc câu hỏi phức tạp rơi vào nhánh `rewrite_query`, kết nối bị timeout trước khi nhận được chunk đầu tiên.
2. **Thiếu log & tiến trình từng bước (Observability):**
   - Các node trong `ai-python/app/graph/nodes/` chỉ log khi có `warn`/`error`, chưa log `info` cho từng bước (`classify_intent`, `retrieve`, `grade_documents`, `generate`, `check_hallucination`), gây khó khăn khi theo dõi quá trình xử lý từ lúc chat đến lúc phản hồi.
3. **Chưa truyền sự kiện tiến trình (`status`) qua SSE:**
   - `LangGraphClientService` (`ai-service`) và `chatApi.ts` (`frontend`) mới chỉ xử lý `chunk`, `done`, `error`. Nếu `ai-python` gửi SSE `status` (hoặc SSE keep-alive) trong lúc graph đang chạy, kết nối sẽ luôn thông suốt và UI có thể hiển thị trạng thái trực quan.
4. **Cấu hình Hybrid Dev & Gateway (`:8080` vs `:3000`):**
   - Khi mở `:3000`, `ws-config.ts` dùng `window.location.origin` (`ws://localhost:3000/ws/user/socket.io`) dẫn đến lỗi `WebSocket is closed before the connection is established` vì Next.js không proxy `/ws/*`.
   - Khi chạy Hybrid Dev (`Dev: Start All`), `ai-python` trong Docker dùng `ORDER_SERVICE_URL=http://order-service:4004` và `USER_SERVICE_URL=http://user-service:4001`, không gọi được `order-service` / `user-service` đang chạy trên host Windows.

---

## 2. Mục Tiêu Refactor

1. **Streaming không timeout:** Chuyển `ai-python` từ `graph.ainvoke()` sang `graph.astream(..., stream_mode="updates")`, phát SSE `status` event ngay khi bắt đầu và sau mỗi node hoàn tất (kèm SSE heartbeat nếu cần), đảm bảo **TTFB (Time To First Byte) < 200ms**.
2. **Minh bạch quá trình xử lý:** Bổ sung structured logging (`structlog` `info`) tại các node/stream trong `ai-python` và `Logger` trong `ai-service` để theo dõi rõ từng chặng xử lý.
3. **Đồng bộ SSE contract 3 tầng:** Hỗ trợ event `status` xuyên suốt `ai-python` $\rightarrow$ `ai-service` (`LangGraphClientService` & `ChatService`) $\rightarrow$ `frontend` (`chatApi.ts` & `useChatStream.ts`).
4. **Định tuyến 100% qua NGINX Gateway (`:8080`):** Đảm bảo cả HTTP, SSE (`/api/ai/chat`) và WebSocket (`/ws/*/socket.io`) đều đi qua NGINX Gateway `:8080` mượt mà, không cần gọi port trực tiếp; đồng thời cấu hình `ai-python` trong Docker có thể gọi được `order-service` / `user-service` khi chạy Hybrid Dev.

---

## 3. Phạm Vi Thay Đổi Chi Tiết

### 3.1. `ai-python` (FastAPI + LangGraph Core)
- **`ai-python/app/api/routes.py`**:
  - Chuyển `graph.ainvoke(initial_state)` sang `graph.astream(initial_state, stream_mode="updates")`.
  - Phát ngay event `{"type": "status", "step": "starting", "message": "Đang phân tích yêu cầu..."}` khi mở stream.
  - Theo dõi state tích lũy qua từng node update, log `structlog` `info` (`node_completed`, `intent`, `docs_count`, `relevance_score`, `latency_ms`) và phát `status` event tương ứng (`classifying`, `retrieving`, `grading`, `rewriting`, `generating`, `checking`).
  - Sau khi node cuối hoàn tất, stream `chunk` câu trả lời và kết thúc bằng `done` như contract hiện tại.
- **`docker-compose.yml` (`ai-python`)**:
  - Bổ sung `extra_hosts: ["host.docker.internal:host-gateway"]` để container `fd_ai_python` có thể giao tiếp với các service trên host khi chạy Hybrid Dev nếu cấu hình URL trỏ tới `host.docker.internal`.

### 3.2. `backend/apps/ai-service` (NestJS Orchestrator)
- **`backend/apps/ai-service/src/modules/chat/services/langgraph-client.service.ts`**:
  - Thêm `SseStatusEvent` (`{ type: 'status'; step: string; message?: string }`) vào union type `SseServerEvent`.
  - Bổ sung log `this.logger.debug` / `this.logger.log` cho thời điểm bắt đầu và hoàn tất stream từ `ai-python`, giữ nguyên `{ cause: error }` khi throw `ServiceUnavailableException`.
- **`backend/apps/ai-service/src/modules/chat/services/chat.service.ts`**:
  - Chuyển tiếp `event.type === 'status'` qua `writeSse({ type: 'status', step: event.step, message: event.message })` để client giữ kết nối luôn sống và cập nhật UI.

### 3.3. `frontend` (Next.js AI Chat Client)
- **`frontend/src/features/ai-chat/api/chatApi.ts`**:
  - Hỗ trợ optional callback `onStatus?: (status: { step: string; message?: string }) => void` khi parse SSE event `type === 'status'`, giữ tương thích ngược hoàn toàn với các caller/test hiện có.
- **`frontend/src/features/ai-chat/hooks/useChatStream.ts`** & UI (nếu cần):
  - Hiển thị nhẹ trạng thái tiến trình hoặc giữ nguyên placeholder mượt mà khi nhận `status` event.
- **Cấu hình Gateway (`.env.local` / hướng dẫn):**
  - Kiểm tra cấu hình `NEXT_PUBLIC_API_GATEWAY_URL` & `NEXT_PUBLIC_USER_WS_URL` để đảm bảo kể cả khi dev mở `:3000` hay `:8080`, API và WebSocket đều đi qua NGINX Gateway `:8080`.

---

## 4. Kịch Bản Kiểm Thử 3 Nhánh (Test Scenarios)

### Nhánh 1: Happy Path
- **TC-HP-01 (`ai-service` - `LangGraphClientService`):** Nhận chuỗi SSE gồm `status` $\rightarrow$ `chunk` $\rightarrow$ `done` từ `ai-python`, yield đầy đủ theo đúng thứ tự.
- **TC-HP-02 (`ai-service` - `ChatService`):** Ghi nhận `session_init`, forward `status` và `chunk` xuống `res.write`, lưu `assistantMessage` vào DB với `intent`, `tokensUsed`, `latencyMs` và phát `done`.
- **TC-HP-03 (`frontend` - `chatApi`):** Parse được SSE `status`, `chunk`, `done` và gọi đúng callback `onStatus`, `onChunk`, `onDone`.

### Nhánh 2: Edge Cases
- **TC-EC-01 (`ai-service`):** SSE stream có dòng comment keep-alive (`: keep-alive`) hoặc dòng trống $\rightarrow$ bỏ qua an toàn, không crash hay log warning sai.
- **TC-EC-02 (`frontend` - `chatApi`):** Caller không truyền `onStatus` khi nhận event `type: 'status'` $\rightarrow$ bỏ qua êm ái, không lỗi runtime.
- **TC-EC-03 (`ai-python`):** Câu hỏi `GENERAL_CHITCHAT` bỏ qua retrieval/grading nặng và vẫn stream đủ `status` $\rightarrow$ `chunk` $\rightarrow$ `done` hợp lệ.

### Nhánh 3: Error / Rejection Flow
- **TC-ER-01 (`ai-service`):** Kết nối tới `ai-python` bị `ECONNREFUSED` $\rightarrow$ log error kèm `{ cause: error }` và ném `ServiceUnavailableException('Dịch vụ AI đang tạm thời không khả dụng', { cause: error })`.
- **TC-ER-02 (`ai-service`):** `ai-python` trả HTTP 500 $\rightarrow$ ném `ServiceUnavailableException` với thông điệp rõ ràng.
- **TC-ER-03 (`ai-service`):** Stream bị ngắt giữa chừng $\rightarrow$ emit `{ type: 'error', message: ... }` qua SSE và đóng `res.end()` trong `finally`.

---

## 5. Cổng Kiểm Soát Chất Lượng (CI Gate)
- Backend (`backend/`): `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` (100% pass, 0 warnings/errors, không dùng `any`).
- Frontend (`frontend/`): `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` (100% pass).
- Python (`ai-python/`): Kiểm tra syntax/compile (`python -m py_compile`) và test thực tế qua NGINX Gateway `http://localhost:8080/api/ai/chat`.
