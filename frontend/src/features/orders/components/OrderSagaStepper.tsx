'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Loader2, AlertCircle, ShoppingBag, CreditCard, Navigation } from 'lucide-react';

export type SagaStepId = 'CREATE_ORDER' | 'DEDUCT_PAYMENT' | 'DISPATCH_DRIVER';
export type SagaStepStatus = 'completed' | 'in_progress' | 'pending' | 'failed';

export interface SagaStepItem {
  id: SagaStepId;
  label: string;
  description: string;
  status: SagaStepStatus;
}

interface OrderSagaStepperProps {
  currentStep?: SagaStepId;
  isFailed?: boolean;
  failedReason?: string;
  className?: string;
}

export function OrderSagaStepper({
  currentStep = 'CREATE_ORDER',
  isFailed = false,
  failedReason,
  className,
}: OrderSagaStepperProps) {
  const steps: SagaStepItem[] = [
    {
      id: 'CREATE_ORDER',
      label: 'Khởi tạo đơn hàng',
      description: 'Lưu trữ snapshot & giữ chỗ món ăn',
      status:
        currentStep === 'CREATE_ORDER'
          ? isFailed
            ? 'failed'
            : 'in_progress'
          : 'completed',
    },
    {
      id: 'DEDUCT_PAYMENT',
      label: 'Xác thực thanh toán',
      description: 'Hạch toán số dư ví & Sổ cái kép',
      status:
        currentStep === 'CREATE_ORDER'
          ? 'pending'
          : currentStep === 'DEDUCT_PAYMENT'
            ? isFailed
              ? 'failed'
              : 'in_progress'
            : 'completed',
    },
    {
      id: 'DISPATCH_DRIVER',
      label: 'Điều phối tài xế',
      description: 'Tìm kiếm tài xế gần nhất trong bán kính',
      status:
        currentStep === 'DISPATCH_DRIVER'
          ? isFailed
            ? 'failed'
            : 'in_progress'
          : currentStep === 'CREATE_ORDER' || currentStep === 'DEDUCT_PAYMENT'
            ? 'pending'
            : 'completed',
    },
  ];

  const getStepIcon = (id: SagaStepId, status: SagaStepStatus) => {
    if (status === 'completed') {
      return <Check className="w-5 h-5 text-white" />;
    }
    if (status === 'in_progress') {
      return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
    }
    if (status === 'failed') {
      return <AlertCircle className="w-5 h-5 text-destructive" />;
    }

    switch (id) {
      case 'CREATE_ORDER':
        return <ShoppingBag className="w-5 h-5 text-muted-foreground" />;
      case 'DEDUCT_PAYMENT':
        return <CreditCard className="w-5 h-5 text-muted-foreground" />;
      case 'DISPATCH_DRIVER':
        return <Navigation className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className={cn('bg-card border border-border rounded-2xl p-6 shadow-sm', className)}>
      <h3 className="text-lg font-semibold text-foreground mb-1">Tiến trình xử lý phân tán (Saga)</h3>
      <p className="text-sm text-muted-foreground mb-6">
        Hệ thống đang phối hợp các dịch vụ để xác thực và đảm bảo tính nhất quán đơn hàng.
      </p>

      <div className="space-y-6">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-start gap-4 relative">
            {/* Connecting line */}
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'absolute left-5 top-10 w-0.5 h-10 -ml-px transition-colors duration-300',
                  step.status === 'completed' ? 'bg-primary' : 'bg-muted',
                )}
              />
            )}

            {/* Icon circle */}
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
                step.status === 'completed' && 'bg-primary text-primary-foreground shadow-sm',
                step.status === 'in_progress' && 'bg-primary/10 border-2 border-primary',
                step.status === 'failed' && 'bg-destructive/10 border-2 border-destructive',
                step.status === 'pending' && 'bg-muted border border-border',
              )}
            >
              {getStepIcon(step.id, step.status)}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between">
                <p
                  className={cn(
                    'font-medium text-sm',
                    step.status === 'completed' && 'text-foreground',
                    step.status === 'in_progress' && 'text-primary font-semibold',
                    step.status === 'failed' && 'text-destructive font-semibold',
                    step.status === 'pending' && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </p>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    step.status === 'completed' && 'bg-primary/10 text-primary',
                    step.status === 'in_progress' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400 animate-pulse',
                    step.status === 'failed' && 'bg-destructive/10 text-destructive',
                    step.status === 'pending' && 'bg-muted text-muted-foreground',
                  )}
                >
                  {step.status === 'completed' && 'Hoàn tất'}
                  {step.status === 'in_progress' && 'Đang xử lý...'}
                  {step.status === 'failed' && 'Thất bại'}
                  {step.status === 'pending' && 'Chờ duyệt'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {isFailed && failedReason && (
        <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Chuỗi giao dịch bù trừ (Compensating Saga) đã kích hoạt</p>
            <p className="text-xs mt-1 text-destructive/90">{failedReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}
export default OrderSagaStepper;
