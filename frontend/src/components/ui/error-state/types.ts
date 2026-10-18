import type { ReactNode } from 'react';

export interface ErrorStateProps {
  /**
   * Title text displayed prominently.
   * Default: "Không thể tải dữ liệu"
   */
  title?: string;

  /**
   * Explanatory description text.
   * Default: "Đã có sự cố xảy ra khi kết nối đến máy chủ. Vui lòng thử lại."
   */
  description?: string;

  /**
   * Callback fired when clicking the retry button.
   */
  onRetry?: () => void | Promise<void>;

  /**
   * Label for the retry button.
   * Default: "Thử lại"
   */
  retryText?: string;

  /**
   * Optional secondary action button or node.
   */
  action?: ReactNode;

  /**
   * Additional custom CSS classes for the container.
   */
  className?: string;

  /**
   * Compact mode for smaller inline containers (e.g. widget or small card).
   */
  compact?: boolean;
}
