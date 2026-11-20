import { apiClient } from '@/lib/api-client';
import type {
  DriverTrip,
  DriverSummary,
  DriverReviewsResponse,
  DriverStatus,
  DeliveryProofItem,
} from '@/features/driver/types/driver.types';

export async function getDriverTrips(): Promise<DriverTrip[]> {
  return await apiClient<DriverTrip[]>('/orders/driver/trips', {
    cache: 'no-store',
  });
}

export async function getDriverSummary(): Promise<DriverSummary> {
  return await apiClient<DriverSummary>('/orders/driver/summary', {
    cache: 'no-store',
  });
}

export async function getDriverReviews(): Promise<DriverReviewsResponse> {
  return await apiClient<DriverReviewsResponse>('/orders/driver/reviews', {
    cache: 'no-store',
  });
}

export async function updateDriverStatus(status: DriverStatus): Promise<void> {
  await apiClient<void>('/users/profile/driver/status', {
    method: 'PATCH',
    body: { status },
  });
}

export async function updateDriverTripStatus(orderId: string, status: string): Promise<void> {
  await apiClient<void>(`/orders/driver/trips/${orderId}/status`, {
    method: 'PATCH',
    body: { status },
  });
}

export async function getAvailableDriverTrips(): Promise<DriverTrip[]> {
  return await apiClient<DriverTrip[]>('/orders/driver/available', {
    cache: 'no-store',
  });
}

export async function claimDriverTrip(orderId: string): Promise<DriverTrip> {
  return await apiClient<DriverTrip>(`/orders/${orderId}/driver-claim`, {
    method: 'POST',
  });
}

export async function uploadDeliveryProofPhoto(
  orderId: string,
  file: File,
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`/api/delivery/orders/${orderId}/proof/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Tải ảnh bằng chứng thất bại');
  }

  return await res.json();
}

export interface SubmitDeliveryProofInput {
  driver_id: string;
  proof_type: 'PICKED_UP' | 'DELIVERED';
  image_url: string;
  captured_lat: number;
  captured_lng: number;
  notes?: string;
}

export async function submitDeliveryProof(
  orderId: string,
  input: SubmitDeliveryProofInput,
): Promise<DeliveryProofItem> {
  return await apiClient<DeliveryProofItem>(`/delivery/orders/${orderId}/proof`, {
    method: 'POST',
    body: input,
  });
}

export async function getDeliveryProofs(orderId: string): Promise<DeliveryProofItem[]> {
  return await apiClient<DeliveryProofItem[]>(`/delivery/orders/${orderId}/proof`, {
    cache: 'no-store',
  });
}
