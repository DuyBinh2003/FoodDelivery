export type RequesterType = 'DRIVER' | 'RESTAURANT';
export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED';

export interface WithdrawalRequest {
  id: string;
  wallet_account_id: string;
  requester_id: string;
  requester_type: RequesterType;
  amount: string;
  fee: string;
  net_amount: string;
  bank_code: string;
  bank_account_number: string;
  bank_account_name: string;
  status: WithdrawalStatus;
  rejection_reason?: string | null;
  bank_transaction_ref?: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreateWithdrawalPayload {
  wallet_account_id: string;
  requester_id: string;
  requester_type: RequesterType;
  amount: number;
  bank_code: string;
  bank_account_number: string;
  bank_account_name: string;
}

export interface WithdrawalListResponse {
  items: WithdrawalRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SupportedBank {
  code: string;
  name: string;
  shortName: string;
  bin: string;
}

export const VIETNAM_BANKS: SupportedBank[] = [
  { code: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam', shortName: 'Vietcombank', bin: '970436' },
  { code: 'TCB', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam', shortName: 'Techcombank', bin: '970407' },
  { code: 'MB', name: 'Ngân hàng TMCP Quân Đội', shortName: 'MBBank', bin: '970422' },
  { code: 'CTG', name: 'Ngân hàng TMCP Công Thương Việt Nam', shortName: 'VietinBank', bin: '970415' },
  { code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển VN', shortName: 'BIDV', bin: '970418' },
  { code: 'ACB', name: 'Ngân hàng TMCP Á Châu', shortName: 'ACB', bin: '970416' },
  { code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng', shortName: 'VPBank', bin: '970432' },
  { code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong', shortName: 'TPBank', bin: '970423' },
  { code: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín', shortName: 'Sacombank', bin: '970403' },
  { code: 'HDB', name: 'Ngân hàng TMCP Phát Triển TP.HCM', shortName: 'HDBank', bin: '970437' },
  { code: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam', shortName: 'MSB', bin: '970426' },
  { code: 'OCB', name: 'Ngân hàng TMCP Phương Đông', shortName: 'OCB', bin: '970448' },
  { code: 'VIB', name: 'Ngân hàng TMCP Quốc tế Việt Nam', shortName: 'VIB', bin: '970441' },
];
