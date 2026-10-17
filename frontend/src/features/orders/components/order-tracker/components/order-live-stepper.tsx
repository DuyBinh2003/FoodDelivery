'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Clock, ChefHat, Radio, Truck, Package, XCircle } from 'lucide-react';
import type { OrderStatus } from '@/features/orders/types';
import type { OrderLiveStepperProps } from '../types';

interface StepDef {
  status: OrderStatus;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}

const STEPS: StepDef[] = [
  {
    status: 'PENDING',
    label: 'Chờ nhận',
    sublabel: 'Tiếp nhận đơn',
    icon: Clock,
  },
  {
    status: 'COOKING',
    label: 'Bếp nấu',
    sublabel: 'Chế biến món',
    icon: ChefHat,
  },
  {
    status: 'READY_FOR_PICKUP',
    label: 'Tìm xế',
    sublabel: 'Phát sóng tìm',
    icon: Radio,
  },
  {
    status: 'DELIVERING',
    label: 'Đang giao',
    sublabel: 'Tài xế giao hàng',
    icon: Truck,
  },
  {
    status: 'COMPLETED',
    label: 'Đã giao',
    sublabel: 'Giao tận tay',
    icon: Package,
  },
];

function getStatusIndex(status: OrderStatus): number {
  if (status === 'ACCEPTED') return 1; // Map ACCEPTED into COOKING step
  const idx = STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

export function OrderLiveStepper({ currentStatus }: OrderLiveStepperProps) {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="py-4 px-2">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-semibold text-rose-200">Tiến trình đã dừng:</span> Đơn hàng đã được đánh dấu hủy và không còn tiếp tục luân chuyển.
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = getStatusIndex(currentStatus);

  return (
    <div className="w-full py-4 sm:py-6">
      <div className="relative">
        {/* Track Line Background */}
        <div className="absolute top-5 left-[10%] right-[10%] h-1 bg-white/[0.08] rounded-full" />

        {/* Track Line Active Fill */}
        <div
          className="absolute top-5 left-[10%] h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-700 ease-out shadow-sm shadow-orange-500/30"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 80}%` }}
        />

        {/* Steps */}
        <div className="flex items-start justify-between relative z-10">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;
            const Icon = step.icon;

            return (
              <div
                key={step.status}
                className="flex flex-col items-center text-center"
                style={{ width: `${100 / STEPS.length}%` }}
              >
                {/* Node Circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 backdrop-blur-md',
                    isCompleted &&
                      'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 scale-100',
                    isCurrent &&
                      'bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white shadow-xl shadow-orange-500/40 ring-4 ring-orange-500/25 scale-110 animate-pulse',
                    isPending &&
                      'bg-zinc-900/90 border border-white/10 text-zinc-500 opacity-60'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Step Label */}
                <span
                  className={cn(
                    'mt-2.5 text-xs font-bold tracking-tight transition-colors duration-300',
                    isCurrent && 'text-orange-400 font-extrabold',
                    isCompleted && 'text-emerald-400',
                    isPending && 'text-zinc-500'
                  )}
                >
                  {step.label}
                </span>

                {/* Sublabel (Hidden on small mobile) */}
                <span
                  className={cn(
                    'text-[10px] mt-0.5 hidden sm:inline-block leading-tight transition-colors duration-300',
                    isCurrent && 'text-zinc-300',
                    isCompleted && 'text-zinc-400',
                    isPending && 'text-zinc-600'
                  )}
                >
                  {step.sublabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
