import type { LucideIcon } from 'lucide-react';

export interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  tone?: 'primary' | 'info' | 'warning' | 'danger';
  loading?: boolean;
  className?: string;
}
