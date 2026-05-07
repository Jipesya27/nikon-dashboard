import React from 'react';
import { cn, buttonVariants, buttonSizes, focusRing, transition, radius, type ButtonVariant, type ButtonSize, type Theme } from '@/app/lib/design-system';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  theme?: Theme;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

/**
 * Button — tombol konsisten dengan variant semantic.
 *
 * @example
 * <Button variant="primary">Simpan</Button>
 * <Button variant="danger" size="sm" loading>Hapus</Button>
 * <Button variant="secondary" leftIcon="📥">Export CSV</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  theme = 'light',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const colorClass = buttonVariants[variant][theme];
  const sizeClass = buttonSizes[size];

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold',
        sizeClass,
        colorClass,
        radius.md,
        focusRing,
        transition,
        'disabled:opacity-50 disabled:cursor-not-allowed',
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Memproses...
        </>
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

/**
 * IconButton — tombol icon-only (square aspect).
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  theme = 'light',
  disabled,
  className,
  children,
  ...props
}: Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'fullWidth'>) {
  const colorClass = buttonVariants[variant][theme];
  const sizePx = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-10 h-10 text-sm';

  return (
    <button
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center',
        sizePx,
        colorClass,
        radius.md,
        focusRing,
        transition,
        'disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
