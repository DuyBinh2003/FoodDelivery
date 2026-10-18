'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/features/admin/api/admin-api';
import { SystemConfigItem, ConfigCategory, ConfigDefinition } from '@/features/admin/types';
import {
  Save,
  RotateCcw,
  Coins,
  Compass,
  FileSpreadsheet,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CONFIG_DEFINITIONS: ConfigDefinition[] = [
  // 1. Finance & Rates
  {
    key: 'RESTAURANT_COMMISSION_RATE',
    label: 'Hoa hồng chiết khấu nhà hàng',
    description: 'Tỷ lệ phần trăm doanh thu đơn hàng sàn trích thu từ quán ăn đối tác.',
    category: 'FINANCE',
    type: 'number',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: 'DRIVER_FEE_RATE',
    label: 'Phí nền tảng cuốc xe tài xế',
    description: 'Tỷ lệ phần trăm phí giao hàng sàn khấu trừ từ mỗi cuốc xe hoàn tất.',
    category: 'FINANCE',
    type: 'number',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: 'TAX_RATE',
    label: 'Thuế suất VAT',
    description: 'Thuế suất giá trị gia tăng áp dụng cho các giao dịch trong hệ thống.',
    category: 'FINANCE',
    type: 'number',
    unit: '%',
    min: 0,
    max: 100,
    step: 1,
  },
  {
    key: 'BASE_DELIVERY_FEE_VND',
    label: 'Cước phí giao hàng cơ sở',
    description: 'Mức cước vận chuyển khởi điểm tối thiểu cho mỗi cuốc giao đồ ăn.',
    category: 'FINANCE',
    type: 'number',
    unit: 'VNĐ',
    min: 0,
    step: 1000,
  },
  {
    key: 'MIN_ORDER_AMOUNT_VND',
    label: 'Giá trị đơn hàng tối thiểu',
    description: 'Giá trị giỏ hàng tối thiểu khách hàng phải đạt để có thể tiến hành đặt món.',
    category: 'FINANCE',
    type: 'number',
    unit: 'VNĐ',
    min: 0,
    step: 5000,
  },

  // 2. Operations & Dispatch
  {
    key: 'MAX_DELIVERY_RADIUS_KM',
    label: 'Bán kính giao hàng tối đa',
    description: 'Khoảng cách cự ly địa lý tối đa giữa nhà hàng và địa chỉ nhận của khách.',
    category: 'OPERATIONS',
    type: 'number',
    unit: 'km',
    min: 1,
    max: 100,
    step: 1,
  },
  {
    key: 'DRIVER_ACCEPT_TIMEOUT_SECONDS',
    label: 'Thời gian đếm ngược nhận cuốc',
    description: 'Khoảng thời gian tài xế có thể phản hồi chấp nhận chuyến trước khi chuyển tài xế khác.',
    category: 'OPERATIONS',
    type: 'number',
    unit: 'giây',
    min: 10,
    max: 120,
    step: 5,
  },
  {
    key: 'AUTO_CANCEL_UNACCEPTED_ORDER_MINUTES',
    label: 'Thời gian tự hủy đơn chờ xử lý',
    description: 'Hạn mức thời gian tự động hủy đơn nếu không có quán xác nhận hoặc tài xế nhận cuốc.',
    category: 'OPERATIONS',
    type: 'number',
    unit: 'phút',
    min: 5,
    max: 60,
    step: 5,
  },

  // 3. Pagination & Limits
  {
    key: 'DEFAULT_PAGE_SIZE',
    label: 'Kích thước trang mặc định (Page Size)',
    description: 'Số lượng bản ghi hiển thị mặc định trên mỗi trang danh sách (Đơn hàng, Người dùng, Sổ cái...).',
    category: 'PAGINATION',
    type: 'select',
    options: [
      { label: '10 bản ghi / trang', value: '10' },
      { label: '15 bản ghi / trang (Khuyên dùng)', value: '15' },
      { label: '20 bản ghi / trang', value: '20' },
      { label: '50 bản ghi / trang', value: '50' },
    ],
  },
  {
    key: 'MAX_EXPORT_LIMIT',
    label: 'Giới hạn số dòng trích xuất dữ liệu',
    description: 'Số lượng bản ghi tối đa cho phép xuất báo cáo hoặc trích xuất file Excel/CSV.',
    category: 'PAGINATION',
    type: 'number',
    unit: 'dòng',
    min: 50,
    max: 2000,
    step: 50,
  },

  // 4. System & Security
  {
    key: 'MAINTENANCE_MODE',
    label: 'Chế độ bảo trì hệ thống',
    description: 'Khi kích hoạt, hệ thống sẽ tạm dừng tiếp nhận đơn hàng mới trên toàn bộ ứng dụng người dùng.',
    category: 'SYSTEM',
    type: 'boolean',
  },
  {
    key: 'AUTO_APPROVE_PARTNERS',
    label: 'Tự động duyệt đối tác đăng ký',
    description: 'Tự động cấp quyền hoạt động ngay cho hồ sơ Quán ăn và Tài xế mới mà không cần qua thẩm định thủ công.',
    category: 'SYSTEM',
    type: 'boolean',
  },
];

const TABS: Array<{ id: ConfigCategory; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'FINANCE', label: 'Tài Chính & Thuế', icon: Coins },
  { id: 'OPERATIONS', label: 'Vận Hành & Điều Phối', icon: Compass },
  { id: 'PAGINATION', label: 'Phân Trang & Hiển Thị', icon: FileSpreadsheet },
  { id: 'SYSTEM', label: 'Hệ Thống & Bảo Trì', icon: ShieldAlert },
];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ConfigCategory>('FINANCE');
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const { data: configsData = [], isLoading } = useQuery<SystemConfigItem[]>({
    queryKey: ['admin', 'configs'],
    queryFn: () => adminApi.getConfigs(),
  });

  const originalData = useMemo(() => {
    const initial: Record<string, string> = {};
    configsData.forEach((c) => {
      initial[c.config_key] = c.config_value;
    });

    CONFIG_DEFINITIONS.forEach((def) => {
      if (initial[def.key] === undefined) {
        initial[def.key] = def.type === 'boolean' ? 'false' : (def.type === 'select' ? '15' : '0');
      }
    });

    return initial;
  }, [configsData]);

  const formData = useMemo(() => {
    return { ...originalData, ...edits };
  }, [originalData, edits]);

  const isDirty = useMemo(() => {
    return Object.keys(edits).some((key) => edits[key] !== originalData[key]);
  }, [edits, originalData]);

  const changedCount = useMemo(() => {
    return Object.keys(edits).filter((key) => edits[key] !== originalData[key]).length;
  }, [edits, originalData]);

  const handleInputChange = (key: string, value: string) => {
    setEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleReset = () => {
    setEdits({});
    toast.success('Đã hoàn tác các thay đổi chưa lưu');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirty) {
      toast('Không có thay đổi nào cần lưu', { icon: 'ℹ️' });
      return;
    }

    setSaving(true);
    try {
      const payload = Object.entries(formData).map(([key, value]) => ({ key, value }));
      await adminApi.updateBulkConfigs(payload);
      setEdits({});
      queryClient.invalidateQueries({ queryKey: ['admin', 'configs'] });
      toast.success('Cập nhật cấu hình hệ thống thành công!');
    } catch (error) {
      console.error('Failed to save configs:', error);
      toast.error('Lưu cấu hình thất bại, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const currentTabConfigs = useMemo(() => {
    return CONFIG_DEFINITIONS.filter((def) => def.category === activeTab);
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-10 h-10 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
        <p className="text-sm text-zinc-400">Đang tải các thông số cấu hình hệ thống...</p>
      </div>
    );
  }

  const isMaintenanceActive = formData['MAINTENANCE_MODE'] === 'true';

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Cài Đặt Hệ Thống</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
              System Control
            </span>
            {isDirty && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                {changedCount} thay đổi chưa lưu
              </span>
            )}
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Quản trị các biến số kinh doanh, thuật toán vận hành, phân trang hiển thị và trạng thái nền tảng.
          </p>
        </div>

        {/* Global Save Actions */}
        <div className="flex items-center gap-3">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium rounded-xl border border-zinc-800 transition-colors text-sm"
            >
              <RotateCcw className="w-4 h-4" />
              Hoàn tác
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 text-sm"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Lưu thay đổi
          </button>
        </div>
      </div>

      {/* Maintenance Mode Alert Banner if active */}
      {isMaintenanceActive && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-amber-300">Hệ thống đang ở Chế độ Bảo trì (Maintenance Mode)</h4>
            <p className="text-xs text-amber-400/80 mt-0.5">
              Khách hàng không thể tạo đơn hàng mới. Chỉ tài khoản Quản trị viên mới có quyền truy cập các cổng nghiệp vụ.
            </p>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-zinc-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Settings Form Body */}
      <form onSubmit={handleSave} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="space-y-6 divide-y divide-zinc-800/80">
          {currentTabConfigs.map((config) => {
            const currentValue = formData[config.key] ?? '';
            const isChanged = currentValue !== originalData[config.key];

            return (
              <div
                key={config.key}
                className={`pt-6 first:pt-0 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isChanged ? 'bg-orange-500/[0.02] -mx-4 px-4 py-3 rounded-xl' : ''
                }`}
              >
                {/* Info side */}
                <div className="max-w-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <label htmlFor={config.key} className="text-sm font-semibold text-zinc-200">
                      {config.label}
                    </label>
                    {isChanged && (
                      <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" title="Giá trị đã sửa đổi" />
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{config.description}</p>
                  <p className="text-[11px] font-mono text-zinc-500">Mã cấu hình: {config.key}</p>
                </div>

                {/* Input Control side */}
                <div className="w-full md:w-80 flex items-center justify-end">
                  {config.type === 'boolean' ? (
                    <button
                      type="button"
                      id={config.key}
                      onClick={() => handleInputChange(config.key, currentValue === 'true' ? 'false' : 'true')}
                      className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
                        currentValue === 'true' ? 'bg-orange-500' : 'bg-zinc-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          currentValue === 'true' ? 'translate-x-7' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ) : config.type === 'select' ? (
                    <div className="relative w-full">
                      <select
                        id={config.key}
                        value={currentValue}
                        onChange={(e) => handleInputChange(config.key, e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all appearance-none cursor-pointer"
                      >
                        {config.options?.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-zinc-900 text-white">
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-500">
                        ▼
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full">
                      <input
                        id={config.key}
                        type="number"
                        min={config.min}
                        max={config.max}
                        step={config.step || 1}
                        value={currentValue}
                        onChange={(e) => handleInputChange(config.key, e.target.value)}
                        className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all pr-14"
                      />
                      {config.unit && (
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {config.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Save Bar */}
        <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Cấu hình được lưu vào bảng cơ sở dữ liệu <span className="font-mono text-zinc-400">m_system_config</span> và có hiệu lực tức thì.
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Khôi phục ban đầu
              </button>
            )}

            <button
              type="submit"
              disabled={saving || !isDirty}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 text-sm"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Lưu thay đổi
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
