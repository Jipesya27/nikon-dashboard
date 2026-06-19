import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SbReadPayload, SbWritePayload } from './types';

export const API_BASE_URL = 'https://altanikindo.com';

async function getAuthCookie(): Promise<string> {
  const [adminSession, karyawanIdentity] = await Promise.all([
    AsyncStorage.getItem('adminSession'),
    AsyncStorage.getItem('karyawanIdentity'),
  ]);
  const parts: string[] = [];
  if (adminSession) parts.push(`admin_session=${adminSession}`);
  if (karyawanIdentity) parts.push(`karyawan_identity=${karyawanIdentity}`);
  return parts.join('; ');
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const cookie = await getAuthCookie();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookie,
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function loginApi(username: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/api/auth/mobile-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login gagal');
  return data as { success: true; karyawan: import('./types').Karyawan; tokens: import('./types').LoginTokens };
}

// ── Generic DB Read/Write ────────────────────────────────────────────────────

export async function sbRead<T = unknown>(payload: SbReadPayload): Promise<{ data: T[]; count?: number }> {
  return apiFetch('/api/admin/sb-read', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function sbWrite<T = unknown>(payload: SbWritePayload): Promise<{ data: T }> {
  return apiFetch('/api/admin/sb-write', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Claims ──────────────────────────────────────────────────────────────────

export async function fetchClaims(page = 1, status = 'all', search = '') {
  const params = new URLSearchParams({ page: String(page), status, search });
  return apiFetch<{ claims: import('./types').ClaimPromo[]; total: number; page: number; limit: number }>(
    `/api/admin/claims?${params}`,
  );
}

// ── Send WA ──────────────────────────────────────────────────────────────────

export async function sendWAMessage(target: string, message: string) {
  return apiFetch('/api/admin/send-wa', {
    method: 'POST',
    body: JSON.stringify({ target, message }),
  });
}

// ── Events ───────────────────────────────────────────────────────────────────

export async function fetchEvents() {
  return sbRead<import('./types').EventDataExtended>({
    table: 'events',
    order: { col: 'event_date', ascending: false },
    limit: 50,
  });
}

export async function fetchEventRegistrations(eventId: string) {
  return sbRead<import('./types').EventRegistration>({
    table: 'event_registrations',
    filters: [{ col: 'event_id', op: 'eq', val: eventId }],
    order: { col: 'created_at', ascending: false },
  });
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function fetchChatContacts() {
  return sbRead<import('./types').KonsumenData>({
    table: 'konsumen',
    select: 'nomor_wa,nama_lengkap,status_langkah,created_at',
    order: { col: 'created_at', ascending: false },
    limit: 100,
  });
}

export async function fetchChatMessages(nomorWa: string, limit = 50) {
  return sbRead<import('./types').RiwayatPesan>({
    table: 'riwayat_pesan',
    filters: [{ col: 'nomor_wa', op: 'eq', val: nomorWa }],
    order: { col: 'waktu_pesan', ascending: false },
    limit,
  });
}

// ── Expense Claims ────────────────────────────────────────────────────────────

export async function fetchExpenseClaims(createdBy?: string) {
  const filters = createdBy
    ? [{ col: 'created_by', op: 'eq', val: createdBy }]
    : [];
  return sbRead<import('./types').ExpenseClaim>({
    table: 'expense_claim',
    filters,
    order: { col: 'created_at', ascending: false },
    limit: 50,
  });
}

// ── Garansi ───────────────────────────────────────────────────────────────────

export async function fetchGaransi() {
  return sbRead<import('./types').Garansi>({
    table: 'garansi',
    order: { col: 'created_at', ascending: false },
    limit: 100,
  });
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function fetchServices() {
  return sbRead<import('./types').StatusService>({
    table: 'status_service',
    order: { col: 'created_at', ascending: false },
    limit: 100,
  });
}

// ── Peminjaman ────────────────────────────────────────────────────────────────

export async function fetchPeminjaman() {
  return sbRead<import('./types').PeminjamanBarang>({
    table: 'peminjaman_barang',
    order: { col: 'created_at', ascending: false },
    limit: 100,
  });
}
