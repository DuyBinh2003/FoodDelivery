import { apiClient } from '@/lib/api-client';
import type { UserAddress, CreateAddressInput, UpdateAddressInput } from '@/features/address/types/address.types';

export const getUserAddresses = async (): Promise<UserAddress[]> => {
  return apiClient<UserAddress[]>('/users/addresses', {
    method: 'GET',
  });
};

export const createAddress = async (data: CreateAddressInput): Promise<UserAddress> => {
  return apiClient<UserAddress>('/users/addresses', {
    method: 'POST',
    body: data,
  });
};

export const updateAddress = async (id: string, data: UpdateAddressInput): Promise<UserAddress> => {
  return apiClient<UserAddress>(`/users/addresses/${id}`, {
    method: 'PUT',
    body: data,
  });
};

export const setDefaultAddress = async (id: string): Promise<UserAddress> => {
  return apiClient<UserAddress>(`/users/addresses/${id}/default`, {
    method: 'PATCH',
  });
};

export const deleteAddress = async (id: string): Promise<{ success: boolean; message: string }> => {
  return apiClient<{ success: boolean; message: string }>(`/users/addresses/${id}`, {
    method: 'DELETE',
  });
};
