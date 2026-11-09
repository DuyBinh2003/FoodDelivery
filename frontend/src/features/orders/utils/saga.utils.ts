export type SagaStepId = 'CREATE_ORDER' | 'DEDUCT_PAYMENT' | 'DISPATCH_DRIVER';
export type SagaStepStatus = 'completed' | 'in_progress' | 'pending' | 'failed';

export function calculateSagaStepStatus(
  stepId: SagaStepId,
  currentStep: SagaStepId,
  isFailed: boolean,
): SagaStepStatus {
  const stepOrder: SagaStepId[] = ['CREATE_ORDER', 'DEDUCT_PAYMENT', 'DISPATCH_DRIVER'];
  const stepIndex = stepOrder.indexOf(stepId);
  const currentIndex = stepOrder.indexOf(currentStep);

  if (stepIndex < currentIndex) {
    return 'completed';
  }
  if (stepIndex === currentIndex) {
    return isFailed ? 'failed' : 'in_progress';
  }
  return 'pending';
}

export function formatSagaRefundSummary(
  refundAmount: number,
  pointsRefunded: number,
): { formattedMoney: string; formattedPoints: string; hasRefund: boolean } {
  return {
    formattedMoney: refundAmount > 0 ? `${refundAmount.toLocaleString('vi-VN')} VND` : '0 VND',
    formattedPoints: pointsRefunded > 0 ? `+${pointsRefunded.toLocaleString('vi-VN')} điểm` : '0 điểm',
    hasRefund: refundAmount > 0 || pointsRefunded > 0,
  };
}

export function injectIdempotencyHeader(
  method: string,
  existingHeaders: Record<string, string> = {},
  customKeyGenerator?: () => string,
): { headers: Record<string, string>; injected: boolean; key?: string } {
  const upperMethod = method.toUpperCase();
  const isMutating = ['POST', 'PUT', 'PATCH'].includes(upperMethod);

  const hasExisting = Object.keys(existingHeaders).some(
    (k) => k.toLowerCase() === 'idempotency-key' || k.toLowerCase() === 'x-idempotency-key',
  );

  if (!isMutating || hasExisting) {
    return { headers: { ...existingHeaders }, injected: false };
  }

  const key = customKeyGenerator ? customKeyGenerator() : 'idemp-generated-key';
  return {
    headers: {
      ...existingHeaders,
      'Idempotency-Key': key,
    },
    injected: true,
    key,
  };
}
