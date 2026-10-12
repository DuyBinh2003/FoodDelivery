export * from './driver-api';

import { apiClient } from '@/lib/api-client';

export interface DriverRegistrationPayload {
  full_name: string;
  phone: string;
  vehicle_plate: string;
  vehicle_type: string;
  license_number?: string;
  notes?: string;
  [key: string]: unknown;
}

export async function submitDriverRegistration(payload: DriverRegistrationPayload): Promise<void> {
  return await apiClient<void>('/users/registrations', {
    method: 'POST',
    body: {
      type: 'DRIVER',
      payload,
    },
  });
}
