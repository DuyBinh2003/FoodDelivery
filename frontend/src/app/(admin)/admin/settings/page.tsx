'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Save } from 'lucide-react';

interface SystemConfig {
  id: string;
  config_key: string;
  config_value: string;
  description: string;
}

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local state for edits
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfigs();
  }, []);

  async function loadConfigs() {
    setLoading(true);
    try {
      const data: SystemConfig[] = await apiClient.get('/admin/configs');
      setConfigs(data);
      const initialForm: Record<string, string> = {};
      data.forEach(c => {
        initialForm[c.config_key] = c.config_value;
      });
      setFormData(initialForm);
    } catch (error) {
      console.error('Failed to load configs:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const promises = Object.entries(formData).map(([key, value]) => 
        apiClient.put('/admin/configs', { key, value })
      );
      await Promise.all(promises);
      alert('Lưu cấu hình thành công!');
      await loadConfigs();
    } catch (error) {
      console.error('Failed to save configs:', error);
      alert('Lưu cấu hình thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

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
        <h1 className="text-2xl font-bold text-white tracking-tight">Cài Đặt Hệ Thống</h1>
        <p className="text-zinc-400 mt-1">Quản lý thuế, hoa hồng và các thông số tài chính.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl shadow-black/20 max-w-3xl">
        <form onSubmit={handleSave} className="space-y-6">
          {configs.map((config) => (
            <div key={config.config_key} className="space-y-2">
              <label className="block text-sm font-medium text-zinc-300">
                {config.config_key}
              </label>
              <div className="flex gap-4 items-center">
                <input
                  type="text"
                  value={formData[config.config_key] || ''}
                  onChange={(e) => handleInputChange(config.config_key, e.target.value)}
                  className="flex-1 max-w-sm px-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                />
                <span className="text-sm text-zinc-500">{config.description}</span>
              </div>
            </div>
          ))}

          <div className="pt-6 border-t border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Lưu Thay Đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
