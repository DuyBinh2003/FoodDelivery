import { VoucherType } from '@/modules/orders/enums/voucher-type.enum.js';
import { VoucherSponsor } from '@/modules/orders/enums/voucher-sponsor.enum.js';

export interface VoucherValidationResult {
  is_valid: boolean;
  voucher_id: string;
  code: string;
  name: string;
  voucher_type: VoucherType;
  sponsor_type: VoucherSponsor;
  discount_amount: number;
  final_subtotal: number;
  final_delivery_fee: number;
  final_total_amount: number;
  message?: string;
}

export interface AvailableVoucherItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  voucher_type: VoucherType;
  sponsor_type: VoucherSponsor;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  is_applicable: boolean;
  estimated_discount: number;
  reason_not_applicable?: string;
  valid_to: Date;
}
