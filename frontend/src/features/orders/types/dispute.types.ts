export type DisputeReasonCode =
  | 'DAMAGED_FOOD'
  | 'WRONG_ITEMS'
  | 'NEVER_ARRIVED'
  | 'RUDE_BEHAVIOR'
  | 'OTHER';

export type DisputeStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';
export type DisputePriority = 'URGENT' | 'HIGH' | 'NORMAL';
export type ResolutionAction = 'FULL_REFUND' | 'PARTIAL_REFUND' | 'VOUCHER_COMPENSATION' | 'REJECT';
export type PenaltyParty = 'DRIVER' | 'RESTAURANT' | 'PLATFORM';

export interface OrderDispute {
  id: string;
  order_id: string;
  customer_id: string;
  reason_code: DisputeReasonCode;
  description: string;
  evidence_images: string[];
  status: DisputeStatus;
  priority: DisputePriority;
  resolution_action?: ResolutionAction | null;
  refund_amount: string;
  penalty_party?: PenaltyParty | null;
  assigned_cs_id?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  resolved_at?: string | null;
}

export interface CreateDisputePayload {
  order_id: string;
  customer_id?: string;
  reason_code: string;
  description: string;
  evidence_images?: string[];
}

export interface DisputeOrderSummary {
  id: string;
  code?: string;
  total_amount: number;
  status: string;
  payment_method?: string;
  restaurant_id?: string;
  driver_id?: string;
  items?: Array<{
    id?: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  [key: string]: unknown;
}

export interface DisputeDetailsResponse {
  dispute: OrderDispute;
  order: DisputeOrderSummary;
  driverProofs: Array<{
    id: string;
    photo_url: string;
    proof_type: 'PICKUP' | 'DROPOFF';
    notes?: string;
    created_at: string;
  }>;
}

export interface DisputeListResponse {
  items: OrderDispute[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
