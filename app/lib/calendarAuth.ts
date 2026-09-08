import { NextRequest } from 'next/server';
import { verifyIdentityToken, parseIdentityCookieUnsafe } from '@/app/lib/session';

export const CALENDAR_ADMIN_ROLES = ['Admin', 'Super Admin'];

export interface CalendarUser {
  username: string;
  nama: string;
  role: string;
}

/** Identitas karyawan dari cookie signed `karyawan_identity`, fallback ke parse tanpa verifikasi. */
export async function getCalendarUser(req: NextRequest): Promise<CalendarUser | null> {
  const raw = req.cookies.get('karyawan_identity')?.value ?? '';
  if (!raw) return null;
  const verified = await verifyIdentityToken(raw);
  if (verified) return verified;
  return parseIdentityCookieUnsafe(raw);
}

export function isCalendarAdmin(user: CalendarUser | null): boolean {
  return !!user && CALENDAR_ADMIN_ROLES.includes(user.role);
}
