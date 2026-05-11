import React from 'react';
import { cn, statusBadgeClasses, text, surfaces, radius, transition, type StatusVariant, type Theme } from '@/app/lib/design-system';

export interface StatProps {
  label: string;
  value: React.ReactNode;
  delta?: { value: number | string; positive?: boolean };
  icon?: React.ReactNode;
  variant?: StatusVariant;
  theme?: Theme;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}

/**
 * Stat — kartu metrik tunggal.
 * Cocok untuk dashboard stats grid.
 *
 * @example
 * <Stat label="Total Pendaftar" value={142} />
 * <Stat label="Sudah Bayar" value={98} variant="success" delta={{ value: '+12', positive: true }} />
 * <Stat label="Pending" value={44} variant="warning" onClick={() => filter('pending')} active />
 */
export function Stat({ label, value, delta, icon, variant, theme = 'light', onClick, active, className }: StatProps) {
  const t = text[theme];
  const surface = surfaces[theme];
  const isClickable = !!onClick;

  // Variant colors — extract semantic class dari statusBadgeClasses
  let valueColor: string = t.primary;
  let bgColor: string = surface.card;
  let borderColor: string = surface.border;
  if (variant) {
    const palette = statusBadgeClasses[variant][theme];
    const parts = palette.split(' ');
    valueColor = parts.find(c => c.startsWith('text-')) || t.primary;
    bgColor = parts.find(c => c.startsWith('bg-')) || surface.card;
    borderColor = parts.find(c => c.startsWith('border-')) || surface.border;
  }

  const Comp = isClickable ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'border text-left p-4 w-full',
        radius.lg,
        bgColor,
        borderColor,
        isClickable && cn(transition, 'hover:shadow-sm cursor-pointer'),
        active && 'ring-2 ring-yellow-400/40',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className={cn('text-xs font-bold uppercase tracking-wider', t.tertiary)}>{label}</p>
        {icon && <span className="text-lg flex-shrink-0">{icon}</span>}
      </div>
      <p className={cn('text-3xl font-bold mt-1', valueColor)}>{value}</p>
      {delta && (
        <p className={cn('text-xs mt-1 font-semibold', delta.positive ? 'text-emerald-600' : 'text-rose-600')}>
          {delta.positive ? '↑' : '↓'} {delta.value}
        </p>
      )}
    </Comp>
  );
}

/**
 * StatGrid — wrapper grid responsive untuk Stat.
 *
 * @example
 * <StatGrid cols={4}>
 *   <Stat label="A" value={1} />
 *   <Stat label="B" value={2} />
 * </StatGrid>
 */
export function StatGrid({
  cols = 4,
  className,
  children,
}: {
  cols?: 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
}) {
  const colClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
  }[cols];
  return <div className={cn('grid gap-3 mb-6', colClass, className)}>{children}</div>;
}
