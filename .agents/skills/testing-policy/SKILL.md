---
name: testing-policy
description: Quy chuẩn và hướng dẫn bắt buộc cho AI Agents khi viết unit test và integration test cho các luồng nghiệp vụ (Business Flow) dựa trên docs và implementation plan. Bao gồm quy tắc truy xuất nguồn gốc (Traceability Header), kiểm thử 3 nhánh (Happy Path, Edge Cases, Error Flow), cấu trúc thư mục tests/ trong từng module, và pre-flight checklist.
---

# Quy Chuẩn Kiểm Thử Luồng Nghiệp Vụ (Testing Policy)

Tài liệu này định nghĩa các quy tắc và quy chuẩn bắt buộc dành cho **AI Agents** và **Kỹ sư phát triển** khi xây dựng, mở rộng hoặc sửa đổi các luồng nghiệp vụ (Business Flows) trong hệ thống Food Delivery.

---

## 1. NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)

1. **Kiểm thử dựa trên Thiết kế & Tài liệu (Docs & Plan-Driven Testing)**:
   - Mọi test case phải bám sát theo luồng đã được đặc tả trong `docs/` (`architecture/`, `services/`, `features/`) hoặc Kế hoạch kỹ thuật (`Implementation Plan`) đã duyệt.
   - Không viết test vu vơ hoặc chỉ test các hàm getter/setter tầm thường; trọng tâm là xác thực logic nghiệp vụ (Business Invariants).
2. **Truy xuất Nguồn gốc Bắt buộc (Mandatory Traceability)**:
   - Mọi file test phải khai báo rõ ràng nguồn tài liệu tham chiếu (Doc/Plan Traceability Header) ở đầu file hoặc đầu `describe` block.
3. **Phủ đủ 3 Nhánh Nghiệp vụ (The 3-Branch Rule)**:
   - Mỗi luồng nghiệp vụ bắt buộc phải kiểm thử đủ 3 nhánh:
     - 🟢 **Happy Path**: Dữ liệu chuẩn, tài nguyên hợp lệ, thực thi thành công.
     - 🟡 **Edge Cases**: Giá trị biên, số dư tối thiểu, danh sách rỗng, trạng thái trung gian, tranh chấp (Race Condition / Atomic Lock).
     - 🔴 **Error / Rejection Flow**: Không có quyền (Forbidden), sai trạng thái (Inactive / Offline), không tìm thấy (NotFound), trùng lặp/xung đột (Conflict).
4. **Hermetic & Fast (Cô lập & Tốc độ cao)**:
   - Unit test nghiệp vụ sử dụng **Vitest** và mock toàn bộ I/O bên ngoài (DB repositories, Redis, SQS/SNS, external fetch).
   - Test phải chạy độc lập, không phụ thuộc vào việc các container Docker (DB, Redis, LocalStack) đang bật hay tắt.

---

## 2. KHI NÀO AGENT BẮT BUỘC PHẢI VIẾT / CẬP NHẬT TEST?

Agent **BẮT BUỘC** phải tạo mới hoặc cập nhật file test trong các trường hợp sau:

| Tình huống code | Phạm vi test bắt buộc | Vị trí đặt file |
| :--- | :--- | :--- |
| **Tạo Use Case / Business Flow mới** | Unit Test toàn diện cho Use Case (3 nhánh) | `apps/<service>/src/modules/<module>/tests/<flow-or-usecase>.spec.ts` |
| **Sửa đổi logic / Thêm điều kiện kiểm tra (e.g. Active check, Status check)** | Thêm test case cho điều kiện mới + cập nhật các test case bị ảnh hưởng | File test hiện có hoặc tạo mới trong thư mục `tests/` của module |
| **Fix Bug nghiệp vụ** | Viết Regression Test tái hiện bug (Red) và chứng minh đã fix (Green) | File test tương ứng của Use Case bị lỗi |
| **Luồng liên service phức tạp (Multi-service Choreography)** | E2E / Integration test theo yêu cầu của Implementation Plan | `test/` hoặc theo file cấu hình E2E (`vitest.config.e2e.ts`) |

---

## 3. CẤU TRÚC VỊ TRÍ ĐẶT FILE VÀ QUY ƯỚC ĐẶT TÊN

### 3.1. Cấu trúc thư mục
Tất cả các file test của một module phải được đặt trong thư mục `tests/` nằm bên trong module đó:

```text
apps/<service-name>/src/modules/<module-name>/
├── dto/
├── entities/
├── repositories/
├── usecases/
│   ├── create-order.usecase.ts
│   └── claim-driver-trip.usecase.ts
└── tests/                                 <-- Thư mục test chuẩn
    ├── create-order.spec.ts
    └── driver-active-dispatch.spec.ts
```

### 3.2. Quy ước đặt tên file test
- **Định dạng**: Kebab-case, kết thúc bằng `.spec.ts` (Quy chuẩn Vitest của dự án).
- **Quy tắc đặt tên**: Đặt tên theo Use Case hoặc tên của Luồng nghiệp vụ (Business Flow).
  - Ví dụ: `driver-active-dispatch.spec.ts`, `ledger-engine.spec.ts`, `process-payment.spec.ts`.

---

## 4. KHUNG MẪU FILE TEST CHUẨN (STANDARD TEST TEMPLATE)

Agent **PHẢI** tuân thủ khung mẫu sau khi viết test:

```ts
/**
 * @file <flow-or-usecase>.spec.ts
 * @description Kiểm thử luồng nghiệp vụ <Tên luồng>
 * @trace docs/services/<service-name>.md # <Section>
 * @trace docs/architecture/<diagram-name>.md # <Phase/Step>
 * @plan <plan-name>.md # Verification Plan
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { TargetUseCase } from '@/modules/<module>/usecases/target.usecase.js';

describe('<TargetUseCase | Business Flow Name>', () => {
  const originalFetch = global.fetch;
  let useCase: TargetUseCase;
  let mockReadRepo: any;
  let mockWriteRepo: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockReadRepo = {
      findById: vi.fn(),
    };
    mockWriteRepo = {
      save: vi.fn(),
    };
    mockConfigService = {
      getOrThrow: vi.fn((key: string) => {
        if (key === 'services.userUrl') return 'http://localhost:3001';
        return '';
      }),
    };

    useCase = new TargetUseCase(
      mockReadRepo,
      mockWriteRepo,
      mockConfigService,
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  // ==========================================
  // 1. HAPPY PATH (Luồng thành công)
  // ==========================================
  describe('Happy Path', () => {
    it('should successfully execute when all preconditions and inputs are valid', async () => {
      // Arrange
      mockReadRepo.findById.mockResolvedValue({ id: 'valid-id', is_active: true });
      mockWriteRepo.save.mockResolvedValue({ id: 'valid-id', status: 'PROCESSED' });

      // Act
      const result = await useCase.execute({ id: 'valid-id' });

      // Assert
      expect(result).toBeDefined();
      expect(mockWriteRepo.save).toHaveBeenCalledOnce();
    });
  });

  // ==========================================
  // 2. EDGE CASES (Trường hợp biên / Giới hạn)
  // ==========================================
  describe('Edge Cases', () => {
    it('should handle empty items / zero amounts appropriately', async () => {
      // Arrange & Act & Assert
    });

    it('should handle atomic concurrency or external service timeouts (fail-closed)', async () => {
      // Arrange & Act & Assert
    });
  });

  // ==========================================
  // 3. ERROR & REJECTION FLOWS (Từ chối & Bắt lỗi)
  // ==========================================
  describe('Error & Rejection Flows', () => {
    it('should throw ForbiddenException when subject is inactive or offline', async () => {
      // Arrange
      mockReadRepo.findById.mockResolvedValue({ id: 'valid-id', is_active: false });

      // Act & Assert
      await expect(useCase.execute({ id: 'valid-id' })).rejects.toThrow(ForbiddenException);
      expect(mockWriteRepo.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when target entity does not exist', async () => {
      // Arrange
      mockReadRepo.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.execute({ id: 'non-existing' })).rejects.toThrow(NotFoundException);
    });
  });
});
```

---

## 5. QUY TRÌNH THỰC THI & TIÊU CHUẨN NGHIỆM THU (PRE-FLIGHT CHECKLIST)

Trước khi Agent tuyên bố hoàn thành task hoặc tạo Walkthrough, bắt buộc phải rà soát qua checklist sau:

- [ ] **1. Kế hoạch (Plan) đã liệt kê kịch bản test**: Trong file Implementation Plan, mục `## Verification Plan > ### Automated Tests` phải ghi rõ các test case dự kiến.
- [ ] **2. Có Traceability Header**: Đầu file test có comment trích dẫn rõ file `docs/` hoặc `plan` tương ứng.
- [ ] **3. Đủ 3 nhánh**: Có test case cho Happy Path, Edge Case và Error/Rejection Flow.
- [ ] **4. Sử dụng Vitest**: Dùng `describe`, `it`, `expect`, `vi` từ `'vitest'` (không import từ jest).
- [ ] **5. Không dùng `any` bừa bãi**: Định nghĩa type rõ ràng hoặc ép kiểu an toàn khi mock.
- [ ] **6. 100% Pass**: Chạy lệnh test tại thư mục backend và xác nhận toàn bộ test suite đều xanh:
  ```bash
  cd backend
  npm test
  ```
- [ ] **7. Không làm vỡ test cũ**: Các test suite đã tồn tại của các module khác vẫn phải pass 100%.
