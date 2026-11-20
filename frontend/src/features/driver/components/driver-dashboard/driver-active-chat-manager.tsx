'use client';

import React, { useState } from 'react';
import { MessageSquare, X, ArrowRight } from 'lucide-react';
import type { DriverTrip } from '@/features/driver/types/driver.types';
import { useOrderChat, type ChatMessage } from '@/features/orders/hooks/useOrderChat';
import { OrderLiveChatWidget } from '@/features/orders/components/OrderLiveChatWidget';

interface DriverActiveChatManagerProps {
  trips: DriverTrip[];
}

export function DriverActiveChatManager({ trips }: DriverActiveChatManagerProps) {
  const activeTrips = trips.filter((t) =>
    ['ACCEPTED', 'COOKING', 'READY_FOR_PICKUP', 'DELIVERING'].includes(t.status),
  );

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [incomingAlert, setIncomingAlert] = useState<{
    msg: ChatMessage;
    trip: DriverTrip;
  } | null>(null);

  // Chọn trip đầu tiên nếu chưa chọn
  const activeTrip =
    activeTrips.find((t) => t.order_id === selectedOrderId) || activeTrips[0];
  const currentOrderId = activeTrip?.order_id || '';

  const { unreadCount } = useOrderChat({
    orderId: currentOrderId,
    role: 'DRIVER',
    enabled: Boolean(currentOrderId),
    onNewMessage: (newMsg) => {
      if (newMsg.sender_role === 'CUSTOMER') {
        setIncomingAlert({
          msg: newMsg,
          trip: activeTrip,
        });
      }
    },
  });

  if (activeTrips.length === 0 || !activeTrip) {
    return null;
  }

  const handleOpenChat = (orderId?: string) => {
    if (orderId) setSelectedOrderId(orderId);
    setIsChatOpen(true);
    setIncomingAlert(null);
  };

  return (
    <>
      {/* 1. Incoming Message Floating Toast Notification */}
      {incomingAlert && !isChatOpen && (
        <div className="fixed top-20 right-5 z-50 max-w-sm w-full bg-zinc-900/95 border-2 border-orange-500/50 rounded-2xl p-4 shadow-2xl shadow-orange-500/20 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 animate-pulse">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>Khách hàng nhắn tin</span>
                  <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-mono">
                    #{incomingAlert.trip.order_id.slice(0, 8)}
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400">
                  {incomingAlert.trip.recipient_name || 'Khách hàng'} • {incomingAlert.trip.pickup_name}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIncomingAlert(null)}
              className="text-zinc-500 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-2.5 bg-zinc-950/70 border border-white/5 rounded-xl p-2.5">
            <p className="text-xs text-zinc-200 line-clamp-2 italic">
              &ldquo;{incomingAlert.msg.content || incomingAlert.msg.message}&rdquo;
            </p>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={() => setIncomingAlert(null)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              Để sau
            </button>
            <button
              onClick={() => handleOpenChat(incomingAlert.trip.order_id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              <span>Mở Chat Trả lời</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Floating Action Button (FAB) at Bottom-Right */}
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => handleOpenChat(activeTrip.order_id)}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold px-4 py-3.5 rounded-full shadow-2xl shadow-orange-500/40 border border-white/20 transition-all hover:scale-105 active:scale-95 animate-in fade-in"
          aria-label="Mở khung chat khách hàng"
        >
          <div className="relative">
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white text-[11px] font-extrabold rounded-full flex items-center justify-center border-2 border-zinc-950 animate-bounce">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wide pr-1">
            Chat Khách (#{activeTrip.order_id.slice(0, 6)})
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>
      )}

      {/* 3. Live Chat Widget for Selected Active Trip */}
      <OrderLiveChatWidget
        orderId={activeTrip.order_id}
        role="DRIVER"
        driverName={activeTrip.recipient_name || 'Khách hàng'}
        restaurantName={activeTrip.pickup_name}
        isOpen={isChatOpen}
        onOpenChange={setIsChatOpen}
      />
    </>
  );
}
