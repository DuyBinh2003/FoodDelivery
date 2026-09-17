# Quy chuẩn Data Fetching tại Frontend (Next.js App Router)

Tài liệu này ghi lại các quy chuẩn và pattern sử dụng cho việc fetch dữ liệu tại Frontend bằng Next.js App Router. Tất cả các tính năng mới cần tuân thủ các quy tắc dưới đây.

## 1. Sử dụng Server Components cho Data Fetching
- Mặc định, hãy fetch dữ liệu trực tiếp trong Server Components (`async function Page()`) bằng cách sử dụng `await`.
- Hạn chế tối đa việc fetch dữ liệu ở Client Components (sử dụng `useEffect` hoặc SWR/React Query) trừ trường hợp dữ liệu bắt buộc phải lấy sau khi trang đã render (ví dụ: filter dạng dropdown không đổi URL).
- Luôn sử dụng wrapper `apiClient` từ `@/lib/api-client` để fetch dữ liệu. `apiClient` hỗ trợ:
  - Tự động gắn Base URL (`NEXT_PUBLIC_BACKEND_URL`).
  - Phân tích Query Params.
  - Tự động thêm Timeout (mặc định 10s) sử dụng `AbortSignal.timeout`.
  - Phân tích Lỗi thành `ApiError`.

## 2. Caching Strategy
Sử dụng các cấu hình cache của `fetch` (đã bọc qua `apiClient`) một cách thông minh:
- **Dữ liệu tĩnh / Ít biến động** (ví dụ: Danh sách Categories, Tags): Dùng ISR (Incremental Static Regeneration).
  ```typescript
  await apiClient('/api/search/categories', { next: { revalidate: 60 } }); // Cache 60 giây
  ```
- **Dữ liệu động** (ví dụ: Kết quả tìm kiếm, Giỏ hàng, Thông tin User): Dùng dynamic fetching.
  ```typescript
  await apiClient('/api/search/menu', { cache: 'no-store' }); // Không bao giờ cache
  ```

## 3. Chống "All-or-Nothing" Rendering với Suspense
Khi một trang có nhiều nguồn dữ liệu, không sử dụng `Promise.all` cho toàn bộ các API calls ở Root Layout/Page nếu có API chậm. Điều này sẽ chặn toàn bộ UI.
- Hãy tách những phần fetch dữ liệu nặng/động ra một Async Component riêng biệt.
- Bọc Component đó trong `<Suspense fallback={<Skeleton />}>`.
- Bằng cách này, Layout chính, Header và các dữ liệu tĩnh (được lấy cực nhanh nhờ ISR) sẽ hiển thị ngay lập tức, trong khi dữ liệu động tiếp tục tải ngầm và hiển thị Skeleton.

**Ví dụ:**
```tsx
import { Suspense } from 'react';

export default async function Page() {
  const staticData = await getStaticData(); // Rất nhanh

  return (
    <div>
      <Header data={staticData} />
      <Suspense fallback={<LoadingSkeleton />}>
        <SlowDynamicDataComponent />
      </Suspense>
    </div>
  );
}

async function SlowDynamicDataComponent() {
  const data = await getSlowData();
  return <DataList items={data} />;
}
```

## 4. Xử lý Lỗi (Error Boundaries)
- **KHÔNG ĐƯỢC "nuốt" lỗi** bằng cách dùng `try/catch` và return giá trị rỗng (ví dụ: `catch { return [] }`) nếu lỗi đó là quan trọng và cần người dùng biết. Điều này dẫn đến UI trống trơn và rất khó debug.
- Trừ khi đó là dữ liệu không quan trọng (optional UI), hãy cứ để hàm API ném (`throw`) ra lỗi (`ApiError`).
- Bắt và xử lý lỗi tại tầng giao diện bằng file `error.tsx` của Next.js (Error Boundaries).
- Trong `error.tsx`, cung cấp thông báo rõ ràng và một nút "Thử lại" (`reset()`) để người dùng có thể thực hiện lại request.
