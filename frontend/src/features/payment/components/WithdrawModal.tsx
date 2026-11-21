'use client';

import React, { useState, useEffect } from 'react';
import { X, Building2, CreditCard, User, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { VIETNAM_BANKS } from '@/features/payment/types/withdrawal.types';
import { withdrawalApi } from '@/features/payment/api/withdrawal-api';
import { apiClient } from '@/lib/api-client';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAccountId?: string;
  requesterId: string;
  requesterType: 'DRIVER' | 'RESTAURANT';
  availableBalance?: number;
  onSuccess?: () => void;
}

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000];

export function WithdrawModal({
  isOpen,
  onClose,
  walletAccountId: initialWalletAccountId,
  requesterId,
  requesterType,
  availableBalance: initialAvailableBalance,
  onSuccess,
}: WithdrawModalProps) {
  const [bankCode, setBankCode] = useState(VIETNAM_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [fetchingWallet, setFetchingWallet] = useState(false);
  const [walletId, setWalletId] = useState(initialWalletAccountId || '');
  const [currentAvailableBalance, setCurrentAvailableBalance] = useState(initialAvailableBalance ?? 0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchWallet = async () => {
      try {
        setFetchingWallet(true);
        const res = await apiClient<{
          wallet: { id: string };
          balance: { available_balance: string; locked_balance: string };
        }>(`/wallets/owner/${requesterId}?ownerType=${requesterType}`).catch(() => null);

        if (isMounted && res) {
          setWalletId(res.wallet?.id || initialWalletAccountId || '');
          if (res.balance?.available_balance) {
            setCurrentAvailableBalance(Number(res.balance.available_balance) || 0);
          }
        }
      } catch (err) {
        console.warn('[WithdrawModal] Could not fetch wallet info:', err);
      } finally {
        if (isMounted) setFetchingWallet(false);
      }
    };

    fetchWallet();

    return () => {
      isMounted = false;
    };
  }, [isOpen, requesterId, requesterType, initialWalletAccountId]);

  if (!isOpen) return null;

  const formatVND = (val: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSelectQuickAmount = (val: number) => {
    if (val > currentAvailableBalance) {
      setAmount(currentAvailableBalance);
    } else {
      setAmount(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const numAmount = Number(amount);
    if (!numAmount || numAmount < 50000) {
      setErrorMsg('Số tiền rút tối thiểu là 50.000 VND');
      return;
    }

    if (numAmount > currentAvailableBalance) {
      setErrorMsg('Số dư khả dụng không đủ để thực hiện rút số tiền này');
      return;
    }

    if (!accountNumber.trim() || accountNumber.trim().length < 6) {
      setErrorMsg('Vui lòng nhập số tài khoản ngân hàng hợp lệ (từ 6 ký tự trở lên)');
      return;
    }

    if (!accountName.trim()) {
      setErrorMsg('Vui lòng nhập tên chủ tài khoản thụ hưởng');
      return;
    }

    if (!walletId) {
      setErrorMsg('Không tìm thấy mã ví nội bộ để thực hiện rút tiền. Vui lòng thử lại sau.');
      return;
    }

    try {
      setSubmitting(true);
      await withdrawalApi.requestWithdrawal({
        wallet_account_id: walletId,
        requester_id: requesterId,
        requester_type: requesterType,
        amount: numAmount,
        bank_code: bankCode,
        bank_account_number: accountNumber.trim(),
        bank_account_name: accountName.toUpperCase().trim(),
      });

      setSuccessMsg(`Lệnh rút ${formatVND(numAmount)} đã được tạo thành công và đang chờ kế toán đối soát!`);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi tạo yêu cầu rút tiền';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={submitting}
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Rút tiền về tài khoản ngân hàng</h2>
            <p className="text-xs text-zinc-400">Chuyển tiền nhanh 24/7 qua chuẩn VietQR / Napas</p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">Số dư khả dụng có thể rút</p>
            <p className="text-xl font-extrabold text-emerald-400 tracking-tight mt-0.5">
              {fetchingWallet ? (
                <span className="text-sm font-normal text-zinc-500 animate-pulse">Đang kiểm tra số dư ví...</span>
              ) : (
                formatVND(currentAvailableBalance)
              )}
            </p>
          </div>
          <button
            type="button"
            disabled={fetchingWallet || currentAvailableBalance <= 0}
            onClick={() => setAmount(currentAvailableBalance)}
            className="text-xs px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 font-medium transition-colors disabled:opacity-40"
          >
            Rút toàn bộ
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ngân hàng */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">Ngân hàng thụ hưởng</label>
            <select
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
            >
              {VIETNAM_BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.shortName} - {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Số tài khoản & Tên chủ TK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Số tài khoản</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ví dụ: 1029384756"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\s+/g, ''))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono transition-colors"
                />
                <CreditCard className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Tên chủ tài khoản</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="NGUYEN VAN A"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 uppercase transition-colors"
                />
                <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
              </div>
            </div>
          </div>

          {/* Số tiền cần rút */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-zinc-300">Số tiền rút (VND)</label>
              <span className="text-[11px] text-zinc-500">Tối thiểu: 50.000 ₫</span>
            </div>
            <input
              type="number"
              placeholder="50000"
              min={50000}
              step={10000}
              value={amount}
              onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 font-mono transition-colors"
            />
          </div>

          {/* Quick Amount Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handleSelectQuickAmount(val)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  amount === val
                    ? 'bg-orange-500 text-white border-orange-500 font-semibold'
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {val >= 1000000 ? `${val / 1000000}tr` : `${val / 1000}k`}
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>Phí xử lý: <strong className="text-emerald-400 font-normal">Miễn phí</strong></span>
            <span>Thực nhận: <strong className="text-white text-sm font-bold font-mono">{formatVND(Number(amount) || 0)}</strong></span>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={submitting || fetchingWallet || !amount || Number(amount) < 50000}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xử lý khóa số dư...</span>
              </>
            ) : (
              <>
                <span>Xác nhận rút tiền</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
