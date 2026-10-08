'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { CheckCircle2, XCircle } from 'lucide-react';

interface PendingApproval {
  id: string;
  name: string;
  type: 'RESTAURANT' | 'DRIVER';
  createdAt: string;
}

export default function AdminApprovalsPage() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApprovals = async () => {
    setLoading(true);
    try {
      const data = await apiClient<{
        restaurants?: Record<string, unknown>[];
        drivers?: Record<string, unknown>[];
      }>('/admin/approvals/pending');
      const mappedRestaurants = (data.restaurants || []).map((r: Record<string, unknown>): PendingApproval => ({
        id: r.id as string,
        name: r.name as string,
        type: 'RESTAURANT',
        createdAt: r.created_at as string,
      }));
      const mappedDrivers = (data.drivers || []).map((d: Record<string, unknown>): PendingApproval => ({
        id: d.id as string,
        name: d.user_id as string,
        type: 'DRIVER',
        createdAt: d.created_at as string,
      }));
      setApprovals([...mappedRestaurants, ...mappedDrivers].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to load approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadApprovals();
  }, []);

  async function handleAction(id: string, type: string, action: 'approve' | 'reject') {
    try {
      const endpoint = `/admin/approvals/${type.toLowerCase()}/${id}/${action}`;
      await apiClient(endpoint, { method: 'POST', body: {} });
      await loadApprovals();
    } catch (error) {
      console.error(`Failed to ${action} ${type}:`, error);
      alert(`Lỗi khi ${action} hồ sơ.`);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Xét Duyệt Hồ Sơ</h1>
        <p className="text-zinc-400 mt-1">Quản lý yêu cầu đăng ký mở quán và làm tài xế.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="px-6 py-4 text-sm font-semibold text-zinc-300">Loại</th>
                <th className="px-6 py-4 text-sm font-semibold text-zinc-300">Tên / User ID</th>
                <th className="px-6 py-4 text-sm font-semibold text-zinc-300">Ngày Đăng Ký</th>
                <th className="px-6 py-4 text-sm font-semibold text-zinc-300 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    Không có hồ sơ nào chờ duyệt.
                  </td>
                </tr>
              ) : (
                approvals.map((app) => (
                  <tr key={app.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        app.type === 'RESTAURANT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {app.type === 'RESTAURANT' ? 'Nhà Hàng' : 'Tài Xế'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-white">{app.name}</td>
                    <td className="px-6 py-4 text-sm text-zinc-400">
                      {new Date(app.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 flex justify-end gap-3">
                      <button 
                        onClick={() => handleAction(app.id, app.type, 'approve')}
                        className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors tooltip"
                        title="Duyệt"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleAction(app.id, app.type, 'reject')}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors tooltip"
                        title="Từ chối"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
