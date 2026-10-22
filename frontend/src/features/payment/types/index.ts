export type PaymentMethod = 'WALLET' | 'COD' | 'VNPAY' | 'MOMO';

export interface WalletAccount {
  id: string;
  owner_id: string;
  owner_type: 'CUSTOMER' | 'DRIVER' | 'RESTAURANT' | 'PLATFORM';
  account_category: string;
  account_code: string;
  currency: string;
  status: string;
}

export interface WalletBalance {
  id: string;
  wallet_account_id: string;
  available_balance: string;
  locked_balance: string;
  currency: string;
  version: string;
}

export interface WalletDetailsResponse {
  wallet: WalletAccount;
  balance: WalletBalance;
  recentEntries: Array<{
    id: string;
    entry_type: 'DEBIT' | 'CREDIT';
    amount: string;
    balance_after: string;
    created_at: string;
  }>;
  isDriverInactive?: boolean;
}

export interface TopupWalletDto {
  walletAccountId: string;
  amount: string;
  paymentMethod: 'VNPAY' | 'MOMO' | 'STRIPE' | 'MOCK';
  referenceId: string;
  idempotencyKey: string;
}

export interface CreateGatewayPaymentUrlDto {
  amount: number;
  paymentMethod: 'VNPAY' | 'MOMO';
  walletAccountId?: string;
  orderId?: string;
  returnUrl?: string;
  orderInfo?: string;
  bankCode?: string;
}

export interface PaymentUrlResponse {
  paymentUrl: string;
  qrPayload: string;
  transactionRef: string;
  gateway: 'VNPAY' | 'MOMO';
  amount: number;
}

export interface SimulateGatewayWebhookDto {
  gateway: 'VNPAY' | 'MOMO';
  transactionRef: string;
  amount: number;
  walletAccountId?: string;
  orderId?: string;
  isSuccess?: boolean;
}

export interface SimulateGatewayWebhookResponse {
  success: boolean;
  gateway: 'VNPAY' | 'MOMO';
  transactionRef: string;
  amount: number;
  result: {
    RspCode?: string;
    resultCode?: number;
    message?: string;
    Message?: string;
  };
}

export interface ProcessPaymentDto {
  orderId: string;
  customerId: string;
  restaurantId: string;
  amount: string;
  subtotal?: string;
  deliveryFee?: string;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
}

export interface PaymentIntent {
  id: string;
  order_id: string;
  customer_id: string;
  amount: string;
  currency: string;
  payment_method: string;
  gateway_transaction_id: string | null;
  status: string;
  idempotency_key: string;
  created_at: string;
}

export interface OrderPaymentDetails {
  paymentIntent: PaymentIntent;
  transaction?: {
    id: string;
    transaction_code: string;
    reference_type: string;
    reference_id: string;
    status: string;
    description: string;
    posted_at: string;
  } | null;
  entries?: Array<{
    id: string;
    entry_type: 'DEBIT' | 'CREDIT';
    amount: string;
    balance_after: string;
  }>;
}
