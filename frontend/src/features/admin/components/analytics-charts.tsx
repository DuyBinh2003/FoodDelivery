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

const COLORS = ['#16a34a', '#10b981', '#0ea5e9', '#eab308', '#6366f1'];

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
      <div className="bg-popover border border-border rounded-xl p-3 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-semibold text-foreground border-b border-border pb-1 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name === 'gmv' ? 'Tổng GMV' : 'Doanh thu sàn'}:
            </span>
            <span className="font-semibold text-foreground">{formatVND(entry.value)}</span>
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
      <div className="bg-popover border border-border rounded-xl p-3 shadow-xl text-xs space-y-1.5 backdrop-blur-md">
        <p className="font-semibold text-foreground border-b border-border pb-1 mb-1">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name === 'orders' ? 'Tổng số đơn' : 'Đơn hoàn tất'}:
            </span>
            <span className="font-semibold text-foreground">{entry.value} đơn</span>
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
      { name: 'Chiết khấu Nhà hàng', value: 70, color: '#16a34a' },
      { name: 'Chiết khấu Cuốc xe', value: 30, color: '#0ea5e9' },
    ];

  return (
    <div className="space-y-6">
      {/* Row 1: Area Chart (GMV & Doanh thu sàn) + Donut Chart (Cơ cấu doanh thu) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GMV & Revenue Area Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground tracking-tight">Xu hướng GMV & Doanh thu Sàn</h3>
              <p className="text-xs text-muted-foreground mt-0.5">So sánh tổng giá trị giao dịch và phần chiết khấu ròng giữ lại.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-primary font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                GMV
              </span>
              <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
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
                      <stop offset="5%" stopColor="#16a34a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground"
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
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorGmv)"
                  />
                  <Area
                    type="monotone"
                    dataKey="platform_revenue"
                    name="platform_revenue"
                    stroke="#0ea5e9"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Đang tổng hợp dữ liệu giao dịch...
              </div>
            )}
          </div>
        </div>

        {/* Revenue Breakdown Donut Chart */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground tracking-tight">Cơ Cấu Doanh Thu Sàn</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Tỷ trọng chiết khấu đơn ăn vs chiết khấu cuốc xe.</p>
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
                    backgroundColor: 'var(--popover)',
                    borderColor: 'var(--border)',
                    borderRadius: '12px',
                    color: 'var(--popover-foreground)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            {pieData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}
                  />
                  {item.name}
                </span>
                <span className="font-semibold text-foreground">
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
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground tracking-tight">Sản Lượng Đơn Hàng & Cuốc Xe</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Số lượng đơn phát sinh và tỷ lệ đơn hoàn thành theo ngày.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
                Tổng đơn
              </span>
              <span className="flex items-center gap-1.5 text-primary font-semibold">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary" />
                Hoàn thành
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {hasTimeseries ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeseries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="currentColor"
                    className="text-muted-foreground"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="orders" name="orders" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="completed_orders" name="completed_orders" fill="#16a34a" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Không có dữ liệu đơn hàng trong khoảng thời gian này.
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Pills */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-heading text-base font-bold text-foreground tracking-tight">Trạng Thái Đơn Hàng Hiện Tại</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Phân bổ các đơn hàng trên toàn hệ thống.</p>
          </div>

          <div className="space-y-3 my-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Đang chờ xử lý (PENDING)</span>
              <span className="text-sm font-bold text-foreground">{statusDistribution['PENDING'] || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-sky-500/10 border border-sky-500/25">
              <span className="text-xs font-semibold text-sky-700 dark:text-sky-300">Đang nấu / Chờ lấy (COOKING)</span>
              <span className="text-sm font-bold text-foreground">
                {(statusDistribution['COOKING'] || 0) + (statusDistribution['READY_FOR_PICKUP'] || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Đang giao hàng (DELIVERING)</span>
              <span className="text-sm font-bold text-foreground">{statusDistribution['DELIVERING'] || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/25">
              <span className="text-xs font-semibold text-primary">Đã giao hoàn tất (COMPLETED)</span>
              <span className="text-sm font-bold text-foreground">{statusDistribution['COMPLETED'] || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-border">
              <span className="text-xs font-semibold text-muted-foreground">Đã hủy (CANCELLED)</span>
              <span className="text-sm font-bold text-foreground">{statusDistribution['CANCELLED'] || 0}</span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground text-center">
            Cập nhật tự động đồng bộ theo thời gian thực
          </div>
        </div>
      </div>
    </div>
  );
};
