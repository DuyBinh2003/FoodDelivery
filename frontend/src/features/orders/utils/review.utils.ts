/**
 * @file review.utils.ts
 * @description Utility functions for order review modal validation, image file validation and payload formatting.
 */

import type { CreateOrderReviewDto } from '@/features/orders/types';

export const MAX_REVIEW_IMAGES = 5;
export const MAX_REVIEW_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const ALLOWED_REVIEW_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const REVIEW_RATING_LABELS: Record<number, string> = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Cực kỳ hài lòng',
};

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an individual image file for upload to S3 review storage.
 */
export function validateReviewImageFile(file: {
  name: string;
  size: number;
  type: string;
}): FileValidationResult {
  if (!ALLOWED_REVIEW_IMAGE_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Tệp "${file.name}" không hợp lệ. Chỉ chấp nhận định dạng JPEG, PNG, WEBP.`,
    };
  }

  if (file.size > MAX_REVIEW_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Tệp "${file.name}" vượt quá kích thước tối đa 5MB.`,
    };
  }

  return { valid: true };
}

/**
 * Check whether additional images can be added without exceeding the maximum limit.
 */
export function checkImageLimit(
  currentCount: number,
  addingCount: number,
  maxAllowed = MAX_REVIEW_IMAGES,
): { allowed: boolean; canAddCount: number; excessCount: number } {
  const remaining = Math.max(0, maxAllowed - currentCount);
  const canAddCount = Math.min(addingCount, remaining);
  const excessCount = Math.max(0, addingCount - remaining);

  return {
    allowed: remaining > 0,
    canAddCount,
    excessCount,
  };
}

/**
 * Construct and validate the review submission payload.
 */
export function buildReviewPayload(params: {
  restaurantRating?: number;
  foodRating?: number;
  driverRating?: number;
  comment?: string;
  imageUrls?: string[];
}): { payload: CreateOrderReviewDto | null; error?: string } {
  const { restaurantRating, foodRating, driverRating, comment, imageUrls } = params;

  const trimmedComment = comment?.trim() || '';

  const hasAnyRating = Boolean(
    (restaurantRating && restaurantRating > 0) ||
    (foodRating && foodRating > 0) ||
    (driverRating && driverRating > 0)
  );

  if (!hasAnyRating && !trimmedComment) {
    return {
      payload: null,
      error: 'Vui lòng chọn số sao hoặc nhập nhận xét đánh giá.',
    };
  }

  const cleanImageUrls = imageUrls?.filter((url) => Boolean(url && url.trim()));

  const payload: CreateOrderReviewDto = {
    restaurant_rating: restaurantRating && restaurantRating > 0 ? restaurantRating : undefined,
    food_rating: foodRating && foodRating > 0 ? foodRating : undefined,
    driver_rating: driverRating && driverRating > 0 ? driverRating : undefined,
    comment: trimmedComment || undefined,
    image_urls: cleanImageUrls && cleanImageUrls.length > 0 ? cleanImageUrls : undefined,
  };

  return { payload };
}
