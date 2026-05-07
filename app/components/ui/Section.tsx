import React from 'react';
import { cn, text, surfaces, type Theme } from '@/app/lib/design-system';

export interface PageHeaderProps {
  theme?: Theme;
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader — judul page utama + breadcrumbs + actions.
 * Pakai di atas konten setiap admin page.
 *
 * @example
 * <PageHeader
 *   title="Validasi Pembayaran"
 *   subtitle="Approve atau tolak pendaftaran event"
 *   breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Admin Event' }]}
 *   actions={<Button>+ Tambah</Button>}
 * />
 */
export function PageHeader({ theme = 'light', title, subtitle, breadcrumbs, actions, icon, className }: PageHeaderProps) {
  const t = text[theme];
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className={cn('flex items-center gap-1.5 text-xs mb-2', t.tertiary)}>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {b.href ? (
                <a href={b.href} className="hover:underline">{b.label}</a>
              ) : (
                <span className={t.secondary}>{b.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <span className="opacity-50">/</span>}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {icon && <div className="text-3xl flex-shrink-0">{icon}</div>}
          <div className="min-w-0">
            <h1 className={cn('text-2xl font-bold tracking-tight', t.primary)}>{title}</h1>
            {subtitle && <p className={cn('text-sm mt-1', t.tertiary)}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
    </div>
  );
}

export interface SectionProps {
  theme?: Theme;
  label?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Section — heading + content block dalam page.
 *
 * @example
 * <Section label="Filter" title="Cari Pendaftaran">
 *   <input ... />
 * </Section>
 */
export function Section({ theme = 'light', label, title, description, action, children, className }: SectionProps) {
  const t = text[theme];
  return (
    <section className={cn('mb-6', className)}>
      {(label || title || action) && (
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            {label && <p className={cn('text-[10px] font-bold uppercase tracking-wider mb-1', t.muted)}>{label}</p>}
            {title && <h2 className={cn('text-lg font-bold', t.primary)}>{title}</h2>}
            {description && <p className={cn('text-xs mt-0.5', t.tertiary)}>{description}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Divider — separator garis horizontal.
 */
export function Divider({ theme = 'light', className }: { theme?: Theme; className?: string }) {
  const surface = surfaces[theme];
  return <hr className={cn('my-6 border-t', surface.divider, className)} />;
}
