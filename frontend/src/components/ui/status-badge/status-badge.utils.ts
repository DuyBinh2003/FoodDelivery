import type { StatusBadgeTone } from './types';

export interface StatusStyleConfig {
  label: string;
  tone: StatusBadgeTone;
  pulse?: boolean;
}

const STATUS_MAP: Record<string, StatusStyleConfig> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'warning', pulse: true },
  ACCEPTED: { label: 'Đã nhận đơn', tone: 'info' },
  COOKING: { label: 'Đang chế biến', tone: 'info', pulse: true },
  READY_FOR_PICKUP: { label: 'Đang tìm tài xế', tone: 'info', pulse: true },
  DELIVERING: { label: 'Đang giao hàng', tone: 'success', pulse: true },
  COMPLETED: { label: 'Hoàn thành', tone: 'success' },
  CANCELLED: { label: 'Đã hủy', tone: 'danger' },
  ONLINE: { label: 'Trực tuyến', tone: 'success', pulse: true },
  OFFLINE: { label: 'Ngoại tuyến', tone: 'neutral' },
  APPROVED: { label: 'Đã duyệt', tone: 'success' },
  REJECTED: { label: 'Từ chối', tone: 'danger' },
  AVAILABLE: { label: 'Khả dụng', tone: 'success' },
  USED: { label: 'Đã sử dụng', tone: 'neutral' },
  EXPIRED: { label: 'Hết hạn', tone: 'danger' },
};

export function resolveStatusConfig(status: string, customLabel?: string): StatusStyleConfig {
  const key = (status || '').trim().toUpperCase();
  const matched = STATUS_MAP[key];
  if (matched) {
    return {
      ...matched,
      label: customLabel || matched.label,
    };
  }
  return {
    label: customLabel || status || 'Không xác định',
    tone: 'neutral',
    pulse: false,
  };
}
