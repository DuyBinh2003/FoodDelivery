'use client';

import React, { useState } from 'react';
import { useOrderTracking } from '@/features/orders/hooks/useOrderTracking';
import { OrderReviewModal } from '@/features/orders/components/OrderReviewModal';
import { OrderLiveHeader } from './components/order-live-header';
import { OrderStatusBanner } from './components/order-status-banner';
import { OrderLiveStepper } from './components/order-live-stepper';
import { OrderDriverCard } from './components/order-driver-card';
import { OrderVisualRoute } from './components/order-visual-route';
import { OrderStoreCard } from './components/order-store-card';
import { OrderBillCard } from './components/order-bill-card';
import { OrderActionBar } from './components/order-action-bar';
import type { OrderTrackerProps } from './types';

export default function OrderTracker({ order: initialOrder, paymentDetails }: OrderTrackerProps) {
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Hook kết nối Smart Polling (3s) vào Redis In-flight Cache & hỗ trợ cancel
  const {
    order,
    isFetching,
    dataUpdatedAt,
    refetch,
    cancelOrder,
    isCancelling,
  } = useOrderTracking(initialOrder.id, initialOrder);

  const activeOrder = order || initialOrder;
  const isLive = activeOrder.status !== 'COMPLETED' && activeOrder.status !== 'CANCELLED';

  const hasDriver =
    (activeOrder.status === 'DELIVERING' || activeOrder.status === 'COMPLETED') &&
    (activeOrder.driver || activeOrder.driver_id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 1. Header with Live Pulse and Manual Refresh */}
      <OrderLiveHeader
        orderId={activeOrder.id}
        isLive={isLive}
        isFetching={isFetching}
        dataUpdatedAt={dataUpdatedAt}
        onRefresh={() => refetch()}
      />

      {/* 2. Hero Status Banner with dynamic visual & explanations */}
      <OrderStatusBanner
        status={activeOrder.status}
        estimatedDeliveryTime={activeOrder.estimated_delivery_time}
      />

      {/* 3. 5-Step Progressive Stepper */}
      <div className="rounded-2xl bg-zinc-900/80 border border-white/[0.08] p-5 shadow-lg shadow-black/20 backdrop-blur-md">
        <OrderLiveStepper currentStatus={activeOrder.status} />
      </div>

      {/* 4. Driver Information Card (Delivering or Completed) */}
      {hasDriver && activeOrder.driver && (
        <OrderDriverCard driver={activeOrder.driver} />
      )}

      {/* 5. Visual Route Animation Map (From Restaurant to Customer) */}
      {activeOrder.status !== 'CANCELLED' && (
        <OrderVisualRoute
          status={activeOrder.status}
          restaurantName={activeOrder.restaurant_name}
          deliveryAddress={activeOrder.delivery_address}
          driverName={activeOrder.driver?.name}
        />
      )}

      {/* 6. Grid: Store & Delivery Address vs Bill & Payment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <OrderStoreCard
          restaurantName={activeOrder.restaurant_name}
          restaurantAddress={activeOrder.restaurant_address}
          deliveryAddress={activeOrder.delivery_address}
          note={activeOrder.note}
        />

        <OrderBillCard
          order={activeOrder}
          paymentDetails={paymentDetails}
        />
      </div>

      {/* 7. Action Bar (Cancel, Review, Re-order) */}
      <OrderActionBar
        status={activeOrder.status}
        orderId={activeOrder.id}
        onCancel={() => cancelOrder()}
        isCancelling={isCancelling}
        onOpenReview={() => setIsReviewModalOpen(true)}
        hasReview={Boolean(activeOrder.review)}
      />

      {/* 8. Order Review Modal */}
      <OrderReviewModal
        orderId={activeOrder.id}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
      />
    </div>
  );
}
