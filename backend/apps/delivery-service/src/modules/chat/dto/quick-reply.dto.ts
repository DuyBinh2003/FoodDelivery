import { ChatSenderRole } from '@/modules/chat/enums/chat-sender-role.enum.js';

export interface QuickReplyItem {
  id: string;
  role: ChatSenderRole;
  text: string;
  category: string;
}

export const DEFAULT_QUICK_REPLIES: QuickReplyItem[] = [
  // Khách hàng
  { id: 'qr_c1', role: ChatSenderRole.CUSTOMER, text: 'Tôi đang ở sảnh tòa nhà nhé', category: 'LOBBY' },
  { id: 'qr_c2', role: ChatSenderRole.CUSTOMER, text: 'Vui lòng để trước cửa phòng / nhà giúp tôi', category: 'DOOR' },
  { id: 'qr_c3', role: ChatSenderRole.CUSTOMER, text: 'Gặp tôi ở cổng số 2 nhé', category: 'GATE' },
  { id: 'qr_c4', role: ChatSenderRole.CUSTOMER, text: 'Khi đến bạn bấm chuông hoặc gọi tôi nhé', category: 'ARRIVE' },

  // Tài xế
  { id: 'qr_d1', role: ChatSenderRole.DRIVER, text: 'Tôi đã nhận món từ quán và đang trên đường giao tới', category: 'ON_THE_WAY' },
  { id: 'qr_d2', role: ChatSenderRole.DRIVER, text: 'Đoạn đường đang hơi kẹt xe, tôi sẽ tới sớm nhất có thể', category: 'TRAFFIC' },
  { id: 'qr_d3', role: ChatSenderRole.DRIVER, text: 'Tôi đã tới điểm giao, mời bạn ra nhận món nhé', category: 'ARRIVED' },
  { id: 'qr_d4', role: ChatSenderRole.DRIVER, text: 'Tôi đang đứng chờ trước sảnh tòa nhà', category: 'WAITING' },

  // Nhà hàng
  { id: 'qr_r1', role: ChatSenderRole.RESTAURANT, text: 'Quán đang làm món nóng sốt cho bạn', category: 'COOKING' },
  { id: 'qr_r2', role: ChatSenderRole.RESTAURANT, text: 'Món ăn đã chuẩn bị xong, đang chờ tài xế đến lấy', category: 'READY' },
];
