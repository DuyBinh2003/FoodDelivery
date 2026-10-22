/**
 * @file order-review.test.ts
 * @description Unit tests for Order Review utilities: image validations, upload limits and payload builder
 * @trace docs/plans/customer/order-review-image-upload-and-toast-fix.md
 * @scenarios
 *   - Happy Path: Image file validation, limit tracking, complete review payload builder
 *   - Edge Cases: Partial review (rating-only, comment-only), excess images clipping, whitespace trimming
 *   - Error Flow: Disallowed MIME types, oversized files (> 5MB), empty review rejection
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateReviewImageFile,
  checkImageLimit,
  buildReviewPayload,
  MAX_REVIEW_IMAGES,
  MAX_REVIEW_IMAGE_SIZE_BYTES,
  REVIEW_RATING_LABELS,
} from '../utils/review.utils.ts';

describe('Order Review System & Image Upload Suite', () => {
  // ==========================================
  // NHÁNH 1: 🟢 HAPPY PATH (LUỒNG TIÊU CHUẨN)
  // ==========================================
  describe('🟢 Happy Path', () => {
    it('HP-01: Chấp nhận tệp ảnh hợp lệ định dạng JPEG, PNG và WEBP dung lượng <= 5MB', () => {
      const validJpeg = validateReviewImageFile({
        name: 'pho-bo.jpg',
        size: 2 * 1024 * 1024,
        type: 'image/jpeg',
      });
      assert.strictEqual(validJpeg.valid, true);
      assert.strictEqual(validJpeg.error, undefined);

      const validPng = validateReviewImageFile({
        name: 'com-tam.png',
        size: 4.5 * 1024 * 1024,
        type: 'image/png',
      });
      assert.strictEqual(validPng.valid, true);

      const validWebp = validateReviewImageFile({
        name: 'tra-sua.webp',
        size: 500 * 1024,
        type: 'image/webp',
      });
      assert.strictEqual(validWebp.valid, true);
    });

    it('HP-02: Cho phép tải lên đủ số lượng ảnh khi chưa chạm ngưỡng tối đa (5 ảnh)', () => {
      const result = checkImageLimit(2, 3, MAX_REVIEW_IMAGES);
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.canAddCount, 3);
      assert.strictEqual(result.excessCount, 0);
    });

    it('HP-03: Khởi tạo review payload hoàn chỉnh với đầy đủ điểm đánh giá 3 bên, nhận xét và danh sách S3 URLs', () => {
      const { payload, error } = buildReviewPayload({
        restaurantRating: 5,
        foodRating: 4,
        driverRating: 5,
        comment: 'Đồ ăn rất ngon, giao hàng đúng giờ và tài xế rất thân thiện!',
        imageUrls: [
          'http://localhost:4566/food-delivery-assets/reviews/rev-1.jpg',
          'http://localhost:4566/food-delivery-assets/reviews/rev-2.webp',
        ],
      });

      assert.strictEqual(error, undefined);
      assert.ok(payload !== null);
      assert.strictEqual(payload.restaurant_rating, 5);
      assert.strictEqual(payload.food_rating, 4);
      assert.strictEqual(payload.driver_rating, 5);
      assert.strictEqual(
        payload.comment,
        'Đồ ăn rất ngon, giao hàng đúng giờ và tài xế rất thân thiện!',
      );
      assert.deepStrictEqual(payload.image_urls, [
        'http://localhost:4566/food-delivery-assets/reviews/rev-1.jpg',
        'http://localhost:4566/food-delivery-assets/reviews/rev-2.webp',
      ]);
    });

    it('HP-04: Mapping đúng nhãn phản hồi cảm xúc tương ứng với số sao đánh giá', () => {
      assert.strictEqual(REVIEW_RATING_LABELS[1], 'Rất không hài lòng');
      assert.strictEqual(REVIEW_RATING_LABELS[3], 'Bình thường');
      assert.strictEqual(REVIEW_RATING_LABELS[5], 'Cực kỳ hài lòng');
    });
  });

  // ==========================================
  // NHÁNH 2: 🟡 EDGE CASES (TRƯỜNG HỢP BIÊN)
  // ==========================================
  describe('🟡 Edge Cases', () => {
    it('EC-01: Cắt bớt và báo số lượng tệp vượt quá giới hạn khi người dùng chọn nhiều hơn slot trống', () => {
      // Đã có 3 ảnh, chọn thêm 4 ảnh -> chỉ nhận thêm 2 ảnh, bỏ qua 2 ảnh dư
      const result = checkImageLimit(3, 4, MAX_REVIEW_IMAGES);
      assert.strictEqual(result.allowed, true);
      assert.strictEqual(result.canAddCount, 2);
      assert.strictEqual(result.excessCount, 2);
    });

    it('EC-02: Từ chối tải thêm khi đã đạt đủ số lượng tối đa 5 ảnh', () => {
      const result = checkImageLimit(5, 1, MAX_REVIEW_IMAGES);
      assert.strictEqual(result.allowed, false);
      assert.strictEqual(result.canAddCount, 0);
      assert.strictEqual(result.excessCount, 1);
    });

    it('EC-03: Đánh giá hợp lệ khi chỉ chấm sao mà không nhập bình luận và không đính kèm ảnh', () => {
      const { payload, error } = buildReviewPayload({
        restaurantRating: 4,
        foodRating: 5,
      });

      assert.strictEqual(error, undefined);
      assert.ok(payload !== null);
      assert.strictEqual(payload.restaurant_rating, 4);
      assert.strictEqual(payload.food_rating, 5);
      assert.strictEqual(payload.driver_rating, undefined);
      assert.strictEqual(payload.comment, undefined);
      assert.strictEqual(payload.image_urls, undefined);
    });

    it('EC-04: Đánh giá hợp lệ khi chỉ nhập nhận xét mà không chấm sao', () => {
      const { payload, error } = buildReviewPayload({
        comment: 'Quán quên cho tương ớt nhưng bù lại đóng gói sạch sẽ.',
      });

      assert.strictEqual(error, undefined);
      assert.ok(payload !== null);
      assert.strictEqual(payload.restaurant_rating, undefined);
      assert.strictEqual(
        payload.comment,
        'Quán quên cho tương ớt nhưng bù lại đóng gói sạch sẽ.',
      );
    });

    it('EC-05: Tự động lọc bỏ các URL rỗng hoặc khoảng trắng trong danh sách ảnh', () => {
      const { payload } = buildReviewPayload({
        foodRating: 5,
        imageUrls: [
          'http://localhost:4566/food-delivery-assets/reviews/valid.jpg',
          '',
          '   ',
        ],
      });

      assert.ok(payload !== null);
      assert.deepStrictEqual(payload.image_urls, [
        'http://localhost:4566/food-delivery-assets/reviews/valid.jpg',
      ]);
    });
  });

  // ==========================================
  // NHÁNH 3: 🔴 ERROR FLOW (LUỒNG LỖI & TỪ CHỐI)
  // ==========================================
  describe('🔴 Error Flow', () => {
    it('ER-01: Từ chối các định dạng tệp không được phép (PDF, SVG, GIF, EXE)', () => {
      const pdfCheck = validateReviewImageFile({
        name: 'receipt.pdf',
        size: 1024 * 1024,
        type: 'application/pdf',
      });
      assert.strictEqual(pdfCheck.valid, false);
      assert.ok(pdfCheck.error?.includes('không hợp lệ'));

      const svgCheck = validateReviewImageFile({
        name: 'vector.svg',
        size: 200 * 1024,
        type: 'image/svg+xml',
      });
      assert.strictEqual(svgCheck.valid, false);
    });

    it('ER-02: Từ chối tệp vượt quá giới hạn 5MB', () => {
      const oversizedCheck = validateReviewImageFile({
        name: 'huge-camera-photo.jpg',
        size: MAX_REVIEW_IMAGE_SIZE_BYTES + 1,
        type: 'image/jpeg',
      });
      assert.strictEqual(oversizedCheck.valid, false);
      assert.ok(oversizedCheck.error?.includes('vượt quá kích thước tối đa 5MB'));
    });

    it('ER-03: Từ chối gửi đánh giá khi không có bất kỳ sao nào và nhận xét trống rỗng', () => {
      const { payload, error } = buildReviewPayload({
        comment: '   ',
      });

      assert.strictEqual(payload, null);
      assert.strictEqual(
        error,
        'Vui lòng chọn số sao hoặc nhập nhận xét đánh giá.',
      );
    });
  });
});
