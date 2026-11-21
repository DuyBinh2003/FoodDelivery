'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Loader2,
  Calendar,
} from 'lucide-react';
import type { OperatingHourItem } from '@/features/restaurant/types/operating-hours.types';
import { getMyOperatingHours, updateMyOperatingHours } from '@/features/restaurant/api/partner-api';

interface OperatingHoursDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const DAYS_OF_WEEK = [
  { day: 1, label: 'Thứ Hai' },
  { day: 2, label: 'Thứ Ba' },
  { day: 3, label: 'Thứ Tư' },
  { day: 4, label: 'Thứ Năm' },
  { day: 5, label: 'Thứ Sáu' },
  { day: 6, label: 'Thứ Bảy' },
  { day: 0, label: 'Chủ Nhật' },
];

export function OperatingHoursDialog({ isOpen, onClose, onSuccess }: OperatingHoursDialogProps) {
  const [hours, setHours] = useState<OperatingHourItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      getMyOperatingHours()
        .then((data) => {
          if (!ignore) {
            const map = new Map(data.map((item) => [item.day_of_week, item]));
            const fullList: OperatingHourItem[] = [];
            for (const d of DAYS_OF_WEEK) {
              const existing = map.get(d.day);
              fullList.push(
                existing || {
                  day_of_week: d.day,
                  open_time: '08:00',
                  close_time: '22:00',
                  is_closed_all_day: false,
                },
              );
            }
            setHours(fullList);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            const msg = err instanceof Error ? err.message : 'Không thể tải lịch mở cửa';
            setError(msg);
            setLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  const handleChange = (day: number, field: keyof OperatingHourItem, value: string | boolean) => {
    setHours((prev) =>
      prev.map((item) => (item.day_of_week === day ? { ...item, [field]: value } : item)),
    );
  };

  const handleApplyToAll = (sourceDay: number) => {
    const source = hours.find((h) => h.day_of_week === sourceDay);
    if (!source) return;

    setHours((prev) =>
      prev.map((item) => ({
        ...item,
        open_time: source.open_time,
        close_time: source.close_time,
        is_closed_all_day: source.is_closed_all_day,
      })),
    );
  };

  const handleSave = async () => {
    // Validate giờ mở < giờ đóng
    for (const h of hours) {
      if (!h.is_closed_all_day) {
        const [openH, openM] = h.open_time.split(':').map(Number);
        const [closeH, closeM] = h.close_time.split(':').map(Number);
        if (openH * 60 + openM >= closeH * 60 + closeM) {
          const dayName = DAYS_OF_WEEK.find((d) => d.day === h.day_of_week)?.label;
          setError(`Lỗi ngày ${dayName}: Giờ mở cửa (${h.open_time}) phải trước giờ đóng cửa (${h.close_time})`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      setError(null);
      await updateMyOperatingHours({ hours });
      setSuccessMsg('Đã lưu lịch hoạt động thành công!');
      setTimeout(() => {
        setSuccessMsg(null);
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể lưu lịch hoạt động';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Lịch Hoạt Động & Giờ Mở Cửa</h3>
              <p className="text-xs text-zinc-400">
                Hệ thống tự động ngắt nhận đơn khi ngoài khung giờ hoạt động
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-sm text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-sm text-emerald-400">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm">Đang tải lịch mở cửa...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Cấu hình 7 ngày trong tuần
                </span>
                <button
                  type="button"
                  onClick={() => handleApplyToAll(1)} // Lấy Thứ 2 làm chuẩn
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 transition-colors"
                  title="Sao chép giờ mở cửa của Thứ Hai cho cả tuần"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Áp dụng Thứ Hai cho cả tuần</span>
                </button>
              </div>

              {DAYS_OF_WEEK.map((d) => {
                const item = hours.find((h) => h.day_of_week === d.day) || {
                  day_of_week: d.day,
                  open_time: '08:00',
                  close_time: '22:00',
                  is_closed_all_day: false,
                };

                return (
                  <div
                    key={d.day}
                    className={`p-3.5 rounded-xl border transition-all ${
                      item.is_closed_all_day
                        ? 'bg-zinc-950/40 border-zinc-800/50 opacity-60'
                        : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                    } flex flex-col sm:flex-row sm:items-center justify-between gap-3`}
                  >
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <Calendar className="w-4 h-4 text-zinc-500" />
                      <span className="text-sm font-semibold text-white">{d.label}</span>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={item.is_closed_all_day}
                          onChange={(e) =>
                            handleChange(d.day, 'is_closed_all_day', e.target.checked)
                          }
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500/20"
                        />
                        <span className="text-xs text-zinc-400">Nghỉ cả ngày</span>
                      </label>

                      {!item.is_closed_all_day && (
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={item.open_time}
                            onChange={(e) => handleChange(d.day, 'open_time', e.target.value)}
                            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                          />
                          <span className="text-zinc-500 text-xs">-</span>
                          <input
                            type="time"
                            value={item.close_time}
                            onChange={(e) => handleChange(d.day, 'close_time', e.target.value)}
                            className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="px-5 py-2 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <span>Lưu Lịch Hoạt Động</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
