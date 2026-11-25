'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
  { status: 'PENDING', label: 'Chờ nhận', sublabel: 'Tiếp nhận đơn', icon: Clock },
  { status: 'COOKING', label: 'Bếp nấu', sublabel: 'Chế biến món', icon: ChefHat },
  { status: 'READY_FOR_PICKUP', label: 'Tìm xế', sublabel: 'Phát sóng tìm', icon: Radio },
  { status: 'DELIVERING', label: 'Đang giao', sublabel: 'Tài xế giao hàng', icon: Truck },
  { status: 'COMPLETED', label: 'Đã giao', sublabel: 'Giao tận tay', icon: Package },
];

function getStatusIndex(status: OrderStatus): number {
  if (status === 'ACCEPTED') return 1;
  const idx = STEPS.findIndex((s) => s.status === status);
  return idx >= 0 ? idx : 0;
}

function formatStepTime(timeStr?: string | null): string | null {
  if (!timeStr) return null;
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function OrderLiveStepper({ currentStatus, milestones }: OrderLiveStepperProps) {
  if (currentStatus === 'CANCELLED') {
    return (
      <div className="py-3 px-2">
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/25 text-destructive">
          <XCircle className="w-5 h-5 shrink-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold">Tiến trình đã dừng:</span> Đơn hàng đã được đánh dấu hủy và không còn tiếp tục luân chuyển.
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = getStatusIndex(currentStatus);

  const stepTimes: Record<OrderStatus, string | null> = {
    PENDING: formatStepTime(milestones?.created_at),
    COOKING: formatStepTime(milestones?.cooking_at),
    READY_FOR_PICKUP: formatStepTime(milestones?.ready_at),
    DELIVERING: formatStepTime(milestones?.driver_claimed_at),
    COMPLETED: formatStepTime(milestones?.completed_at),
    ACCEPTED: null,
    CANCELLED: null,
  };

  return (
    <div className="w-full py-4 sm:py-6">
      <div className="relative">
        {/* Track Line Background */}
        <div className="absolute top-5 left-[10%] right-[10%] h-1.5 bg-muted rounded-full" />

        {/* Track Line Active Fill */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(currentIndex / (STEPS.length - 1)) * 80}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-5 left-[10%] h-1.5 bg-primary rounded-full shadow-xs"
        />

        {/* Steps */}
        <div className="flex items-start justify-between relative z-10">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isPending = index > currentIndex;
            const Icon = step.icon;
            const stepTime = stepTimes[step.status];

            return (
              <div
                key={step.status}
                className="flex flex-col items-center text-center"
                style={{ width: `${100 / STEPS.length}%` }}
              >
                <motion.div
                  animate={isCurrent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={isCurrent ? { repeat: Infinity, duration: 2.2 } : undefined}
                  className={cn(
                    'w-10 h-10 rounded-2xl flex items-center justify-center transition-colors duration-300',
                    isCompleted && 'bg-primary text-primary-foreground shadow-sm',
                    isCurrent &&
                      'bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-4 ring-primary/20',
                    isPending && 'bg-secondary border border-border text-muted-foreground',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </motion.div>

                <span
                  className={cn(
                    'mt-2.5 text-xs font-bold tracking-tight transition-colors duration-300',
                    (isCurrent || isCompleted) && 'text-primary',
                    isPending && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>

                {stepTime && (isCompleted || isCurrent) ? (
                  <span className="mt-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border">
                    {stepTime}
                  </span>
                ) : (
                  <span className="text-[10px] mt-0.5 hidden sm:inline-block leading-tight text-muted-foreground">
                    {step.sublabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
