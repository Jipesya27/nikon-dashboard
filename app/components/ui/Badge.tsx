import React from 'react';
import { cn, statusBadgeClasses, type StatusVariant, type Theme } from '@/app/lib/design-system';

export interface BadgeProps {
  variant?: StatusVariant;
  theme?: Theme;
  size?: 'xs' | 'sm';
  uppercase?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Badge — status indicator dengan semantic color.
 *
 * @example
 * <Badge variant="success">Terdaftar</Badge>
 * <Badge variant="warning" theme="dark">Menunggu</Badge>
 * <Badge variant="brand" icon="✨">Premium</Badge>
 */
export function Badge({
  variant = 'neutral',
  theme = 'light',
  size = 'sm',
  uppercase = false,
  icon,
  className,
  children,
}: BadgeProps) {
  const colorClass = statusBadgeClasses[variant][theme];
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 border rounded-full font-semibold whitespace-nowrap',
        sizeClass,
        colorClass,
        uppercase && 'uppercase tracking-wider',
        className,
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
