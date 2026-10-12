import { apiClient } from '@/lib/api-client';
import type {
  DriverTrip,
  DriverSummary,
  DriverReviewsResponse,
  DriverStatus,
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
