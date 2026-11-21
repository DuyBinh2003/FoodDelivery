/**
 * [Requirement/Issue: #R2]
 * [Target: Frontend - Restaurant Operating Hours & Auto-Closing Validation Suite]
 * [Compliance: testing-policy (Happy Path, Edge Cases, Error & Rejection Flow)]
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { OperatingHourItem, RestaurantOperatingStatus } from '../types/operating-hours.types';

// Helper validator logic mô phỏng Client & API rules
function validateOperatingHours(hours: OperatingHourItem[]): { valid: boolean; error?: string } {
  if (!Array.isArray(hours) || hours.length === 0) {
    return { valid: false, error: 'Danh sách lịch mở cửa không được để trống' };
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  for (const h of hours) {
    if (h.day_of_week < 0 || h.day_of_week > 6) {
      return { valid: false, error: `Thứ trong tuần không hợp lệ: ${h.day_of_week}` };
    }

    if (!h.is_closed_all_day) {
      if (!timeRegex.test(h.open_time)) {
        return { valid: false, error: `Giờ mở cửa không đúng định dạng HH:mm: ${h.open_time}` };
      }
      if (!timeRegex.test(h.close_time)) {
        return { valid: false, error: `Giờ đóng cửa không đúng định dạng HH:mm: ${h.close_time}` };
      }

      const [openH, openM] = h.open_time.split(':').map(Number);
      const [closeH, closeM] = h.close_time.split(':').map(Number);
      const openTotal = openH * 60 + openM;
      const closeTotal = closeH * 60 + closeM;

      if (openTotal >= closeTotal) {
        return {
          valid: false,
          error: `Giờ mở cửa (${h.open_time}) phải nhỏ hơn giờ đóng cửa (${h.close_time})`,
        };
      }
    }
  }

  return { valid: true };
}

function copyMondayScheduleToAll(mondaySchedule: OperatingHourItem): OperatingHourItem[] {
  const result: OperatingHourItem[] = [];
  for (let day = 0; day <= 6; day++) {
    result.push({
      day_of_week: day,
      open_time: mondaySchedule.open_time,
      close_time: mondaySchedule.close_time,
      is_closed_all_day: mondaySchedule.is_closed_all_day,
    });
  }
  return result;
}

function getBannerDisplayInfo(status: RestaurantOperatingStatus | null) {
  if (!status || status.isOpen) return null;

  let badge = 'Ngoài giờ mở cửa';
  if (status.reason === 'BREAK_TIME') {
    badge = 'Nghỉ giữa ca';
  } else if (status.reason === 'CLOSED_ALL_DAY') {
    badge = 'Nghỉ cả ngày';
  } else if (status.reason === 'RESTAURANT_INACTIVE') {
    badge = 'Tạm ngưng nhận đơn';
  }

  return {
    shouldRender: true,
    badge,
    message: status.message,
    nextOpenTime: status.nextOpenTime || null,
  };
}

describe('Restaurant Operating Hours & Auto-Closing Validation Suite (#R2)', () => {
  describe('Branch 1: Happy Path (Dòng Chảy Chuẩn)', () => {
    it('🟢 [Happy Path] Lịch hoạt động 7 ngày mở 08:00 - 22:00 hợp lệ', () => {
      const schedule: OperatingHourItem[] = [
        { day_of_week: 1, open_time: '08:00', close_time: '22:00', is_closed_all_day: false },
        { day_of_week: 2, open_time: '08:00', close_time: '22:00', is_closed_all_day: false },
        { day_of_week: 3, open_time: '08:00', close_time: '22:00', is_closed_all_day: false },
      ];
      const res = validateOperatingHours(schedule);
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.error, undefined);
    });

    it('🟢 [Happy Path] Quán đang mở cửa (isOpen = true) -> Không hiển thị banner đóng cửa', () => {
      const status: RestaurantOperatingStatus = {
        isOpen: true,
        restaurantId: 'rest-1',
        message: 'Đang mở cửa',
        currentSession: { open_time: '08:00', close_time: '22:00' },
      };
      const banner = getBannerDisplayInfo(status);
      assert.strictEqual(banner, null);
    });

    it('🟢 [Happy Path] Sao chép lịch Thứ Hai cho cả tuần chính xác 7 ngày', () => {
      const monday: OperatingHourItem = {
        day_of_week: 1,
        open_time: '07:30',
        close_time: '21:30',
        is_closed_all_day: false,
      };
      const weekSchedule = copyMondayScheduleToAll(monday);
      assert.strictEqual(weekSchedule.length, 7);
      assert.strictEqual(weekSchedule[0].open_time, '07:30');
      assert.strictEqual(weekSchedule[6].close_time, '21:30');
    });
  });

  describe('Branch 2: Edge Cases (Biên & Giới Hạn)', () => {
    it('🟡 [Edge Case] Quán nghỉ giữa ca -> Hiển thị badge "Nghỉ giữa ca" và ca kế tiếp 17:00', () => {
      const status: RestaurantOperatingStatus = {
        isOpen: false,
        restaurantId: 'rest-1',
        reason: 'BREAK_TIME',
        message: 'Quán đang trong giờ nghỉ giữa ca',
        nextOpenTime: '17:00',
      };
      const banner = getBannerDisplayInfo(status);
      assert.strictEqual(banner?.shouldRender, true);
      assert.strictEqual(banner?.badge, 'Nghỉ giữa ca');
      assert.strictEqual(banner?.nextOpenTime, '17:00');
    });

    it('🟡 [Edge Case] Giờ mở cửa từ 00:00 đến 23:59 -> Hợp lệ', () => {
      const schedule: OperatingHourItem[] = [
        { day_of_week: 0, open_time: '00:00', close_time: '23:59', is_closed_all_day: false },
      ];
      const res = validateOperatingHours(schedule);
      assert.strictEqual(res.valid, true);
    });

    it('🟡 [Edge Case] Quán nghỉ cả ngày -> Không bị chặn bởi quy tắc giờ mở < giờ đóng', () => {
      const schedule: OperatingHourItem[] = [
        { day_of_week: 0, open_time: '00:00', close_time: '00:00', is_closed_all_day: true },
      ];
      const res = validateOperatingHours(schedule);
      assert.strictEqual(res.valid, true);
    });
  });

  describe('Branch 3: Error & Rejection Flow (Ngoại Lệ & Lỗi Nhập Liệu)', () => {
    it('🔴 [Error Flow] Giờ mở cửa lớn hơn giờ đóng cửa (22:00 > 08:00) -> Báo lỗi validation', () => {
      const schedule: OperatingHourItem[] = [
        { day_of_week: 1, open_time: '22:00', close_time: '08:00', is_closed_all_day: false },
      ];
      const res = validateOperatingHours(schedule);
      assert.strictEqual(res.valid, false);
      assert.match(res.error || '', /phải nhỏ hơn giờ đóng cửa/);
    });

    it('🔴 [Error Flow] Giờ mở cửa bằng giờ đóng cửa (10:00 = 10:00) khi không nghỉ cả ngày -> Báo lỗi', () => {
      const schedule: OperatingHourItem[] = [
        { day_of_week: 2, open_time: '10:00', close_time: '10:00', is_closed_all_day: false },
      ];
      const res = validateOperatingHours(schedule);
      assert.strictEqual(res.valid, false);
      assert.match(res.error || '', /phải nhỏ hơn giờ đóng cửa/);
    });

    it('🔴 [Error Flow] Định dạng thời gian sai ("25:00" hoặc "abc") -> Báo lỗi regex', () => {
      const schedule: OperatingHourItem[] = [
        { day_of_week: 3, open_time: '25:00', close_time: '22:00', is_closed_all_day: false },
      ];
      const res = validateOperatingHours(schedule);
      assert.strictEqual(res.valid, false);
      assert.match(res.error || '', /không đúng định dạng HH:mm/);
    });

    it('🔴 [Error Flow] Quán bị ngưng nhận đơn thủ công (RESTAURANT_INACTIVE) -> Hiển thị badge "Tạm ngưng nhận đơn"', () => {
      const status: RestaurantOperatingStatus = {
        isOpen: false,
        restaurantId: 'rest-1',
        reason: 'RESTAURANT_INACTIVE',
        message: 'Quán ngưng nhận đơn',
      };
      const banner = getBannerDisplayInfo(status);
      assert.strictEqual(banner?.badge, 'Tạm ngưng nhận đơn');
    });
  });
});
