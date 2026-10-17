import { cn } from '@/lib/utils';
import { Check, Clock, ChefHat, Truck, Package } from 'lucide-react';
import type { OrderStatus } from '@/features/orders/types';

interface OrderStepperProps {
  currentStatus: OrderStatus;
}

const STEPS: { status: OrderStatus; label: string; icon: React.ElementType }[] = [
  { status: 'PENDING', label: 'Chờ xác nhận', icon: Clock },
  { status: 'COOKING', label: 'Đang nấu', icon: ChefHat },
  { status: 'READY_FOR_PICKUP', label: 'Tìm tài xế', icon: Check },
  { status: 'DELIVERING', label: 'Đang giao', icon: Truck },
  { status: 'COMPLETED', label: 'Hoàn thành', icon: Package },
];

function getStepIndex(status: OrderStatus): number {
  if (status === 'ACCEPTED') return 1;
  const index = STEPS.findIndex((s) => s.status === status);
  return index >= 0 ? index : 0;
}

export default function OrderStepper({ currentStatus }: OrderStepperProps) {
  const currentIndex = getStepIndex(currentStatus);

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Progress bar background */}
        <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-white/10" />

        {/* Progress bar fill */}
        <div
          className="absolute top-5 left-[10%] h-0.5 bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-700 ease-out"
          style={{
            width: `${(currentIndex / (STEPS.length - 1)) * 80}%`,
          }}
        />

        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const Icon = step.icon;

          return (
            <div
              key={step.status}
              className="relative flex flex-col items-center z-10"
              style={{ width: `${100 / STEPS.length}%` }}
            >
              {/* Circle */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500',
                  isCompleted && 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/30',
                  isCurrent && 'bg-gradient-to-br from-orange-500 to-red-600 shadow-lg shadow-orange-500/40 ring-4 ring-orange-500/20 animate-pulse',
                  isPending && 'bg-white/5 border border-white/10'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 transition-colors duration-500',
                    (isCompleted || isCurrent) ? 'text-white' : 'text-zinc-600'
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  'mt-3 text-xs font-medium text-center transition-colors duration-500',
                  isCurrent && 'text-orange-400',
                  isCompleted && 'text-zinc-300',
                  isPending && 'text-zinc-600'
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
