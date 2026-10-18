'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bike,
  Star,
  History,
  RotateCcw,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import {
  getDriverTrips,
  getDriverSummary,
  getDriverReviews,
  updateDriverStatus,
  updateDriverTripStatus,
  getAvailableDriverTrips,
  claimDriverTrip,
} from '@/features/driver/api';
import type {
  DriverTrip,
  DriverSummary,
  DriverReviewsResponse,
  DriverStatus,
} from '@/features/driver/types/driver.types';
import { DriverStatusSwitch } from './driver-status-switch';
import { DriverMetricsGrid } from './driver-metrics-grid';
import { DriverTripsList } from './driver-trips-list';
import { DriverReviewsTab } from './driver-reviews-tab';
import { DriverAvailableTrips } from './driver-available-trips';

export function DriverDashboard() {
  const { user, setDriverStatus, refreshProfile } = useAuthStore();

  const [availableTrips, setAvailableTrips] = useState<DriverTrip[]>([]);
  const [trips, setTrips] = useState<DriverTrip[]>([]);
  const [summary, setSummary] = useState<DriverSummary | null>(null);
  const [reviewsData, setReviewsData] = useState<DriverReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'trips' | 'reviews'>('available');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const currentStatus: DriverStatus = user?.driverProfile?.status || 'OFFLINE';
  const isOnline = currentStatus === 'ONLINE';

  const loadData = async () => {
    try {
      setLoading(true);
      const [availableRes, tripsRes, summaryRes, reviewsRes] = await Promise.all([
        isOnline ? getAvailableDriverTrips().catch(() => []) : Promise.resolve([]),
        getDriverTrips().catch(() => []),
        getDriverSummary().catch(() => null),
        getDriverReviews().catch(() => null),
      ]);

      setAvailableTrips(availableRes);
      setTrips(tripsRes);
      setSummary(summaryRes);
      setReviewsData(reviewsRes);
    } catch {
      showToast('error', 'Có lỗi khi tải dữ liệu đối tác tài xế');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      try {
        const [availableRes, tripsRes, summaryRes, reviewsRes] = await Promise.all([
          isOnline ? getAvailableDriverTrips().catch(() => []) : Promise.resolve([]),
          getDriverTrips().catch(() => []),
          getDriverSummary().catch(() => null),
          getDriverReviews().catch(() => null),
        ]);

        if (!isMounted) return;
        setAvailableTrips(availableRes);
        setTrips(tripsRes);
        setSummary(summaryRes);
        setReviewsData(reviewsRes);
      } catch {
        if (isMounted) {
          showToast('error', 'Có lỗi khi tải dữ liệu đối tác tài xế');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchInitialData();

    // Tự động quét đơn chờ nhận mới mỗi 10 giây CHỈ KHI tài xế đang TRỰC TUYẾN (ONLINE)
    let pollInterval: NodeJS.Timeout | null = null;
    if (isOnline) {
      pollInterval = setInterval(() => {
        if (isMounted) {
          getAvailableDriverTrips()
            .then((res) => {
              if (isMounted) setAvailableTrips(res);
            })
            .catch(() => {});
        }
      }, 10000);
    } else {
      setAvailableTrips([]);
    }

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOnline]);

  const handleToggleStatus = async (newStatus: DriverStatus) => {
    try {
      await updateDriverStatus(newStatus);
      setDriverStatus(newStatus);
      if (newStatus === 'OFFLINE') {
        setAvailableTrips([]);
      } else {
        // Vừa chuyển sang ONLINE -> fetch ngay danh sách chuyến khả dụng
        getAvailableDriverTrips()
          .then((res) => setAvailableTrips(res))
          .catch(() => {});
      }
      showToast(
        'success',
        newStatus === 'ONLINE'
          ? 'Đã chuyển sang TRỰC TUYẾN. Sẵn sàng nhận cuốc xe!'
          : 'Đã chuyển sang NGOẠI TUYẾN. Tạm nghỉ nhận đơn.'
      );
      // Quiet background sync
      refreshProfile().catch(() => {});
    } catch (_err) {
      showToast('error', 'Không thể cập nhật trạng thái hoạt động');
      throw _err;
    }
  };

  const handleCompleteTrip = async (orderId: string) => {
    try {
      await updateDriverTripStatus(orderId, 'COMPLETED');
      showToast('success', 'Đã xác nhận hoàn thành cuốc xe thành công!');
      await loadData();
    } catch {
      showToast('error', 'Lỗi khi cập nhật trạng thái cuốc xe');
    }
  };

  const handleClaimTrip = async (orderId: string) => {
    try {
      await claimDriverTrip(orderId);
      showToast('success', 'Nhận chuyến thành công! Hãy đến quán lấy món và bắt đầu giao.');
      await loadData();
      setActiveTab('trips');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chuyến xe đã được tài xế khác nhận';
      showToast('error', msg);
      await loadData();
    }
  };

  const isApproved =
    user?.hasDriver || user?.driverProfile?.verification_status === 'APPROVED';
  const isPending =
    !isApproved && user?.driverRegistrationStatus === 'PENDING';

  // If not approved and not pending
  if (!loading && !isApproved && !isPending && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4">
            <Bike className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Bạn chưa là tài xế</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Đăng ký tham gia đội ngũ tài xế FoodDelivery ngay hôm nay để nhận thu nhập hấp dẫn!
          </p>
          <Link
            href="/register/driver"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold text-sm transition-all"
          >
            <span>Đăng ký làm tài xế</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // If pending approval
  if (!loading && isPending) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-amber-500/20 rounded-3xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 animate-bounce">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Hồ sơ đang chờ phê duyệt</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Yêu cầu trở thành tài xế của bạn đã được gửi tới Ban quản trị và đang trong quá trình xét duyệt. Chúng tôi sẽ thông báo cho bạn ngay khi có kết quả!
          </p>
          <button
            onClick={() => loadData()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kiểm tra lại trạng thái</span>
          </button>
        </div>
      </div>
    );
  }

  // currentStatus is already defined above

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
              : 'bg-red-950/90 text-red-300 border-red-500/30'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Hero Banner with Glow */}
      <div className="relative overflow-hidden border-b border-white/5 bg-gradient-to-b from-zinc-900 to-black pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-3">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Đối tác Tài Xế Chính Thức</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Bảng Điều Khiển Tài Xế
              </h1>
              <p className="text-zinc-400 text-sm mt-1">
                Chào mừng, <strong className="text-white">{user?.name || user?.email}</strong>! Quản lý cuốc xe, theo dõi thu nhập và đánh giá chất lượng phục vụ.
              </p>
            </div>

            {/* Status Switch Widget */}
            <div className="lg:w-auto w-full">
              <DriverStatusSwitch
                status={currentStatus}
                vehiclePlate={user?.driverProfile?.vehicle_plate || '59-S2 888.88'}
                vehicleType={user?.driverProfile?.vehicle_type || 'Honda Wave Alpha'}
                onToggle={handleToggleStatus}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Metrics Grid */}
        <DriverMetricsGrid summary={summary} loading={loading} />

        {/* Tab Navigation & Content */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('available')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'available'
                    ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bike className="w-4 h-4" />
                <span>Đơn Chờ Nhận ({availableTrips.length})</span>
                {availableTrips.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('trips')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'trips'
                    ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Lịch Sử Cuốc Xe ({trips.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                  activeTab === 'reviews'
                    ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Star className="w-4 h-4" />
                <span>Đánh Giá Khách Hàng ({reviewsData?.total_reviews || 0})</span>
              </button>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Active Tab Component */}
          {activeTab === 'available' ? (
            <DriverAvailableTrips
              trips={availableTrips}
              loading={loading}
              isOnline={isOnline}
              onGoOnline={() => handleToggleStatus('ONLINE')}
              onRefresh={loadData}
              onClaimTrip={handleClaimTrip}
            />
          ) : activeTab === 'trips' ? (
            <DriverTripsList
              trips={trips}
              loading={loading}
              onCompleteTrip={handleCompleteTrip}
            />
          ) : (
            <DriverReviewsTab data={reviewsData} loading={loading} />
          )}
        </div>
      </div>
    </div>
  );
}
