'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { AnalyticsTimeseriesPoint, RevenueBreakdownItem } from '@/features/admin/types';

interface AnalyticsChartsProps {
  timeseries: AnalyticsTimeseriesPoint[];
  revenueBreakdown: RevenueBreakdownItem[];
  statusDistribution: Record<string, number>;
}

const COLORS = ['#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const formatVND = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomAreaTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name === 'gmv' ? 'Tổng GMV' : 'Doanh thu sàn'}:
            </span>
            <span className="font-semibold text-white">{formatVND(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name === 'orders' ? 'Tổng số đơn' : 'Đơn hoàn tất'}:
            </span>
            <span className="font-semibold text-white">{entry.value} đơn</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({
  timeseries,
  revenueBreakdown,
  statusDistribution,
}) => {
  const hasTimeseries = timeseries && timeseries.length > 0;
  const filteredBreakdown = revenueBreakdown.filter((item) => item.value > 0);
  const pieData = filteredBreakdown.length > 0
    ? filteredBreakdown
    : [
        { name: 'Chiết khấu Nhà hàng', value: 70, color: '#f97316' },
        { name: 'Chiết khấu Cuốc xe', value: 30, color: '#10b981' },
      ];

  return (
    <div className="space-y-6">
      {/* Row 1: Area Chart (GMV & Doanh thu sàn) + Donut Chart (Cơ cấu doanh thu) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GMV & Revenue Area Chart */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Xu hướng GMV & Doanh thu Sàn</h3>
              <p className="text-xs text-zinc-400 mt-0.5">So sánh tổng giá trị giao dịch và phần chiết khấu ròng giữ lại.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-orange-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                GMV
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Doanh thu sàn
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            {hasTimeseries ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => (val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${(val / 1000).toFixed(0)}k`)}
                  />
                  <Tooltip content={<CustomAreaTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="gmv"
                    name="gmv"
                    stroke="#f97316"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorGmv)"
                  />
                  <Area
                    type="monotone"
                    dataKey="platform_revenue"
                    name="platform_revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                Đang tổng hợp dữ liệu giao dịch...
              </div>
            )}
          </div>
        </div>

        {/* Revenue Breakdown Donut Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Cơ Cấu Doanh Thu Sàn</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Tỷ trọng chiết khấu đơn ăn vs chiết khấu cuốc xe.</p>
          </div>

          <div className="h-52 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    typeof value === 'number' && value > 100 ? formatVND(value) : `${value}%`,
                    String(name),
                  ]}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-zinc-800/80 pt-3">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-zinc-300">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-semibold text-white">
                  {item.value > 100 ? formatVND(item.value) : `${item.value}%`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Order Volume Bar Chart & Order Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Volume Bar Chart */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Sản Lượng Đơn Hàng & Cuốc Xe</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Số lượng đơn phát sinh và tỷ lệ đơn hoàn thành theo ngày.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                Tổng đơn
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Hoàn thành
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {hasTimeseries ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#27272a' }}
                  />
                  <YAxis
                    stroke="#71717a"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="orders" name="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="completed_orders" name="completed_orders" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                Không có dữ liệu đơn hàng trong khoảng thời gian này.
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Pills */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Trạng Thái Đơn Hàng Hiện Tại</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Phân bổ các đơn hàng trên toàn hệ thống.</p>
          </div>

          <div className="space-y-3 my-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <span className="text-xs font-medium text-amber-400">Đang chờ xử lý (PENDING)</span>
              <span className="text-sm font-bold text-white">{statusDistribution['PENDING'] || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="text-xs font-medium text-orange-400">Đang nấu / Chờ lấy (COOKING)</span>
              <span className="text-sm font-bold text-white">
                {(statusDistribution['COOKING'] || 0) + (statusDistribution['READY_FOR_PICKUP'] || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <span className="text-xs font-medium text-blue-400">Đang giao hàng (DELIVERING)</span>
              <span className="text-sm font-bold text-white">{statusDistribution['DELIVERING'] || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-medium text-emerald-400">Đã giao hoàn tất (COMPLETED)</span>
              <span className="text-sm font-bold text-white">{statusDistribution['COMPLETED'] || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/40">
              <span className="text-xs font-medium text-zinc-400">Đã hủy (CANCELLED)</span>
              <span className="text-sm font-bold text-zinc-300">{statusDistribution['CANCELLED'] || 0}</span>
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 text-center">
            Cập nhật tự động đồng bộ theo thời gian thực
          </div>
        </div>
      </div>
    </div>
  );
};
