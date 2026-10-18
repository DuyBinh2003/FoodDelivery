export type AddressLabel = 'HOME' | 'WORK' | 'OTHER';

export interface UserAddress {
  id: string;
  user_id: string;
  recipient_name: string;
  recipient_phone: string;
  label: AddressLabel;
  street_address: string;
  ward?: string | null;
  district?: string | null;
  city?: string | null;
  full_address: string;
  latitude: number;
  longitude: number;
  delivery_notes?: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressInput {
  recipient_name: string;
  recipient_phone: string;
  label?: AddressLabel;
  street_address: string;
  ward?: string;
  district?: string;
  city?: string;
  full_address: string;
  latitude: number;
  longitude: number;
  delivery_notes?: string;
  is_default?: boolean;
}

export interface UpdateAddressInput {
  recipient_name?: string;
  recipient_phone?: string;
  label?: AddressLabel;
  street_address?: string;
  ward?: string;
  district?: string;
  city?: string;
  full_address?: string;
  latitude?: number;
  longitude?: number;
  delivery_notes?: string;
  is_default?: boolean;
}
