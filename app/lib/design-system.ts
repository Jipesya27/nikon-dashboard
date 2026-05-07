/**
 * Nikon Dashboard — Design System Tokens
 *
 * Single source of truth untuk semua nilai visual: warna, spacing,
 * typography, radius, shadow. Pakai constant ini supaya semua page
 * konsisten.
 *
 * Filosofi:
 * - Brand: kuning Nikon (#FFE500) untuk highlight & CTA utama
 * - Status colors HANYA dipakai untuk semantic meaning (success/error/dst)
 * - Spacing pakai skala kelipatan 4 (Tailwind default)
 * - Typography: 4 ukuran utama + 2 weight
 */

// ============================================================
// COLORS — token semantic
// ============================================================

export const colors = {
  // Brand
  brand: {
    DEFAULT: '#FFE500',
    light: '#FFF066',
    dark: '#E5CE00',
    fg: '#000000', // teks di atas brand
  },

  // Status semantic
  success: {
    bg: 'bg-emerald-50',
    bgDark: 'bg-emerald-500/10',
    text: 'text-emerald-700',
    textDark: 'text-emerald-400',
    border: 'border-emerald-200',
    borderDark: 'border-emerald-500/30',
  },
  warning: {
    bg: 'bg-amber-50',
    bgDark: 'bg-amber-500/10',
    text: 'text-amber-700',
    textDark: 'text-amber-400',
    border: 'border-amber-200',
    borderDark: 'border-amber-500/30',
  },
  danger: {
    bg: 'bg-rose-50',
    bgDark: 'bg-rose-500/10',
    text: 'text-rose-700',
    textDark: 'text-rose-400',
    border: 'border-rose-200',
    borderDark: 'border-rose-500/30',
  },
  info: {
    bg: 'bg-sky-50',
    bgDark: 'bg-sky-500/10',
    text: 'text-sky-700',
    textDark: 'text-sky-400',
    border: 'border-sky-200',
    borderDark: 'border-sky-500/30',
  },
  neutral: {
    bg: 'bg-slate-50',
    bgDark: 'bg-slate-500/10',
    text: 'text-slate-700',
    textDark: 'text-slate-400',
    border: 'border-slate-200',
    borderDark: 'border-slate-500/30',
  },
} as const;

// ============================================================
// THEME — light (admin) vs dark (public)
// ============================================================

export type Theme = 'light' | 'dark';

export const surfaces = {
  light: {
    page: 'bg-slate-50',
    card: 'bg-white',
    cardHover: 'hover:bg-slate-50',
    cardElevated: 'bg-white shadow-sm',
    border: 'border-slate-200',
    divider: 'border-slate-100',
    input: 'bg-white border-slate-300',
    inputFocus: 'focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20',
  },
  dark: {
    page: 'bg-zinc-950',
    card: 'bg-zinc-900',
    cardHover: 'hover:bg-zinc-800',
    cardElevated: 'bg-zinc-900 border border-white/5',
    border: 'border-white/10',
    divider: 'border-white/5',
    input: 'bg-zinc-900 border-white/10',
    inputFocus: 'focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20',
  },
} as const;

export const text = {
  light: {
    primary: 'text-slate-900',
    secondary: 'text-slate-600',
    tertiary: 'text-slate-400',
    muted: 'text-slate-500',
    disabled: 'text-slate-300',
    inverse: 'text-white',
  },
  dark: {
    primary: 'text-white',
    secondary: 'text-zinc-300',
    tertiary: 'text-zinc-400',
    muted: 'text-zinc-500',
    disabled: 'text-zinc-700',
    inverse: 'text-black',
  },
} as const;

// ============================================================
// SPACING & RADIUS
// ============================================================

export const radius = {
  sm: 'rounded-md',     // 6px — small badges, inputs
  md: 'rounded-lg',     // 8px — buttons, dropdowns
  lg: 'rounded-xl',     // 12px — cards, panels
  xl: 'rounded-2xl',    // 16px — modals, hero sections
  full: 'rounded-full', // pill / avatar
} as const;

// ============================================================
// TYPOGRAPHY scale
// ============================================================

export const typography = {
  // Headings
  h1: 'text-3xl font-bold tracking-tight',     // page title
  h2: 'text-2xl font-bold tracking-tight',     // section
  h3: 'text-lg font-bold',                     // card title
  h4: 'text-base font-bold',                   // sub-section
  // Body
  body: 'text-sm',
  bodyLg: 'text-base',
  bodySm: 'text-xs',
  // Special
  label: 'text-xs font-bold uppercase tracking-wider', // section label
  caption: 'text-[11px] text-opacity-80',
  mono: 'font-mono text-sm',
} as const;

// ============================================================
// COMMON COMBINATIONS
// ============================================================

/**
 * Class focus ring untuk input/button yang konsisten.
 */
export const focusRing = 'focus:outline-none focus:ring-2 focus:ring-yellow-400/40 focus:ring-offset-2';

/**
 * Transisi default — smooth tapi gak terlalu lambat.
 */
export const transition = 'transition-all duration-200';

/**
 * Helper untuk merge class names (mirip clsx/cn) tanpa dependency.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Helper untuk pilih nilai berdasarkan theme.
 */
export function themed<T>(theme: Theme, light: T, dark: T): T {
  return theme === 'dark' ? dark : light;
}

// ============================================================
// STATUS LABELS — common semantic mappings
// ============================================================

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand';

export const statusBadgeClasses: Record<StatusVariant, { light: string; dark: string }> = {
  success: {
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dark: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  warning: {
    light: 'bg-amber-50 text-amber-700 border-amber-200',
    dark: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  danger: {
    light: 'bg-rose-50 text-rose-700 border-rose-200',
    dark: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  info: {
    light: 'bg-sky-50 text-sky-700 border-sky-200',
    dark: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  neutral: {
    light: 'bg-slate-100 text-slate-700 border-slate-200',
    dark: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  },
  brand: {
    light: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    dark: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  },
};

export const buttonVariants = {
  primary: {
    light: 'bg-yellow-400 hover:bg-yellow-500 text-black border border-yellow-500/20',
    dark: 'bg-yellow-400 hover:bg-yellow-500 text-black',
  },
  secondary: {
    light: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200',
    dark: 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10',
  },
  ghost: {
    light: 'hover:bg-slate-100 text-slate-700',
    dark: 'hover:bg-zinc-800 text-zinc-300',
  },
  danger: {
    light: 'bg-rose-600 hover:bg-rose-700 text-white',
    dark: 'bg-rose-600 hover:bg-rose-500 text-white',
  },
  success: {
    light: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    dark: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  },
} as const;

export type ButtonVariant = keyof typeof buttonVariants;
export type ButtonSize = 'sm' | 'md' | 'lg';

export const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};
