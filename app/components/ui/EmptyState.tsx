import React from 'react';
import { cn, text, type Theme } from '@/app/lib/design-system';

export interface EmptyStateProps {
  theme?: Theme;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * EmptyState — placeholder saat tidak ada data.
 *
 * @example
 * <EmptyState
 *   icon="📅"
 *   title="Belum Ada Event"
 *   description="Tambahkan event pertama untuk mulai menerima pendaftaran."
 *   action={<Button>+ Tambah Event</Button>}
 * />
 */
export function EmptyState({ theme = 'light', icon = '📭', title, description, action, size = 'md', className }: EmptyStateProps) {
  const t = text[theme];
  const padding = size === 'sm' ? 'py-8' : size === 'lg' ? 'py-20' : 'py-14';
  const iconSize = size === 'sm' ? 'text-3xl' : size === 'lg' ? 'text-6xl' : 'text-5xl';

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', padding, className)}>
      {icon && <div className={cn('mb-3 opacity-70', iconSize)}>{icon}</div>}
      <h3 className={cn('text-base font-bold mb-1', t.secondary)}>{title}</h3>
      {description && <p className={cn('text-sm max-w-sm mb-4', t.tertiary)}>{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
