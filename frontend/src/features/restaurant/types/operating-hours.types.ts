export interface OperatingHourItem {
  day_of_week: number; // 0: Chủ Nhật, 1..6: Thứ Hai -> Thứ Bảy
  open_time: string; // Định dạng HH:mm
  close_time: string; // Định dạng HH:mm
  is_closed_all_day: boolean;
}

export interface RestaurantOperatingStatus {
  isOpen: boolean;
  restaurantId: string;
  reason?: 'RESTAURANT_INACTIVE' | 'CLOSED_ALL_DAY' | 'BEFORE_OPENING' | 'BREAK_TIME' | 'CLOSED' | 'OPEN';
  message: string;
  currentSession?: {
    open_time: string;
    close_time: string;
  };
  nextOpenTime?: string;
}

export interface UpdateOperatingHoursPayload {
  hours: OperatingHourItem[];
}
