'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, MapPin, StopCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserLocation } from '@/features/ai-chat/types/chat.types';

interface ChatInputProps {
  onSendMessage: (text: string, location?: UserLocation) => void;
  onCancelStream: () => void;
  isStreaming: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onCancelStream,
  isStreaming,
}) => {
  const [text, setText] = useState('');
  const [location, setLocation] = useState<UserLocation | undefined>(undefined);
  const [isLocating, setIsLocating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleToggleLocation = () => {
    if (location) {
      setLocation(undefined);
      toast.success('Đã tắt chia sẻ vị trí');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setIsLocating(false);
        toast.success('Đã lấy vị trí hiện tại để tối ưu gợi ý quán gần bạn');
      },
      () => {
        setIsLocating(false);
        toast.error('Không thể lấy vị trí. Vui lòng cấp quyền vị trí cho trang.');
      },
      { timeout: 8000 },
    );
  };

  const handleSend = () => {
    if (!text.trim() || isStreaming) return;
    onSendMessage(text.trim(), location);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto grow textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="border-t border-zinc-800 bg-zinc-950 p-3">
      {/* Geolocation Tag if active */}
      {location && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-orange-950/40 border border-orange-500/30 px-2.5 py-1 text-xs text-orange-300">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 text-orange-400" />
            <span className="truncate">Vị trí: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
          </div>
          <button
            type="button"
            onClick={() => setLocation(undefined)}
            className="text-[11px] font-medium text-orange-400 hover:text-white"
          >
            Hủy
          </button>
        </div>
      )}

      <div className="relative flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-1.5 focus-within:border-orange-500/50 focus-within:ring-1 focus-within:ring-orange-500/20">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi món ăn, kiểm tra đơn hàng..."
          rows={1}
          maxLength={2000}
          disabled={isStreaming}
          className="max-h-28 min-h-[38px] w-full resize-none bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
        />

        <div className="flex items-center gap-1 pb-1 pr-1">
          {/* Location Button */}
          <button
            type="button"
            onClick={handleToggleLocation}
            disabled={isStreaming || isLocating}
            title={location ? 'Tắt vị trí' : 'Sử dụng vị trí hiện tại'}
            className={`p-2 rounded-xl transition-colors ${
              location
                ? 'bg-orange-500/20 text-orange-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <MapPin className={`h-4 w-4 ${isLocating ? 'animate-pulse text-orange-400' : ''}`} />
          </button>

          {/* Send or Stop Button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onCancelStream}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-600/90 text-white transition-all hover:bg-red-500"
              title="Dừng phản hồi"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-600 text-white transition-all hover:bg-orange-500 disabled:opacity-40 disabled:hover:bg-orange-600 shadow-md shadow-orange-600/20"
              title="Gửi tin nhắn (Enter)"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
