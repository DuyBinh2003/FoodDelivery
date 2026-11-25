import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ClearCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearCartModal: React.FC<ClearCartModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-card text-card-foreground border border-border rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Bắt đầu giỏ hàng mới?
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Giỏ hàng của bạn đang chứa món ăn từ nhà hàng khác. Bạn có muốn xóa giỏ hàng hiện tại để bắt đầu đặt ở nhà hàng mới không?
          </p>
          
          <div className="flex w-full gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors cursor-pointer"
            >
              Đồng ý xóa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
