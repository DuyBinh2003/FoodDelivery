'use client';

import React, { useState } from 'react';
import { useOrderTracking } from '@/features/orders/hooks/useOrderTracking';
import { OrderReviewModal } from '@/features/orders/components/OrderReviewModal';
import { OrderLiveChatWidget } from '@/features/orders/components/OrderLiveChatWidget';
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
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Hook kết nối Server-Sent Events (SSE) thời gian thực & hỗ trợ cancel
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
        <OrderLiveStepper
          currentStatus={activeOrder.status}
          milestones={{
            created_at: activeOrder.created_at,
            cooking_at: activeOrder.cooking_at,
            ready_at: activeOrder.ready_at,
            driver_claimed_at: activeOrder.driver_claimed_at,
            completed_at: activeOrder.completed_at,
          }}
        />
      </div>

      {/* 4. Driver Information Card (Delivering or Completed) */}
      {hasDriver && activeOrder.driver && (
        <OrderDriverCard
          driver={activeOrder.driver}
          onOpenChat={() => setIsChatOpen(true)}
        />
      )}

      {/* 5. Visual Route Animation Map (From Restaurant to Customer) */}
      {activeOrder.status !== 'CANCELLED' && (
        <OrderVisualRoute
          orderId={activeOrder.id}
          status={activeOrder.status}
          restaurantName={activeOrder.restaurant_name}
          restaurantAddress={activeOrder.restaurant_address}
          restaurantLat={activeOrder.restaurant_lat}
          restaurantLng={activeOrder.restaurant_lng}
          deliveryAddress={activeOrder.delivery_address}
          deliveryLat={activeOrder.delivery_lat}
          deliveryLng={activeOrder.delivery_lng}
          distanceKm={activeOrder.distance_km}
          driverName={activeOrder.driver?.name}
          driverId={activeOrder.driver_id}
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

      {/* 9. Real-time Live Chat Widget (Floating Action Button & Chat Drawer) */}
      <OrderLiveChatWidget
        orderId={activeOrder.id}
        driverName={activeOrder.driver?.name || 'Tài xế giao hàng'}
        restaurantName={activeOrder.restaurant_name}
        role="CUSTOMER"
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />
    </div>
  );
}
