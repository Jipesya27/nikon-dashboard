import axios from 'axios';
import { getSession } from './storage';
import { API_BASE_URL } from '@/constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Inject session cookies before every request
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.adminSession && session?.karyawanIdentity) {
    config.headers['Cookie'] = `admin_session=${session.adminSession}; karyawan_identity=${session.karyawanIdentity}`;
  }
  return config;
});

export default api;

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ReadFilter {
  col: string;
  op: 'eq' | 'neq' | 'gte' | 'lte' | 'gt' | 'lt' | 'like' | 'ilike' | 'in';
  val: unknown;
}

interface SbReadPayload {
  table: string;
  select?: string;
  filters?: ReadFilter[];
  order?: { col: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  count?: boolean;
}

export async function sbRead<T = unknown>(payload: SbReadPayload): Promise<T[]> {
  const res = await api.post<{ data: T[]; count?: number | null }>('/api/admin/sb-read', payload);
  return res.data.data || [];
}
