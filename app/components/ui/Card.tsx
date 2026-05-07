import React from 'react';
import { cn, surfaces, text, radius, transition, type Theme } from '@/app/lib/design-system';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  theme?: Theme;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
  children: React.ReactNode;
}

/**
 * Card — container utama untuk konten.
 * Dipakai untuk panel, list item, modal section, dst.
 *
 * @example
 * <Card padding="md">
 *   <Card.Header title="Judul" subtitle="Deskripsi" />
 *   <p>Konten</p>
 * </Card>
 */
export function Card({ theme = 'light', padding = 'md', hoverable = false, className, children, ...props }: CardProps) {
  const surface = surfaces[theme];
  const padClass = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  }[padding];

  return (
    <div
      className={cn(
        surface.card,
        'border',
        surface.border,
        radius.lg,
        padClass,
        hoverable && cn('cursor-pointer', surface.cardHover, transition, 'hover:shadow-sm'),
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  theme?: Theme;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

Card.Header = function CardHeader({ theme = 'light', title, subtitle, action, icon, className }: CardHeaderProps) {
  const t = text[theme];
  return (
    <div className={cn('flex items-start justify-between gap-3 mb-4', className)}>
      <div className="flex items-start gap-3 min-w-0 flex-1">
        {icon && <div className="flex-shrink-0 text-2xl">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h3 className={cn('text-base font-bold leading-tight', t.primary)}>{title}</h3>
          {subtitle && <p className={cn('text-xs mt-0.5', t.tertiary)}>{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

export interface CardFooterProps {
  theme?: Theme;
  children: React.ReactNode;
  className?: string;
}

Card.Footer = function CardFooter({ theme = 'light', children, className }: CardFooterProps) {
  const surface = surfaces[theme];
  return (
    <div className={cn('mt-4 pt-4 border-t flex items-center justify-end gap-2', surface.divider, className)}>
      {children}
    </div>
  );
};
