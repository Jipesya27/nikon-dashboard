'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import { Html5Qrcode } from 'html5-qrcode';
import { DEFAULT_TEMPLATES, applyTemplate, loadChatbotTemplates, DB_KEY_PREFIX, TEMPLATE_CATEGORIES } from '@/app/lib/chatbotTemplate';
import { Karyawan, KonsumenData, RiwayatPesan, ClaimPromo, Garansi, Promosi, PengaturanBot, StatusService, BudgetApproval, BudgetItem, EventData, EventRegistration, PeminjamanBarang, BarangAset, Affiliate, AffiliateSkema, AffiliatePenjualan } from '@/app/index';
import {
   VALIDASI_OPTIONS, STATUS_VALIDASI_GARANSI_OPTIONS, JENIS_GARANSI_OPTIONS, LAMA_GARANSI_OPTIONS, JENIS_GARANSI_LAMA_MAP,
   STATUS_SERVICE_OPTIONS, JENIS_PROMOSI_OPTIONS, JASA_PENGIRIMAN_OPTIONS, EVENT_STATUS_OPTIONS,
   PAYMENT_TYPE_OPTIONS, STATUS_PENDAFTARAN_OPTIONS, STATUS_REFUND_DEPOSIT_OPTIONS,
   ROLE_OPTIONS, CONSENT_OPTIONS, BUDGET_SOURCE_OPTIONS, STATUS_LANGKAH_OPTIONS,
   NAMA_BANK_OPTIONS
} from '@/app/enums';
import Header from '@/app/Header';
import AddressFields from '@/app/components/AddressFields';
import EventReport from '@/app/components/EventReport';
import WaTemplatesTab from '@/app/components/WaTemplatesTab';
import ExpenseClaimTab from '@/app/components/ExpenseClaimTab';
import ResiTab from '@/app/components/ResiTab';
import PromoDatacolorTab from '@/app/components/PromoDatacolorTab';
import MessagesTab from '@/app/components/MessagesTab';
import AffiliateTab from '@/app/components/AffiliateTab';
import DealerTab from '@/app/components/DealerTab';
import LendingTab from '@/app/components/LendingTab';
import BotSettingsTab from '@/app/components/BotSettingsTab';
import ClaimsTab from '@/app/components/ClaimsTab';
import { GradientActionBtn, IconEdit, IconTrash, IconSend, IconDoc, IconShield, IconCheck, IconPrint, IconKey } from '@/app/components/GradientActionBtn';

/** Konversi Google Drive URL ke proxy lokal agar gambar bisa tampil di dashboard.
 *  drive.google.com tidak bisa di-load langsung karena CORS + domain whitelist Next.js. */
function driveImgSrc(url?: string | null): string {
  if (!url) return '';
  const m = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/) || url.match(/\/d\/([a-zA-Z0-9_-]{10,})\//);
  if (m) return `/api/events/image?id=${m[1]}`;
  return url; // fallback: URL non-Drive (sudah berupa URL publik langsung)
}

// Client-side: proxy through /api/admin/sb (validates admin session, uses service_role).
// SSR/prerender: fall back to real URL (no queries happen server-side; all fetches are in useEffect).
const supabase = createClient(
  typeof window !== 'undefined' ? (window.location.origin + '/api/admin/sb') : (process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      // Matikan auto-refresh & session management bawaan supabase-js
      // agar tidak mengirim request auth ke proxy custom kita yang tidak support auth endpoint
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      // Kirim admin_session cookie ke proxy /api/admin/sb agar verifyAdminSession berhasil
      fetch: (url: RequestInfo | URL, init?: RequestInit) =>
        fetch(url, { ...init, credentials: 'include' }),
    },
  }
);

/**
 * Realtime-only Supabase client — konek langsung ke Supabase (bukan proxy).
 * Proxy /api/admin/sb hanya menangani HTTP REST; WebSocket untuk realtime
 * harus konek ke URL Supabase asli. Anon key cukup untuk menerima notifikasi
 * perubahan; data lengkap tetap di-fetch ulang via proxy yang terautentikasi.
 */
const realtimeSupabase = typeof window !== 'undefined'
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      }
    )
  : null;

/**
 * Helper untuk READ langsung ke server — bypass supabase-js proxy client
 * yang tidak mengirim cookie dengan benar. Mirrors pola sbWrite.
 */
async function sbRead<T = unknown>(opts: {
  table: string;
  select?: string;
  filters?: { col: string; op: 'eq'|'neq'|'gte'|'lte'|'gt'|'lt'|'like'|'ilike'|'in'; val: unknown }[];
  order?: { col: string; ascending?: boolean };
  limit?: number;
  offset?: number;
  count?: boolean;
}): Promise<{ data: T[] | null; count: number | null; error: { message: string } | null }> {
  try {
    const res = await fetch('/api/admin/sb-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const out = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) return { data: null, count: null, error: { message: out.error || JSON.stringify(out) } };
    return { data: (out.data as T[]) ?? null, count: out.count ?? null, error: null };
  } catch (err) {
    return { data: null, count: null, error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

/**
 * Helper untuk semua operasi WRITE (insert/update/delete/upsert).
 * Bypass generic /api/admin/sb proxy (yang HTTP 500 untuk PATCH).
 */
async function sbWrite<T = unknown>(opts: {
  action: 'insert' | 'update' | 'delete' | 'upsert';
  table: string;
  data?: unknown;
  match?: Record<string, unknown>;
  onConflict?: string;
  /** kolom-kolom yg ingin dikembalikan setelah operasi, contoh: "id, nama" */
  select?: string;
}): Promise<{ data: T[] | null; error: { message: string; details?: string; hint?: string; code?: string } | null }> {
  try {
    const res = await fetch('/api/admin/sb-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(opts),
    });
    const out = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok) {
      return { data: null, error: { message: out.error || JSON.stringify(out) } };
    }
    return { data: (out.data as T[]) ?? null, error: null };
  } catch (err) {
    return { data: null, error: { message: err instanceof Error ? err.message : String(err) } };
  }
}

const ID_MONTHS: Record<string, number> = {
   januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
   juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};
function parseIdDate(str: string): Date | null {
   if (!str) return null;
   // Format ISO: "2026-05-24"
   if (/^\d{4}-\d{2}-\d{2}/.test(str.trim())) {
      const d = new Date(str.trim().substring(0, 10));
      return isNaN(d.getTime()) ? null : d;
   }
   // Format teks: "05 Jun 2026" atau "05 Juni 2026"
   const MONTH_ABBR: Record<string, number> = {
      jan:0, feb:1, mar:2, apr:3, mei:4, may:4, jun:5, jul:6, agu:7, aug:7, sep:8, okt:9, oct:9, nov:10, des:11, dec:11,
      januari:0, februari:1, maret:2, april:3, juni:5, juli:6, agustus:7, september:8, oktober:9, november:10, desember:11,
   };
   const p = str.trim().toLowerCase().split(/\s+/);
   if (p.length < 3) return null;
   const d = parseInt(p[0]), m = MONTH_ABBR[p[1]], y = parseInt(p[2]);
   if (isNaN(d) || m === undefined || isNaN(y)) return null;
   return new Date(y, m, d);
}
function getEventClosedStatus(evt: { status: string; stock: number; date: string }, regCount: number): { closed: boolean; reason: string } {
   if (evt.status === 'close') return { closed: true, reason: 'Ditutup Admin' };
   if (evt.stock > 0 && regCount >= evt.stock) return { closed: true, reason: 'Kuota Penuh' };
   // Cek tanggal: event dianggap selesai jika tanggal acara sudah lewat (hari ini masih aktif, besok baru tidak aktif)
   const evtDate = parseIdDate(evt.date);
   if (evtDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (evtDate < today) return { closed: true, reason: 'Acara Selesai' };
   }
   return { closed: false, reason: 'Aktif' };
}

// --- KODE PEMINJAMAN (5 karakter, tanpa O/I/0/1 untuk menghindari kebingungan) ---
function generateKodePeminjaman(): string {
   const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
   let code = '';
   for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
   return code;
}

// --- NORMALISASI NOMOR WHATSAPP ---
// 08xxx → 628xxx | 628xxx → 628xxx | +628xxx → 628xxx | +61xxx → 61xxx
function normalizeWaNumber(nomor: string): string {
   const hasPlus = nomor.trimStart().startsWith('+');
   const digits = nomor.replace(/\D/g, '');
   if (!digits) return '';
   if (hasPlus) return digits;
   if (digits.startsWith('0')) return '62' + digits.slice(1);
   return digits;
}

// --- FORMAT DAFTAR BARANG UNTUK BODY WA ---
function formatLendingItemsForWA(
   items: { nama_barang: string; nomor_seri?: string; accs1?: string; accs2?: string; accs3?: string; accs4?: string; accs5?: string; accs6?: string; accs7?: string; catatan?: string; catatan_pengembalian?: string; status_pengembalian?: string }[],
   type: 'pinjam' | 'kembali',
): string {
   // Meta TIDAK mengizinkan \n di dalam parameter template — gunakan separator " | "
   const relevant = type === 'pinjam' ? items : items.filter(i => i.status_pengembalian === 'dikembalikan');
   return relevant.map((item, idx) => {
      const accs = [item.accs1, item.accs2, item.accs3, item.accs4, item.accs5, item.accs6, item.accs7].filter(Boolean);
      const catatan = type === 'pinjam' ? item.catatan : item.catatan_pengembalian;
      let line = `${idx + 1}. ${item.nama_barang}`;
      if (item.nomor_seri) line += ` (SN: ${item.nomor_seri})`;
      if (accs.length > 0) line += ` - Aksesori: ${accs.join(', ')}`;
      if (catatan) line += ` - Catatan: ${catatan}`;
      return line;
   }).join(' | ');
}

// --- API PENGIRIMAN AMAN VIA SUPABASE EDGE FUNCTION ---
const sendWhatsAppMessage = async (
   targetWa: string,
   message: string,
   templateOpts?: { templateName: string; bodyParams: string[]; documentUrl?: string; documentFilename?: string },
) => {
   const payload = templateOpts
      ? { target: targetWa, ...templateOpts }
      : { target: targetWa, message };
   const res = await fetch('/api/admin/send-wa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
   });
   if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gagal kirim WA: ${err.error || `HTTP ${res.status}`}`);
   }
};

export default function NikonDashboard() {

   // LOGIN & FORGOT PASSWORD STATES
   const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);
   const [isLoggedIn, setIsLoggedIn] = useState(false);
   const [loginForm, setLoginForm] = useState({ username: '', password: '' });
   const [loginError, setLoginError] = useState('');
   const [isForgotPw, setIsForgotPw] = useState(false);
   const [forgotPwUsername, setForgotPwUsername] = useState('');
   const [forgotPwMessage, setForgotPwMessage] = useState('');
   const [isChangePwOpen, setIsChangePwOpen] = useState(false);
   const [changePwForm, setChangePwForm] = useState({ current: '', newPw: '', confirm: '' });
   const [changePwError, setChangePwError] = useState('');
   const [changePwSuccess, setChangePwSuccess] = useState('');

   // DATA STATES
   const [messages, setMessages] = useState<RiwayatPesan[]>([]);
   const [messagesCount, setMessagesCount] = useState<number>(0);
   const [claims, setClaims] = useState<ClaimPromo[]>([]);
   const [warranties, setWarranties] = useState<Garansi[]>([]);
   const [promos, setPromos] = useState<Promosi[]>([]);
   const [services, setServices] = useState<StatusService[]>([]);
   const [budgets, setBudgets] = useState<BudgetApproval[]>([]);
   const [karyawans, setKaryawans] = useState<Karyawan[]>([]);
   const [consumers, setConsumers] = useState<Record<string, string>>({});
   const [botSettings, setBotSettings] = useState<PengaturanBot[]>([]);
   const [lendingRecords, setLendingRecords] = useState<PeminjamanBarang[]>([]);
   const [assets, setAssets] = useState<BarangAset[]>([]);
   const [searchAssets, setSearchAssets] = useState('');
   const [consumersList, setConsumersList] = useState<KonsumenData[]>([]);
   const [viewingKonsumen, setViewingKonsumen] = useState<KonsumenData | null>(null);
   const [events, setEvents] = useState<EventData[]>([]);
   const [searchEvent, setSearchEvent] = useState('');
   const [sortConfigEvents, setSortConfigEvents] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({ column: '', direction: null });
   const [eventRegistrationsCount, setEventRegistrationsCount] = useState<Record<string, number>>({});
   const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
   const [searchRegistration, setSearchRegistration] = useState('');
   const [filterRegEventName, setFilterRegEventName] = useState('Semua');
   type AutocompleteItem = { id: string; field_key: string; value: string; hidden: boolean };
   const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
   const [acFieldTab, setAcFieldTab] = useState('tipe_barang');
   const [acNewValue, setAcNewValue] = useState('');
   const [acSaving, setAcSaving] = useState(false);

   // SEARCH STATES
   const [searchKonsumen, setSearchKonsumen] = useState('');
   const [searchChat, setSearchChat] = useState('');
   const [searchPromo, setSearchPromo] = useState('');
   const [searchClaim, setSearchClaim] = useState('');
   const [filterStatusWarna, setFilterStatusWarna] = useState<string>('Semua');
   const [filterDuplikat, setFilterDuplikat] = useState(false);
   const [filterColClaims, setFilterColClaims] = useState<Record<string, string>>({});
   // tanggal_cetak kini disimpan permanen di kolom claim_promo.tanggal_cetak (Supabase)
   // — tidak lagi pakai localStorage

   // sentStatusClaimIds hanya sebagai fallback sementara sebelum DB di-refresh
   // Status permanen diambil dari claim_promo.resi_sent_at (DB)
   const [sentStatusClaimIds, setSentStatusClaimIds] = useState<Set<string>>(new Set());
   const [qrShortcut, setQrShortcut] = useState('');
   const [qrText, setQrText] = useState('');

   const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());
   const [resiUploadPreview, setResiUploadPreview] = useState<Array<{ id_claim: string; no_seri: string; nama: string; expedisi: string; nomor_resi: string }> | null>(null);
   const [resiModal, setResiModal] = useState<ClaimPromo | null>(null);
   const [resiModalForm, setResiModalForm] = useState<{ nama_jasa_pengiriman: string; nomor_resi: string }>({ nama_jasa_pengiriman: '', nomor_resi: '' });

   const getClaimStatusColor = useCallback((c: ClaimPromo) => {
      const mkt = (c.validasi_by_mkt || '').trim().toLowerCase();
      const fa = (c.validasi_by_fa || '').trim().toLowerCase();
      const isPending = (v: string) => v === 'dalam proses verifikasi' || v === 'dalam proses validasi' || v === '';
      if (mkt === 'double input') return 'Merah';
      if (mkt === 'tidak valid') return 'Merah';
      if (isPending(mkt)) return 'Putih';
      const hasResi = !!(c.nomor_resi && c.nomor_resi.trim() !== '' && c.nomor_resi.trim().toUpperCase() !== 'BELUM_DIISI');
      if (hasResi) {
         const sudahKirim = !!(c.resi_sent_at) || (c.id_claim ? sentStatusClaimIds.has(c.id_claim) : false);
         return sudahKirim ? 'Teal' : 'Hijau';
      }
      if (mkt === 'valid' && fa === 'valid') return 'Pink';
      if (mkt === 'valid' && isPending(fa)) return 'Biru';
      if (mkt === 'hold' && fa !== 'valid') return 'Orange';
      return 'Putih';
   }, [sentStatusClaimIds]);

   const getBadgeStyle = (color: string) => {
      switch(color) {
         case 'Teal': return 'bg-teal-100 text-teal-800 border border-teal-300 rounded-md';
         case 'Hijau': return 'bg-green-100 text-green-800 border border-green-300 rounded-md';
         case 'Pink': return 'bg-pink-100 text-pink-800 border border-pink-200 rounded-md';
         case 'Biru': return 'bg-blue-100 text-blue-800 border border-blue-200 rounded-md';
         case 'Orange': return 'bg-orange-100 text-orange-800 border border-orange-200 rounded-md';
         case 'Merah': return 'bg-red-100 text-red-800 border border-red-200 rounded-md';
         case 'Putih': default: return 'bg-white text-slate-800 border border-gray-300 rounded-md';
      }
   };

   const getBadgeLabel = (color: string) => {
      switch(color) {
         case 'Teal': return '✅ Resi Terkirim';
         case 'Hijau': return '📦 Selesai';
         case 'Pink': return 'Tunggu Resi';
         case 'Biru': return 'Tunggu FA Cek';
         case 'Orange': return 'Hold';
         case 'Merah': return 'Tidak Valid';
         case 'Putih': default: return 'Belum Di Cek';
      }
   };

   const [searchGaransi, setSearchGaransi] = useState('');
   const [showAllActivities, setShowAllActivities] = useState(false);
   const [filterStatusGaransi, setFilterStatusGaransi] = useState('Semua');
   const [searchService, setSearchService] = useState('');
   const [searchBudget, setSearchBudget] = useState('');
   const [searchKaryawan, setSearchKaryawan] = useState('');
   const [searchLending, setSearchLending] = useState('');

   // SORTING STATES
   type SortDirection = 'asc' | 'desc' | null;
   interface SortConfig { column: string; direction: SortDirection; }
   const [sortConfigKonsumen, setSortConfigKonsumen] = useState<SortConfig>({ column: '', direction: null });
   const [sortConfigPromos, setSortConfigPromos] = useState<SortConfig>({ column: '', direction: null });
   const [sortConfigClaims, setSortConfigClaims] = useState<SortConfig>({ column: '', direction: null });
   const [sortConfigWarranties, setSortConfigWarranties] = useState<SortConfig>({ column: '', direction: null });
   const [sortConfigServices, setSortConfigServices] = useState<SortConfig>({ column: '', direction: null });
   const [sortConfigBudgets, setSortConfigBudgets] = useState<SortConfig>({ column: '', direction: null });

   const [sortConfigLending, setSortConfigLending] = useState<SortConfig>({ column: '', direction: null });
   const [sortConfigKaryawans, setSortConfigKaryawans] = useState<SortConfig>({ column: '', direction: null });
   // UI STATES
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const [viewMode, setViewMode] = useState<'table' | 'card'>('card');
   const getReadStatusKey = (userId?: string) => userId ? `nikon_chat_read_status_${userId}` : 'nikon_chat_read_status';
   const [readStatus, setReadStatus] = useState<Record<string, string>>(() => {
      if (typeof window !== 'undefined') {
         try {
            const savedStatus = localStorage.getItem('nikon_chat_read_status');
            if (savedStatus) return JSON.parse(savedStatus);
         } catch {}
      }
      return {};
   });
   // Tag system (WhatsApp Business style) — disimpan di localStorage per nomor_wa
   const [chatTags, setChatTags] = useState<Record<string, string>>(() => {
      if (typeof window !== 'undefined') {
         try {
            const saved = localStorage.getItem('nikon_chat_tags');
            if (saved) return JSON.parse(saved);
         } catch {}
      }
      return {};
   });
   // Pinned chats (localStorage)
   const [pinnedChats, setPinnedChats] = useState<string[]>(() => {
      if (typeof window !== 'undefined') {
         try {
            const saved = localStorage.getItem('nikon_chat_pinned');
            if (saved) return JSON.parse(saved);
         } catch {}
      }
      return [];
   });
   const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'cs' | 'tagged' | 'pinned'>('all');
   const [tagMenuFor, setTagMenuFor] = useState<string | null>(null); // nomor_wa
   const [loading, setLoading] = useState(true);
   const [dataLoadError, setDataLoadError] = useState<string | null>(null);
   const [dbCheckResult, setDbCheckResult] = useState<Record<string, unknown> | null>(null);
   const [dbChecking, setDbChecking] = useState(false);
   const [activeTab, setActiveTab] = useState('dashboard');
   const [returnTab, setReturnTab] = useState<string | null>(null);
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
   const activeTabRef = useRef('dashboard');
   const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: new Date().toISOString().split('T')[0] });

   // MODAL STATES
   const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
   const [modalAction, setModalAction] = useState<'create' | 'edit' | 'reset_pw' | 'return'>('create'); // Type of action for the modal
   const [validasiMode, setValidasiMode] = useState(false);
   const [editingId, setEditingId] = useState<string | null>(null);
   const [selectedWa, setSelectedWa] = useState<string | null>(null);
   const [replyText, setReplyText] = useState('');
   const [quickReplyOpen, setQuickReplyOpen] = useState(false);
   const [quickReplyFilter, setQuickReplyFilter] = useState('');
   const replyInputRef = useRef<HTMLTextAreaElement>(null);
   const chatFileInputRef = useRef<HTMLInputElement>(null);
   const [replyToMessage, setReplyToMessage] = useState<RiwayatPesan | null>(null);
   const [mediaFile, setMediaFile] = useState<File | null>(null);
   const [mediaPreview, setMediaPreview] = useState<string | null>(null);
   const [isUploadingMedia, setIsUploadingMedia] = useState(false);
   // Pagination riwayat chat per-kontak
   const [chatHasMore, setChatHasMore] = useState<Record<string, boolean>>({});
   const [chatLoadedCount, setChatLoadedCount] = useState<Record<string, number>>({});
   const [chatLoadingMore, setChatLoadingMore] = useState(false);
   // Toggle tampilkan pesan sistem (WA template, notifikasi otomatis)
   const [showSystemMessages, setShowSystemMessages] = useState(true);
   const [showScrollToBottom, setShowScrollToBottom] = useState(false);
   const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
   const [isScannerOpen, setIsScannerOpen] = useState(false);
   const [scannerCameras, setScannerCameras] = useState<{ id: string; label: string }[]>([]);
   const [scannerStatus, setScannerStatus] = useState<'detecting' | 'ready' | 'scanning' | 'error'>('detecting');
   const [scannerError, setScannerError] = useState('');
   const scannerRef = useRef<InstanceType<typeof Html5Qrcode> | null>(null);
   const [newChatWa, setNewChatWa] = useState('');
   const [newChatMsg, setNewChatMsg] = useState('');

   // FORM STATES
   const [claimForm, setClaimForm] = useState<Partial<ClaimPromo>>({});
   const [warrantyForm, setWarrantyForm] = useState<Partial<Garansi>>({});
   const [promoForm, setPromoForm] = useState<Partial<Promosi>>({ tipe_produk: [] });
   const [serviceForm, setServiceForm] = useState<Partial<StatusService>>({});
   const [budgetForm, setBudgetForm] = useState<Partial<BudgetApproval>>({ items: [] });
   const [konsumenForm, setKonsumenForm] = useState<Partial<KonsumenData>>({});
   const [karyawanForm, setKaryawanForm] = useState<Partial<Karyawan>>({ role: 'Karyawan', status_aktif: true, akses_halaman: ['messages'] });
   const [lendingForm, setLendingForm] = useState<Partial<PeminjamanBarang>>({ items_dipinjam: [], status_peminjaman: 'aktif' });
   const [showContactPicker, setShowContactPicker] = useState(false);
   const [contactPickerSearch, setContactPickerSearch] = useState('');
   const [showAddContactForm, setShowAddContactForm] = useState(false);
   const [addContactForm, setAddContactForm] = useState({ nama: '', nomor_wa: '' });
   const [addContactLoading, setAddContactLoading] = useState(false);
   const [addContactError, setAddContactError] = useState('');
   const [accsReturnChecked, setAccsReturnChecked] = useState<Record<number, Record<string, boolean>>>({});
   const [assetForm, setAssetForm] = useState<Partial<BarangAset>>({});
   const [botSettingsForm, setBotSettingsForm] = useState<Partial<PengaturanBot>>({});
   const [eventForm, setEventForm] = useState<Partial<EventData>>({});
   const [eventImageFile, setEventImageFile] = useState<File | null>(null);
   const [budgetEventImageFile, setBudgetEventImageFile] = useState<File | null>(null);
   const [registrationForm, setRegistrationForm] = useState<Partial<EventRegistration>>({});

   // AFFILIATE
   const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
   const [affiliateView, setAffiliateView] = useState<'list' | 'detail'>('list');
   const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
   const [affiliateSkema, setAffiliateSkema] = useState<AffiliateSkema[]>([]);
   const [affiliatePenjualan, setAffiliatePenjualan] = useState<AffiliatePenjualan[]>([]);
   const [affiliateFormOpen, setAffiliateFormOpen] = useState(false);
   const [editingAffiliateId, setEditingAffiliateId] = useState<string | null>(null);
   const [affiliateFormData, setAffiliateFormData] = useState<Partial<Affiliate>>({});
   const [skemaFormData, setSkemaFormData] = useState({ barang: '', nilai_barang: '', potongan_persen: '' });
   const [penjualanFormData, setPenjualanFormData] = useState({ barang: '', harga_barang: '', persentase: '' });
   const [skemaFormOpen, setSkemaFormOpen] = useState(false);
   const [penjualanFormOpen, setPenjualanFormOpen] = useState(false);
   const [penjualanFotoFiles, setPenjualanFotoFiles] = useState<File[]>([]);
   const [affiliateFotoProfilFile, setAffiliateFotoProfilFile] = useState<File | null>(null);
   const [affiliateSearch, setAffiliateSearch] = useState('');
   const [affiliateSaving, setAffiliateSaving] = useState(false);
   const [lendingFotoPenerimaanFiles, setLendingFotoPenerimaanFiles] = useState<File[]>([]);
   const [lendingFotoPengembalianFiles, setLendingFotoPengembalianFiles] = useState<File[]>([]);

   // IMPORT CSV STATES
   const [importTarget, setImportTarget] = useState<'claim_promo' | 'garansi' | 'konsumen' | 'status_service'>('claim_promo');

   // SPECIAL STATES
   const [printData, setPrintData] = useState<BudgetApproval | null>(null);
   const [printDownloading, setPrintDownloading] = useState(false);
   const [chatbotTemplates, setChatbotTemplates] = useState<Record<string, string>>({});
   const [chatbotEditValues, setChatbotEditValues] = useState<Record<string, string>>({});
   const [chatbotSaving, setChatbotSaving] = useState<Record<string, boolean>>({});
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [resetPwLoadingId, setResetPwLoadingId] = useState<string | null>(null);
   const [waPasswordMsg, setWaPasswordMsg] = useState<{ nama: string; username: string; password: string } | null>(null);
   const [waPasswordMsgCopied, setWaPasswordMsgCopied] = useState(false);

   // NOTIFICATION CHANNEL
   const [notifChannel, setNotifChannel] = useState<'wa_only' | 'email_only' | 'wa_and_email'>('wa_only');
   const [notifChannelSaving, setNotifChannelSaving] = useState(false);
   const [notifChannelMsg, setNotifChannelMsg] = useState<{ ok: boolean; text: string } | null>(null);

   // TELEGRAM ADMIN NOTIFICATION
   const [telegramChatId, setTelegramChatId] = useState('');
   const [telegramChatIdInput, setTelegramChatIdInput] = useState('');
   const [telegramSaving, setTelegramSaving] = useState(false);
   const [telegramMsg, setTelegramMsg] = useState<{ ok: boolean; text: string } | null>(null);

   // TRANSAKSI DEALER
   const [dealerSheet, setDealerSheet] = useState<{ headers: string[]; rows: string[][]; sheetName: string } | null>(null);
   const [dealerLoading, setDealerLoading] = useState(false);
   const [dealerError, setDealerError] = useState('');
   const [dealerUnsyncedCount, setDealerUnsyncedCount] = useState(0);
   const [dealerSearch, setDealerSearch] = useState('');
   const [dealerSelected, setDealerSelected] = useState<Set<number>>(new Set());
   const [dealerSortCol, setDealerSortCol] = useState<number>(-1);
   const [dealerSortDir, setDealerSortDir] = useState<'asc' | 'desc'>('asc');
   const [dealerColFilters, setDealerColFilters] = useState<Record<number, string>>({});

   // STB MONITORING STATES
   type StbMetrics = {
      hostname: string; platform: string; arch: string;
      cpu: { model: string; cores: number; loadAvg: number[]; usagePercent: number };
      memory: { total: number; used: number; free: number; usedPercent: number };
      disk: { total: number; used: number; free: number; usedPercent: number };
      uptime: { system: number; process: number };
      timestamp: string;
   };
   const [stbMetrics, setStbMetrics] = useState<StbMetrics | null>(null);
   const [stbLoading, setStbLoading] = useState(false);
   const [stbError, setStbError] = useState('');
   const [stbLastUpdated, setStbLastUpdated] = useState<Date | null>(null);

   // IMAGE VIEWER STATES

   const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
   const [currentImageUrl, setCurrentImageUrl] = useState('');
   const [imageScale, setImageScale] = useState(1);
   const [imageTranslate, setImageTranslate] = useState({ x: 0, y: 0 });
   const [isDragging, setIsDragging] = useState(false);
   const [startDragPosition, setStartDragPosition] = useState({ x: 0, y: 0 });
   const [imageRotation, setImageRotation] = useState(0);

   // DUAL DOC VIEWER STATES
   const [isDualDocOpen, setIsDualDocOpen] = useState(false);
   const [dualDocUrls, setDualDocUrls] = useState<{ garansi: string | null; nota: string | null }>({ garansi: null, nota: null });
   const [dualZoomG, setDualZoomG] = useState(1);
   const [dualZoomN, setDualZoomN] = useState(1);
   const [dualRotG, setDualRotG] = useState(0);
   const [dualRotN, setDualRotN] = useState(0);
   const [dualTransG, setDualTransG] = useState({ x: 0, y: 0 });
   const [dualTransN, setDualTransN] = useState({ x: 0, y: 0 });
   const dualDragRef = useRef<{ active: boolean; panel: 'G'|'N'|null; startX: number; startY: number; startTX: number; startTY: number }>({ active: false, panel: null, startX: 0, startY: 0, startTX: 0, startTY: 0 });

   const now = new Date();

   // --- SORTING LOGIC ---
   const handleSort = (sortConfig: SortConfig, setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>, column: string) => {
      let direction: SortDirection = 'asc';
      if (sortConfig.column === column && sortConfig.direction === 'asc') {
         direction = 'desc';
      }
      setSortConfig({ column, direction });
   };

   const getSortFunction = useCallback((sortConfig: SortConfig, consumersMap: Record<string, string> | null = null) => {
      return (a: unknown, b: unknown): number => {
         if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
            return 0;
         }
         const objA = a as Record<string, unknown>;
         const objB = b as Record<string, unknown>;

         if (!sortConfig.column || !sortConfig.direction) {
            const dateA = new Date(objA.created_at as string || 0).getTime();
            const dateB = new Date(objB.created_at as string || 0).getTime();
            if (!isNaN(dateA) && !isNaN(dateB)) {
               return dateB - dateA;
            }
            return 0;
         }

         let aValue: unknown;
         let bValue: unknown;

         // Special handling for 'nama_konsumen' as it can come from KonsumenData or be looked up in consumersMap
         if (sortConfig.column === 'nama_konsumen') {
            const waA = objA.nomor_wa as string;
            const waB = objB.nomor_wa as string;
            aValue = objA.nama_lengkap || (consumersMap ? consumersMap[waA] : waA);
            bValue = objB.nama_lengkap || (consumersMap ? consumersMap[waB] : waB);
         } else {
            aValue = objA[sortConfig.column];
            bValue = objB[sortConfig.column];
         }

         if (aValue == null) return 1;
         if (bValue == null) return -1;

         if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
            return sortConfig.direction === 'asc' ? (aValue === bValue ? 0 : aValue ? -1 : 1) : (aValue === bValue ? 0 : aValue ? 1 : -1);
         }

         if (!isNaN(Number(aValue)) && !isNaN(Number(bValue)) && typeof aValue !== 'boolean' && typeof bValue !== 'boolean') {
            return sortConfig.direction === 'asc' ? Number(aValue) - Number(bValue) : Number(bValue) - Number(aValue);
         }

         return sortConfig.direction === 'asc'
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
      };
   }, []);

   const driveDocThumb = (url: string | null | File): string => {
      if (!url || url instanceof File) return '';
      const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m) return `/api/drive-file?id=${m[1]}`;
      return url;
   };

   const toDriveProxy = (url: string): string => {
      const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      return m ? `/api/drive-file?id=${m[1]}` : url;
   };

   const openDualDocViewer = (garansi: string | File | null | undefined, nota: string | File | null | undefined) => {
      const toUrl = (v: string | File | null | undefined): string | null => {
         if (!v) return null;
         if (v instanceof File) return URL.createObjectURL(v);
         return v;
      };
      setDualDocUrls({ garansi: toUrl(garansi), nota: toUrl(nota) });
      setDualZoomG(1);
      setDualZoomN(1);
      setDualRotG(0);
      setDualRotN(0);
      setDualTransG({ x: 0, y: 0 });
      setDualTransN({ x: 0, y: 0 });
      setIsDualDocOpen(true);
   };

   const isGoogleDriveLink = (url: string): boolean => {
      if (typeof url !== 'string') return false;
      return /(?:drive\.google\.com|docs\.google\.com|sheets\.google\.com|slides\.google\.com|forms\.google\.com)/.test(url);
   };

   const openImageViewer = (urlOrFile: string | File) => {
      if (typeof urlOrFile === 'string' && isGoogleDriveLink(urlOrFile)) {
         window.open(toDriveProxy(urlOrFile), '_blank', 'noopener,noreferrer');
         return;
      }

      if (urlOrFile instanceof File) {
         setCurrentImageUrl(URL.createObjectURL(urlOrFile));
      } else {
         setCurrentImageUrl(urlOrFile);
      }
      setIsImageViewerOpen(true);
      setImageScale(1);
      setImageTranslate({ x: 0, y: 0 });
      setImageRotation(0);
      setIsDragging(false);
   };

   const closeImageViewer = () => {
      setIsImageViewerOpen(false);
      setCurrentImageUrl('');
   };

   const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (currentImageUrl.toLowerCase().endsWith('.pdf') || currentImageUrl.startsWith('data:application/pdf')) return;
      e.preventDefault();
      setIsDragging(true);
      setStartDragPosition({ x: e.clientX - imageTranslate.x, y: e.clientY - imageTranslate.y });
   };

   const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setImageTranslate({ x: e.clientX - startDragPosition.x, y: e.clientY - startDragPosition.y });
   };

   const handleMouseUp = () => {
      setIsDragging(false);
   };

   const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
      if (currentImageUrl.toLowerCase().endsWith('.pdf') || currentImageUrl.startsWith('data:application/pdf')) return;
      e.preventDefault();
      const scaleAmount = 0.1;
      const newScale = e.deltaY < 0 ? imageScale * (1 + scaleAmount) : imageScale / (1 + scaleAmount);
      setImageScale(Math.max(0.1, Math.min(5, newScale))); // Limit zoom between 0.1x and 5x
   };

   // --- GOOGLE DRIVE UPLOAD HELPER ---
   /** Kompres gambar sebelum upload — maks 1800px, JPEG 0.82. PDF dilewati. */
   const compressForUpload = (file: File): Promise<File> => new Promise(resolve => {
      if (!file.type.startsWith('image/')) { resolve(file); return; }
      const img = document.createElement('img') as HTMLImageElement;
      const url = URL.createObjectURL(file);
      img.onload = () => {
         URL.revokeObjectURL(url);
         const MAX = 1800;
         let { width, height } = img;
         if (width > MAX || height > MAX) {
            if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
            else { width = Math.round(width * MAX / height); height = MAX; }
         }
         const canvas = document.createElement('canvas');
         canvas.width = width; canvas.height = height;
         canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
         canvas.toBlob(blob => {
            if (!blob) { resolve(file); return; }
            resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
         }, 'image/jpeg', 0.82);
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
   });

   const uploadFileToStorage = async (file: File, prefix: string, serial: string) => {
      const compressed = await compressForUpload(file);
      const formData = new FormData();
      formData.append('file', compressed);
      formData.append('prefix', prefix);
      formData.append('serial', serial);

      const response = await fetch('/api/upload-google-drive', {
         method: 'POST',
         body: formData,
      });

      if (!response.ok) {
         const text = await response.text();
         let msg = 'Upload failed';
         try { msg = JSON.parse(text).error || msg; } catch { msg = text.slice(0, 120); }
         throw new Error(msg);
      }

      const data = await response.json();
      return data.url;
   };

   const deleteFileFromStorage = async (url: string) => {
      try {
         if (!url || !url.includes('drive.google.com')) return;
         const match = url.match(/id=([^&]+)/);
         if (match) {
            await fetch('/api/upload-google-drive', {
               method: 'DELETE',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ fileId: match[1] }),
            });
         }
      } catch (err) {
         console.error("Gagal hapus file dari Google Drive:", err);
      }
   };

   // --- IMAGE PROXY HELPER (routes Google Drive URLs through server-side proxy) ---
   const proxyImg = (url: string | null | undefined): string | null => {
      if (!url) return null;
      const qId = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/)?.[1];
      if (qId) return `/api/drive-file?id=${qId}`;
      const pathId = url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/)?.[1];
      if (pathId) return `/api/drive-file?id=${pathId}`;
      const lhId = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/)?.[1];
      if (lhId) return `/api/drive-file?id=${lhId}`;
      return url;
   };

   // --- MULTIMEDIA HELPERS ---
   const isImageUrl = (text: string) => {
      if (!text) return false;
      // Ekstensi gambar umum
      const extPattern = /https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp|bmp)/i;
      // Google Drive view link (dari WhatsApp attachment)
      const drivePattern = /https:\/\/drive\.google\.com\/uc\?id=[^\s]+/i;
      return extPattern.test(text) || drivePattern.test(text);
   };

   // REFS
   const fileInputRef = useRef<HTMLInputElement>(null);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const chatContainerRef = useRef<HTMLDivElement>(null);
   const resiCsvInputRef = useRef<HTMLInputElement>(null);

   useEffect(() => {
      const el = chatContainerRef.current;
      if (!el) return;
      const handleWheel = (e: WheelEvent) => {
         if (Math.abs(e.deltaY) > 20) {
            e.preventDefault();
            el.scrollBy({ top: e.deltaY * 2, behavior: 'smooth' });
         }
      };
      el.addEventListener('wheel', handleWheel, { passive: false });
      return () => el.removeEventListener('wheel', handleWheel);
   }, [selectedWa]);

   useEffect(() => {
      const el = chatContainerRef.current;
      if (!el) return;
      const handleScroll = () => {
         const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
         setShowScrollToBottom(distFromBottom > 120);
      };
      el.addEventListener('scroll', handleScroll);
      return () => el.removeEventListener('scroll', handleScroll);
   }, [selectedWa]);

   useEffect(() => {
      const key = getReadStatusKey(currentUser?.id_karyawan);
      localStorage.setItem(key, JSON.stringify(readStatus));
   }, [readStatus, currentUser?.id_karyawan]);
   // ESC key untuk tutup modal cepat
   useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'Escape') {
            if (isModalOpen) closeModal();
            else if (isNewChatModalOpen) setIsNewChatModalOpen(false);
            else if (isScannerOpen) setIsScannerOpen(false);
            else if (isImageViewerOpen) closeImageViewer();
         }
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isModalOpen, isNewChatModalOpen, isScannerOpen, isImageViewerOpen]);
   useEffect(() => {
      if (typeof window !== 'undefined') localStorage.setItem('nikon_chat_tags', JSON.stringify(chatTags));
   }, [chatTags]);
   useEffect(() => {
      if (typeof window !== 'undefined') localStorage.setItem('nikon_chat_pinned', JSON.stringify(pinnedChats));
   }, [pinnedChats]);
   // Fetch Affiliates saat tab aktif
   useEffect(() => {
      if (activeTab !== 'affiliate') return;
      if (affiliates.length === 0) fetchAffiliates();
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [activeTab]);

   // Fetch data Transaksi Dealer saat tab aktif (lazy, sekali muat)
   useEffect(() => {
      if (activeTab !== 'dealer' || dealerSheet !== null || dealerLoading) return;
      setDealerLoading(true);
      setDealerError('');
      // Muat dari Supabase, lalu cek unsynced di background
      fetch('/api/transaksi-dealer/sync')
         .then(r => r.json())
         .then((json: { error?: string; headers: string[]; rows: string[][]; total: number; source?: string }) => {
            if (json.error) throw new Error(json.error);
            setDealerSheet({ headers: json.headers, rows: json.rows, sheetName: 'Supabase' });
            // Cek unsynced di background (tidak block loading)
            fetch('/api/transaksi-dealer/check')
               .then(r => r.json())
               .then((chk: { unsynced_count?: number }) => { if (chk.unsynced_count) setDealerUnsyncedCount(chk.unsynced_count); })
               .catch(() => {/* silent */});
         })
         .catch((e: Error) => setDealerError(e.message))
         .finally(() => setDealerLoading(false));
   }, [activeTab, dealerSheet, dealerLoading]);
   // Fetch STB metrics saat tab infrastruktur aktif, refresh setiap 30 detik
   useEffect(() => {
      if (activeTab !== 'infrastruktur') return;
      const loadMetrics = () => {
         setStbLoading(true);
         setStbError('');
         fetch('https://backup.altanikindo.web.id/api/infrastruktur/stb')
            .then(r => r.json())
            .then((data: StbMetrics) => { setStbMetrics(data); setStbLastUpdated(new Date()); })
            .catch((e: Error) => setStbError(e.message || 'Gagal mengambil data STB'))
            .finally(() => setStbLoading(false));
      };
      loadMetrics();
      const timer = setInterval(loadMetrics, 30000);
      return () => clearInterval(timer);
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [activeTab]);

   // Migrasi key lama ke key per-user, lalu load dari Supabase (sync lintas perangkat)
   useEffect(() => {
      if (!currentUser?.id_karyawan) return;
      const userId = currentUser.id_karyawan;
      const oldKey = 'nikon_chat_read_status';
      const newKey = getReadStatusKey(userId);

      // Migrasi localStorage: generic → per-user
      try {
         const existing = localStorage.getItem(newKey);
         if (!existing) {
            const old = localStorage.getItem(oldKey);
            if (old) { localStorage.setItem(newKey, old); setReadStatus(JSON.parse(old)); }
         } else {
            setReadStatus(JSON.parse(existing));
         }
      } catch {}

      // Load dari Supabase dan merge (data DB menang jika lebih baru)
      sbRead<{ nomor_wa: string; last_read_at: string }>({
         table: 'chat_read_status',
         filters: [{ col: 'id_karyawan', op: 'eq', val: userId }],
      }).then(({ data }) => {
         if (!data?.length) return;
         setReadStatus(prev => {
            const merged = { ...prev };
            data.forEach(row => {
               const existing = merged[row.nomor_wa];
               if (!existing || new Date(row.last_read_at) > new Date(existing)) {
                  merged[row.nomor_wa] = row.last_read_at;
               }
            });
            return merged;
         });
      }).catch(() => {});
   }, [currentUser?.id_karyawan]);

   // Tandai terbaca saat kontak dibuka
   useEffect(() => {
      if (!selectedWa) return;
      const now = new Date().toISOString();
      setReadStatus(prev => ({ ...prev, [selectedWa]: now }));
   }, [selectedWa]);

   // Auto-update readStatus saat pesan baru tiba & chat masih terbuka
   // Pesan yang sudah terlihat langsung dianggap terbaca, lalu sync ke DB
   useEffect(() => {
      if (!selectedWa || !currentUser?.id_karyawan) return;
      const inMsgs = messages.filter(m => m.nomor_wa === selectedWa && m.arah_pesan === 'IN');
      if (inMsgs.length === 0) return;
      const latestTs = inMsgs.reduce((max, m) => {
         const t = new Date(m.waktu_pesan || m.created_at || 0).getTime();
         return t > max ? t : max;
      }, 0);
      if (!latestTs) return;
      setReadStatus(prev => {
         const current = prev[selectedWa] ? new Date(prev[selectedWa]).getTime() : 0;
         if (latestTs <= current) return prev;
         const newTs = new Date(latestTs).toISOString();
         // Sync ke Supabase agar perangkat lain ikut update
         sbWrite({
            action: 'upsert',
            table: 'chat_read_status',
            data: { id_karyawan: currentUser!.id_karyawan, nomor_wa: selectedWa, last_read_at: newTs },
            onConflict: 'id_karyawan,nomor_wa',
         }).catch(() => {});
         return { ...prev, [selectedWa]: newTs };
      });
   }, [selectedWa, messages, currentUser?.id_karyawan]);

   // --- FETCH DATA ---
   const fetchConsumers = async () => {
      try {
         const map: Record<string, string> = {};
         // Konsumen table — via sbRead (proxy supabase-js tidak reliable)
         const { data: konsumenData } = await sbRead<KonsumenData>({ table: 'konsumen', order: { col: 'created_at', ascending: false } });
         if (konsumenData) {
            setConsumersList(konsumenData);
            konsumenData.forEach(k => { if (k.nama_lengkap) map[k.nomor_wa] = k.nama_lengkap; });
         }
         // Kontak unik dari riwayat_pesan — via sbRead
         const { data: riwayatData } = await sbRead<{ nomor_wa: string; nama_profil_wa: string }>({
            table: 'riwayat_pesan',
            select: 'nomor_wa, nama_profil_wa',
            filters: [{ col: 'nama_profil_wa', op: 'neq', val: 'Sistem Bot' }],
            order: { col: 'created_at', ascending: false },
         });
         riwayatData?.forEach(r => { if (r.nomor_wa && !map[r.nomor_wa]) map[r.nomor_wa] = r.nama_profil_wa; });
         setConsumers(map);
      } catch (err) {
         console.error("fetchConsumers error:", err);
      }
   };

   const fetchMessages = async () => {
      // Pakai sbRead (direct server fetch) bukan supabase-js proxy.
      // Gunakan tanggal LOKAL browser (bukan UTC) agar pesan hari ini tidak terpotong.
      // Di WIB (UTC+7), new Date().toISOString() masih menunjukkan tanggal KEMARIN UTC
      // hingga jam 07:00 WIB — sehingga pesan yang dibuat setelah midnight WIB ter-exclude.
      const d = new Date();
      const todayLocal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const { data, count, error } = await sbRead<RiwayatPesan>({
         table: 'riwayat_pesan',
         filters: [
            { col: 'created_at', op: 'gte', val: `${dateRange.start}T00:00:00` },
            { col: 'created_at', op: 'lte', val: `${todayLocal}T23:59:59` },
         ],
         order: { col: 'created_at', ascending: false },
         count: true,
      });
      if (error) {
         console.error('fetchMessages error:', error.message);
         setDataLoadError(`[pesan] ${error.message}`);
         return;
      }
      // Merge: jangan hapus pesan historis dari fetchContactHistory (di luar date range).
      // Ganti hanya pesan yang ID-nya sudah ada di fresh data; sisanya dipertahankan.
      setMessages(prev => {
         const fresh = data || [];
         const freshIds = new Set(fresh.map(m => m.id_pesan));
         const extra = prev.filter(m => !freshIds.has(m.id_pesan) && !m.id_pesan?.startsWith('__opt_'));
         return [...fresh, ...extra];
      });
      setMessagesCount(count ?? data?.length ?? 0);
   };

   /**
    * Tarik riwayat percakapan satu kontak dengan pagination (50 pesan per halaman).
    * offset=0 → load awal (50 terbaru), offset>0 → muat lebih banyak pesan lama.
    * Hasilnya di-merge ke state messages; pesan kontak lain tetap utuh.
    */
   const CHAT_PAGE_SIZE = 50;
   const fetchContactHistory = useCallback(async (wa: string, offset = 0) => {
      const { data, error } = await sbRead<RiwayatPesan>({
         table: 'riwayat_pesan',
         filters: [{ col: 'nomor_wa', op: 'eq', val: wa }],
         order: { col: 'waktu_pesan', ascending: false },
         limit: CHAT_PAGE_SIZE + 1, // ambil satu ekstra untuk deteksi "ada lebih"
         offset,
      });
      if (error) {
         console.error('[fetchContactHistory] error:', error.message);
         return;
      }
      const raw = data ?? [];
      const hasMore = raw.length > CHAT_PAGE_SIZE;
      const page = hasMore ? raw.slice(0, CHAT_PAGE_SIZE) : raw;

      setChatHasMore(prev => ({ ...prev, [wa]: hasMore }));
      setChatLoadedCount(prev => ({ ...prev, [wa]: (offset === 0 ? 0 : (prev[wa] || 0)) + page.length }));

      if (offset === 0) {
         // Load awal: ganti semua pesan kontak ini
         setMessages(prev => [
            ...page,
            ...prev.filter(m => m.nomor_wa !== wa),
         ]);
      } else {
         // Load lebih: prepend pesan-pesan lebih lama (currentChatThread akan sort ASC otomatis)
         setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id_pesan).filter(Boolean) as string[]);
            const newOld = page.filter(m => !m.id_pesan || !existingIds.has(m.id_pesan));
            return [...newOld, ...prev];
         });
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);
   const fetchTable = async <T,>(table: string, setter: (d: T[]) => void, options?: { dateFilter?: boolean; ascending?: boolean }) => {
      try {
         let query = supabase.from(table).select('*');
         if (options?.dateFilter) {
            query = query.gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`);
         }
         query = query.order('created_at', { ascending: options?.ascending ?? false });
         const { data, error } = await query;
         if (error) {
            console.error(`fetch ${table}:`, error.message, error.code, error.details);
            setDataLoadError(`[${table}] ${error.message || error.code || 'Unknown error'}`);
         } else if (!data) {
            // data null tapi tidak ada error — kemungkinan proxy error (ENV_MISSING, dll)
            console.warn(`fetch ${table}: data null, error null`);
         }
         setter((data || []) as T[]);
      } catch (err) {
         console.error(`fetch ${table}:`, err);
         setDataLoadError(`[${table}] Network error`);
         setter([]);
      }
   };

   const fetchAssets = async () => {
      try {
         const { data, error } = await supabase.from('barang_aset').select('*').order('nama_barang_aset', { ascending: true });
         if (error) console.error('fetch barang_aset:', error.message);
         setAssets((data || []) as BarangAset[]);
      } catch (err) {
         console.error('fetch barang_aset:', err);
         setAssets([]);
      }
   };
   const fetchClaims = () => fetchTable<ClaimPromo>('claim_promo', setClaims, { dateFilter: true });
   const fetchWarranties = () => fetchTable<Garansi>('garansi', setWarranties, { dateFilter: true });
   const fetchPromos = () => fetchTable<Promosi>('promosi', setPromos);
   const fetchServices = () => fetchTable<StatusService>('status_service', setServices);
   const fetchBudgets = () => fetchTable<BudgetApproval>('budget_approval', setBudgets);
   const fetchLendingRecords = () => fetchTable<PeminjamanBarang>('peminjaman_barang', setLendingRecords);
   
   const fetchEventRegistrations = useCallback(async () => { const { data } = await supabase.from('event_registrations').select('*').order('created_at', { ascending: false }); setEventRegistrations(data || []); }, []);
   const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false });
      // Alias DB columns (event_*) ke field lama yang dipakai display dashboard
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped = (data || []).map((e: any) => ({
         ...e,
         title: e.event_title ?? e.title,
         date: e.event_date ?? e.date,
         price: e.event_price ?? e.price,
         image: e.event_image ?? e.image,
         stock: e.event_partisipant_stock ?? e.stock ?? 0,
         status: e.event_status ?? e.status,
         detail_acara: e.event_description ?? e.detail_acara,
      }));
      setEvents(mapped);
      try {
         const { data: regData } = await supabase.from('event_registrations').select('event_name');
         if (regData) {
            const counts: Record<string, number> = {};
            regData.forEach((r: { event_name: string }) => {
               counts[r.event_name] = (counts[r.event_name] || 0) + 1;
            });
            setEventRegistrationsCount(counts);
         }
      } catch { }
   };

   const handleMarkAttendance = useCallback(async (id: string) => {
      try {
         const { error } = await sbWrite({ action: 'update', table: 'event_registrations', data: { is_attended: true }, match: { id } });
         if (error) throw error;
         alert('✅ Kehadiran Berhasil Dikonfirmasi!');
         fetchEventRegistrations();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal konfirmasi kehadiran: ' + message);
      }
   }, [fetchEventRegistrations]);

   // Detect kamera saat scanner dibuka
   useEffect(() => {
      if (!isScannerOpen) {
         scannerRef.current?.stop().catch(() => {});
         scannerRef.current = null;
         setScannerCameras([]);
         setScannerStatus('detecting');
         setScannerError('');
         return;
      }
      setScannerStatus('detecting');
      Html5Qrcode.getCameras()
         .then(cams => {
            if (!cams.length) { setScannerStatus('error'); setScannerError('Tidak ada kamera tersedia di perangkat ini.'); return; }
            setScannerCameras(cams);
            setScannerStatus('ready');
         })
         .catch(err => {
            setScannerStatus('error');
            setScannerError('Izin kamera ditolak atau tidak tersedia: ' + (err?.message || String(err)));
         });
      return () => {
         scannerRef.current?.stop().catch(() => {});
         scannerRef.current = null;
      };
   }, [isScannerOpen]);

   const startScanCamera = useCallback(async (camId: string) => {
      setScannerStatus('scanning');
      try {
         if (scannerRef.current) { await scannerRef.current.stop().catch(() => {}); }
         const qr = new Html5Qrcode('reader');
         scannerRef.current = qr;
         await qr.start(
            camId,
            { fps: 10, qrbox: { width: 240, height: 240 } },
            async (decodedText) => {
               await qr.stop().catch(() => {});
               scannerRef.current = null;
               setIsScannerOpen(false);
               await handleMarkAttendance(decodedText);
            },
            () => {}
         );
      } catch (err) {
         setScannerStatus('error');
         setScannerError('Gagal membuka kamera: ' + (err instanceof Error ? err.message : String(err)));
      }
   }, [handleMarkAttendance]);

   const fetchBotSettings = async () => {
     const { data } = await supabase.from('pengaturan_bot').select('*');
     setBotSettings(data || []);
     // Sync notif_channel state dari DB
     const row = (data || []).find((r: { nama_pengaturan: string }) => r.nama_pengaturan === 'notif_channel');
     if (row?.description && ['wa_only', 'email_only', 'wa_and_email'].includes(row.description)) {
       setNotifChannel(row.description as 'wa_only' | 'email_only' | 'wa_and_email');
     }
     // Sync telegram_admin_chat_id
     const tgRow = (data || []).find((r: { nama_pengaturan: string }) => r.nama_pengaturan === 'telegram_admin_chat_id');
     if (tgRow?.description) {
       setTelegramChatId(tgRow.description);
       setTelegramChatIdInput(tgRow.description);
     }
   };

   const fetchAutocomplete = async () => {
      const { data } = await supabase.from('autocomplete_items').select('*').order('field_key').order('value');
      setAutocompleteItems(data || []);
   };

   const fetchAffiliates = async () => {
      const { data } = await supabase.from('affiliates').select('*').order('created_at', { ascending: false });
      setAffiliates(data || []);
   };
   const fetchAffiliateDetail = async (affiliateId: string) => {
      const [{ data: skema }, { data: penjualan }] = await Promise.all([
         supabase.from('affiliate_skema').select('*').eq('affiliate_id', affiliateId).order('created_at'),
         supabase.from('affiliate_penjualan').select('*').eq('affiliate_id', affiliateId).order('created_at'),
      ]);
      setAffiliateSkema(skema || []);
      setAffiliatePenjualan(penjualan || []);
   };
   const saveAffiliate = async () => {
      if (!affiliateFormData.nama || !affiliateFormData.phone) return;
      setAffiliateSaving(true);
      let fotoProfilUrl = affiliateFormData.foto_profil;
      if (affiliateFotoProfilFile) {
         try {
            fotoProfilUrl = await uploadFileToStorage(affiliateFotoProfilFile, 'Affiliate_Profil', (affiliateFormData.nama || 'aff').replace(/\s+/g, '_'));
         } catch { /* skip failed upload */ }
      }
      const dataToSave = { ...affiliateFormData, foto_profil: fotoProfilUrl || null };
      let saveError: string | null = null;
      if (editingAffiliateId) {
         const { error } = await sbWrite({ action: 'update', table: 'affiliates', data: dataToSave, match: { id: editingAffiliateId } });
         if (error) saveError = error.message;
         else if (selectedAffiliate?.id === editingAffiliateId) setSelectedAffiliate(prev => prev ? { ...prev, ...dataToSave as Affiliate } : null);
      } else {
         const { error } = await sbWrite({ action: 'insert', table: 'affiliates', data: dataToSave });
         if (error) saveError = error.message;
      }
      if (saveError) {
         alert(`Gagal menyimpan affiliate:\n${saveError}`);
         setAffiliateSaving(false);
         return;
      }
      await fetchAffiliates();
      setAffiliateFormOpen(false);
      setAffiliateFormData({});
      setEditingAffiliateId(null);
      setAffiliateFotoProfilFile(null);
      setAffiliateSaving(false);
   };
   const deleteAffiliate = async (id: string) => {
      if (!confirm('Hapus affiliate ini beserta semua data skema dan penjualannya?')) return;
      await sbWrite({ action: 'delete', table: 'affiliate_penjualan', match: { affiliate_id: id } });
      await sbWrite({ action: 'delete', table: 'affiliate_skema', match: { affiliate_id: id } });
      await sbWrite({ action: 'delete', table: 'affiliates', match: { id } });
      await fetchAffiliates();
      if (selectedAffiliate?.id === id) { setSelectedAffiliate(null); setAffiliateView('list'); }
   };
   const addSkema = async () => {
      if (!selectedAffiliate || !skemaFormData.barang || !skemaFormData.nilai_barang) return;
      setAffiliateSaving(true);
      await sbWrite({ action: 'insert', table: 'affiliate_skema', data: {
         affiliate_id: selectedAffiliate.id,
         barang: skemaFormData.barang,
         nilai_barang: parseFloat(skemaFormData.nilai_barang) || 0,
         potongan_persen: parseFloat(skemaFormData.potongan_persen) || 0,
      }});
      await fetchAffiliateDetail(selectedAffiliate.id);
      setSkemaFormData({ barang: '', nilai_barang: '', potongan_persen: '' });
      setSkemaFormOpen(false);
      setAffiliateSaving(false);
   };
   const deleteSkema = async (id: string) => {
      if (!selectedAffiliate) return;
      await sbWrite({ action: 'delete', table: 'affiliate_skema', match: { id } });
      await fetchAffiliateDetail(selectedAffiliate.id);
   };
   const addPenjualan = async () => {
      if (!selectedAffiliate || !penjualanFormData.barang || !penjualanFormData.harga_barang) return;
      setAffiliateSaving(true);
      const fotoUrls: string[] = [];
      for (const file of penjualanFotoFiles) {
         try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('prefix', 'affiliate-foto');
            fd.append('serial', selectedAffiliate.nama.replace(/\s+/g, '_'));
            const res = await fetch('/api/upload-google-drive', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.url) fotoUrls.push(data.url);
         } catch { /* skip failed upload */ }
      }
      await sbWrite({ action: 'insert', table: 'affiliate_penjualan', data: {
         affiliate_id: selectedAffiliate.id,
         barang: penjualanFormData.barang,
         harga_barang: parseFloat(penjualanFormData.harga_barang) || 0,
         persentase: parseFloat(penjualanFormData.persentase) || 0,
         ...(fotoUrls.length > 0 ? { foto_urls: fotoUrls } : {}),
      }});
      await fetchAffiliateDetail(selectedAffiliate.id);
      setPenjualanFormData({ barang: '', harga_barang: '', persentase: '' });
      setPenjualanFotoFiles([]);
      setPenjualanFormOpen(false);
      setAffiliateSaving(false);
   };
   const deletePenjualan = async (id: string) => {
      if (!selectedAffiliate) return;
      await sbWrite({ action: 'delete', table: 'affiliate_penjualan', match: { id } });
      await fetchAffiliateDetail(selectedAffiliate.id);
   };

   const handleACAdd = async (fieldKey: string, val: string, hidden = false) => {
      if (!val.trim()) return;
      setAcSaving(true);
      await fetch('/api/autocomplete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ field_key: fieldKey, value: val.trim(), hidden }) });
      await fetchAutocomplete();
      setAcNewValue('');
      setAcSaving(false);
   };

   const handleACDelete = async (id: string) => {
      await fetch(`/api/autocomplete?id=${id}`, { method: 'DELETE' });
      await fetchAutocomplete();
   };
   const fetchKaryawans = async () => {
      try {
         const { data, error } = await supabase.from('karyawan').select('*').order('created_at', { ascending: true });
         if (error) console.error("fetch karyawan:", error.message);
         setKaryawans(data || []);
      } catch (err) {
         console.error("fetch karyawan:", err);
         setKaryawans([]);
      }
   };
   
   // Reset zoom panel dokumen saat modal dibuka
   useEffect(() => { if (isModalOpen) { setDualZoomG(1); setDualZoomN(1); setDualRotG(0); setDualRotN(0); setDualTransG({ x: 0, y: 0 }); setDualTransN({ x: 0, y: 0 }); } }, [isModalOpen]);

   // Restore session dari localStorage hanya di client (hindari hydration mismatch)
   // Verifikasi cookie admin_session masih valid sebelum set isLoggedIn=true
   useEffect(() => {
      const saved = localStorage.getItem('nikon_karyawan');
      if (!saved) { setLoading(false); return; }
      let user: Karyawan;
      try { user = JSON.parse(saved); } catch { localStorage.removeItem('nikon_karyawan'); setLoading(false); return; }
      fetch('/api/admin/auth', { cache: 'no-store' })
         .then(async res => {
            if (res.ok) {
               // Refresh data karyawan dari DB agar akses_halaman selalu up-to-date
               try {
                  const meUrl = user.username
                     ? `/api/auth/me?username=${encodeURIComponent(user.username)}`
                     : '/api/auth/me';
                  const meRes = await fetch(meUrl, { cache: 'no-store' });
                  if (meRes.ok) {
                     const meData = await meRes.json();
                     if (meData.karyawan) {
                        user = { ...user, ...meData.karyawan };
                        localStorage.setItem('nikon_karyawan', JSON.stringify(user));
                     }
                  }
               } catch { /* gunakan data localStorage jika /me gagal */ }
               setCurrentUser(user);
               setIsLoggedIn(true);
            } else {
               // Cookie expired — hapus localStorage agar login form muncul
               localStorage.removeItem('nikon_karyawan');
               setLoading(false);
            }
         })
         .catch(() => { setLoading(false); });
   }, []);

   useEffect(() => {
      if (!isLoggedIn) return;

      const fetchAllData = async () => {
         // 1. Cek session via /api/admin/auth (selalu diizinkan middleware)
         try {
            const sessionOk = await fetch('/api/admin/auth', { cache: 'no-store' }).then(r => r.ok);
            if (!sessionOk) {
               // Cookie tidak valid / kadaluarsa → tampilkan login langsung
               localStorage.removeItem('nikon_karyawan');
               setIsLoggedIn(false);
               setCurrentUser(null);
               setLoading(false);
               return;
            }
         } catch { /* network issue — lanjutkan */ }

         // 2. Cek koneksi DB — deteksi masalah env vars atau session ditolak middleware
         try {
            const check = await fetch('/api/admin/sb-check', { cache: 'no-store' });
            if (!check.ok) {
               const body = await check.json().catch(() => ({})) as { error?: string; envOk?: boolean };
               if (check.status === 401) {
                  // Middleware menolak session → logout paksa
                  localStorage.removeItem('nikon_karyawan');
                  setIsLoggedIn(false);
                  setCurrentUser(null);
                  setLoading(false);
                  return;
               }
               if (check.status === 503 || body.envOk === false) {
                  // Env vars Supabase tidak dikonfigurasi di server
                  setDataLoadError('❌ Konfigurasi server tidak lengkap: SUPABASE_SERVICE_ROLE_KEY atau NEXT_PUBLIC_SUPABASE_URL belum diset di Vercel. Hubungi developer.');
                  setLoading(false);
                  return;
               }
            }
         } catch { /* jaringan error — lanjutkan, proxy akan handle */ }

         setLoading(true);
         setDataLoadError(null);
         try {
            const promises = [
               fetchConsumers(),
               fetchMessages(),
               fetchClaims(),
               fetchWarranties(),
               fetchPromos(),
               fetchServices(),
               fetchBudgets(),
               fetchLendingRecords(),
               fetchAssets(),
               fetchBotSettings(),
               fetchEvents(),
               fetchEventRegistrations(),
               fetchAutocomplete(),
               loadChatbotTemplates(supabase).then(setChatbotTemplates),
            ];
            if (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') {
               promises.push(fetchKaryawans());
            }
            await Promise.all(promises);
         } catch (error) {
            console.error("Error fetching data:", error);
         } finally {
            setLoading(false);
         }
      };
      fetchAllData();

      // Cek koneksi Supabase
      const checkConnection = async () => {
         try {
            if (false) { // supabase proxy is always available
               console.warn('Supabase key is not configured.');
               return;
            }
            const { error } = await supabase.from('karyawan').select('count', { count: 'exact', head: true });
            if (error) {
               const errorMsg = error?.message || error?.code || 'Unknown error';
               console.warn("[DB CONNECTION] Error checking connection:", errorMsg);
               return;
            }
            console.log("Supabase connection successful.");
         } catch (err: unknown) {
            console.error("[DB CONNECTION] Unexpected error:", err);
         }
      };
      checkConnection();

      // Realtime: pakai client langsung ke Supabase (bukan proxy) karena WebSocket
      // tidak bisa melewati HTTP proxy. Saat ada perubahan di riwayat_pesan,
      // fetch ulang via proxy yang terautentikasi agar data penuh ter-load.
      const rt = realtimeSupabase;
      if (!rt) return;
      const subscription = rt.channel('messages-realtime')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_pesan' }, () => {
            fetchMessages();
         }).subscribe((status) => {
            if (status === 'SUBSCRIBED') console.log('[realtime] riwayat_pesan subscribed ✓');
            if (status === 'CHANNEL_ERROR') console.warn('[realtime] riwayat_pesan channel error');
         });

      return () => { subscription.unsubscribe(); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isLoggedIn, dateRange, currentUser?.role]);

   // Sync ref aktif tab agar interval selalu baca tab terkini
   useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

   // Auto-poll 30 detik — refresh data tab aktif tanpa loading spinner penuh
   useEffect(() => {
      if (!isLoggedIn) return;
      let running = false;
      const poll = async () => {
         if (running) return;
         running = true;
         setIsRefreshing(true);
         try {
            const tab = activeTabRef.current;
            const tasks: Promise<void>[] = [];
            if (['dashboard', 'messages'].includes(tab))  { tasks.push(fetchMessages()); tasks.push(fetchConsumers()); }
            if (['dashboard', 'claims'].includes(tab))     tasks.push(fetchClaims());
            if (['dashboard', 'warranties'].includes(tab)) tasks.push(fetchWarranties());
            if (['dashboard', 'services'].includes(tab))   tasks.push(fetchServices());
            if (['dashboard', 'budgets'].includes(tab))    tasks.push(fetchBudgets());
            if (tab === 'promos')           tasks.push(fetchPromos());
            if (tab === 'lending')          tasks.push(fetchLendingRecords());
            if (tab === 'assets')           tasks.push(fetchAssets());
            if (tab === 'events')           tasks.push(fetchEvents());
            if (tab === 'eventregistrations') tasks.push(fetchEventRegistrations());
            if (tab === 'konsumen')         tasks.push(fetchConsumers());
            if (tab === 'userrole')         tasks.push(fetchKaryawans());
            if (tab === 'botsettings' || tab === 'messages') tasks.push(fetchBotSettings());
            if (tab === 'autocomplete')     tasks.push(fetchAutocomplete());
            if (tab === 'affiliate')        tasks.push(fetchAffiliates());
            if (tasks.length > 0) await Promise.all(tasks);
            setLastRefreshed(new Date());
         } finally {
            running = false;
            setIsRefreshing(false);
         }
      };
      const id = setInterval(poll, 30_000);
      return () => clearInterval(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isLoggedIn, dateRange]);

   // Polling cepat 5 detik khusus saat tab messages aktif
   // (realtime WebSocket kadang tidak aktif tergantung konfigurasi Supabase)
   useEffect(() => {
      if (!isLoggedIn) return;
      const id = setInterval(() => {
         if (activeTabRef.current === 'messages') {
            fetchMessages();
         }
      }, 5_000);
      return () => clearInterval(id);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isLoggedIn]);

   // Cek validity session setiap 90 detik — auto-logout jika cookie kadaluarsa
   // Ini menangani kasus user tetap di halaman melebihi 2 hari tanpa refresh
   useEffect(() => {
      if (!isLoggedIn) return;
      const id = setInterval(async () => {
         try {
            const res = await fetch('/api/admin/auth', { cache: 'no-store' });
            if (!res.ok) {
               localStorage.removeItem('nikon_karyawan');
               setIsLoggedIn(false);
               setCurrentUser(null);
            }
         } catch { /* network error — pertahankan sesi */ }
      }, 90_000);
      return () => clearInterval(id);
   }, [isLoggedIn]);

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleDownloadPDF = () => {
      if (!printData) return;
      const originalTitle = document.title;
      document.title = `${printData.proposal_no}-${printData.title}`;
      setPrintDownloading(true);
      setTimeout(() => {
         window.print();
         setTimeout(() => {
            setPrintDownloading(false);
            setPrintData(null);
            document.title = originalTitle;
         }, 600);
      }, 150);
   };

   const getText = (key: string, vars: Record<string, string | number>): string => {
      const tmpl = chatbotTemplates[key] ?? DEFAULT_TEMPLATES[key]?.template ?? '';
      return applyTemplate(tmpl, vars);
   };

   const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   };

   useEffect(() => {
      if (selectedWa) setTimeout(() => { scrollToBottom(); }, 300);
   }, [selectedWa]);

   // Saat kontak dipilih di tab pesan: tarik semua history percakapan kontak tersebut
   // tanpa batasan tanggal, agar pesan lama juga tampil di jendela chat
   useEffect(() => {
      if (selectedWa && activeTabRef.current === 'messages') {
         fetchContactHistory(selectedWa);
      }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [selectedWa]);

   // --- LOGIN & LUPA PASSWORD LOGIC ---
   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      try {
         const res = await fetch('/api/auth/karyawan-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
         });
         const json = await res.json();
         if (res.ok && json.karyawan) {
            setCurrentUser(json.karyawan);
            setLoading(true); // tampilkan spinner segera, cegah flash dashboard kosong sebelum data ter-load
            setIsLoggedIn(true);
            localStorage.setItem('nikon_karyawan', JSON.stringify(json.karyawan));
         } else {
            setLoginError(json.error || 'Username atau Password salah!');
         }
      } catch {
         setLoginError('Terjadi kesalahan, coba lagi.');
      }
   };

   const handleForgotPwSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setForgotPwMessage('');
      setIsSubmitting(true);
      try {
         const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nomor_wa: forgotPwUsername }),
         });
         if (res.ok) {
            setForgotPwMessage('Jika nomor terdaftar, password baru telah dikirim ke WhatsApp Anda!');
         } else {
            const j = await res.json();
            setForgotPwMessage(j.error || 'Gagal memproses reset password.');
         }
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         setForgotPwMessage('Gagal memproses reset password: ' + message);
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleChangePassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setChangePwError('');
      setChangePwSuccess('');
      if (changePwForm.newPw !== changePwForm.confirm) return setChangePwError('Password baru tidak cocok!');
      if (changePwForm.newPw.length < 6) return setChangePwError('Password baru minimal 6 karakter!');
      try {
         const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               id_karyawan: currentUser?.id_karyawan,
               currentPassword: changePwForm.current,
               newPassword: changePwForm.newPw,
            }),
         });
         const json = await res.json();
         if (!res.ok) return setChangePwError(json.error || 'Gagal mengubah password.');
         // Jangan simpan password hash di localStorage
         const updated = { ...currentUser } as Karyawan;
         localStorage.setItem('nikon_karyawan', JSON.stringify(updated));
         setCurrentUser(updated);
         setChangePwSuccess('Password berhasil diubah!');
         setChangePwForm({ current: '', newPw: '', confirm: '' });
         setTimeout(() => { setIsChangePwOpen(false); setChangePwSuccess(''); }, 1800);
      } catch {
         setChangePwError('Gagal mengubah password. Coba lagi.');
      }
   };

   const handleLogout = () => {
      localStorage.removeItem('nikon_karyawan');
      setIsLoggedIn(false);
      setCurrentUser(null);
      setLoading(false); // pastikan spinner tidak tertinggal saat session expired
   };


   // --- EXPORT CSV LOGIC ---
   const handleExportCSVClaim = () => {
      // Hanya keluarkan data yang statusnya belum selesai (bukan Hijau) dan bukan Tidak Valid (Merah)
      const unfinishedClaims = claims.filter(c => {
         const color = getClaimStatusColor(c);
         return color !== 'Teal' && color !== 'Hijau' && color !== 'Merah';
      });

      const headers = ['id_claim', 'nomor_wa', 'nomor_seri', 'tipe_barang', 'tanggal_pembelian', 'link_nota_pembelian', 'link_kartu_garansi', 'validasi_by_mkt', 'validasi_by_fa', 'catatan_by_mkt', 'catatan_by_fa', 'nama_toko', 'nama_jasa_pengiriman', 'nomor_resi'];
      const csvRows = [headers.join(',')];
      
      unfinishedClaims.forEach(c => {
         const row = [
            `"${(c.id_claim || '').replace(/"/g, '""')}"`,
            `"${(c.nomor_wa || '').replace(/"/g, '""')}"`,
            `"${(c.nomor_seri || '').replace(/"/g, '""')}"`,
            `"${(c.tipe_barang || '').replace(/"/g, '""')}"`,
            `"${(c.tanggal_pembelian || '').replace(/"/g, '""')}"`,
            `"${(typeof c.link_nota_pembelian === 'string' ? c.link_nota_pembelian : '').replace(/"/g, '""')}"`,
            `"${(typeof c.link_kartu_garansi === 'string' ? c.link_kartu_garansi : '').replace(/"/g, '""')}"`,
            `"${(c.validasi_by_mkt || '').replace(/"/g, '""')}"`,
            `"${(c.validasi_by_fa || '').replace(/"/g, '""')}"`,
            `"${(c.catatan_mkt || '').replace(/"/g, '""')}"`,
            `"${(c.catatan_fa || '').replace(/"/g, '""')}"`,
            `"${(c.nama_toko || '').replace(/"/g, '""')}"`,
            `"${(c.nama_jasa_pengiriman || '').replace(/"/g, '""')}"`,
            `"${(c.nomor_resi || '').replace(/"/g, '""')}"`
         ];
         csvRows.push(row.join(','));
      });
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Export_Claim_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
   };

   const handleTandaTerimaCSV = () => {
      if (selectedClaimIds.size === 0) {
         alert('Pilih minimal 1 baris terlebih dahulu.');
         return;
      }
      const selected = sortedClaims.filter((c: ClaimPromo) => c.id_claim && selectedClaimIds.has(c.id_claim));
      const tglFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/ /g, '-');

      const rows = selected.map((c: ClaimPromo, idx: number) => {
         const konsumen = consumersList.find(k => k.nomor_wa === c.nomor_wa);
         const nama = c.nama_pendaftar || konsumen?.nama_lengkap || consumers[c.nomor_wa] || c.nomor_wa;
         const noClaimNum = claimNumberMap.get(c.id_claim!) ?? '';
         // Format: "207. Arifah Hariadi (6285743219900)"
         const namaWa = `${noClaimNum ? noClaimNum + '. ' : ''}${nama} (${c.nomor_wa})`;

         // Gunakan alamat pengiriman dari claim (diisi konsumen saat submit form)
         const clean = (v: string | null | undefined) => (!v || v === 'BELUM_DIISI') ? '' : v;
         const parts: string[] = [];
         if (clean(c.alamat_pengiriman)) parts.push(clean(c.alamat_pengiriman).toUpperCase());
         if (clean(c.kelurahan_pengiriman)) parts.push(`KEL. ${clean(c.kelurahan_pengiriman).toUpperCase()}`);
         if (clean(c.kecamatan_pengiriman)) parts.push(`KEC. ${clean(c.kecamatan_pengiriman).toUpperCase()}`);
         if (clean(c.kabupaten_pengiriman)) parts.push(`KAB/KOTA. ${clean(c.kabupaten_pengiriman).toUpperCase()}`);
         if (clean(c.provinsi_pengiriman)) parts.push(`PROV. ${clean(c.provinsi_pengiriman).toUpperCase()}`);
         const kodepos = clean(c.kodepos_pengiriman);
         const alamat = parts.join(', ') || '-';
         const promo = c.jenis_promosi || getNamaPromo(c.tipe_barang) || '-';

         return `<tr>
           <td style="text-align:center">${idx + 1}</td>
           <td>${namaWa}</td>
           <td>${alamat}</td>
           <td style="mso-number-format:'@'">${c.nomor_seri || '-'}</td>
           <td>${c.tipe_barang || '-'}</td>
           <td>${promo}</td>
           <td style="mso-number-format:'@';text-align:center">${kodepos || '-'}</td>
           <td style="text-align:center">${noClaimNum}</td>
         </tr>`;
      }).join('');

      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Tanda Terima</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
<body>
<table>
  <tr><td><b>TANDA TERIMA</b></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td>${tglFormatted}</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <thead><tr>
    <th>No</th>
    <th>Nama (No. WA)</th>
    <th>Alamat</th>
    <th>No. Seri</th>
    <th>Barang</th>
    <th>Promo</th>
    <th>Kodepos</th>
    <th>No Claim</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;

      const BOM = '﻿';
      const blob = new Blob([BOM + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Tanda_Terima_${new Date().toISOString().split('T')[0]}.xls`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
   };

   const handleUploadResiCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
         const text = (ev.target?.result as string).replace(/^﻿/, '');
         const rows = text.split(/\r?\n/).filter(r => r.trim());
         if (rows.length < 2) { alert('CSV tidak valid atau kosong.'); return; }

         const parseRow = (row: string): string[] => {
            const result: string[] = [];
            let inQuote = false, cur = '';
            for (let i = 0; i < row.length; i++) {
               const ch = row[i];
               if (ch === '"') {
                  if (inQuote && row[i + 1] === '"') { cur += '"'; i++; }
                  else { inQuote = !inQuote; }
               } else if (ch === ',' && !inQuote) { result.push(cur); cur = ''; }
               else { cur += ch; }
            }
            result.push(cur);
            return result;
         };

         const headerRow = parseRow(rows[0]);
         const colIdx = (name: string) => headerRow.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
         const idIdx = colIdx('id_claim');
         const namaIdx = colIdx('nama (no. wa)');
         const seriIdx = colIdx('no. seri');
         const expedisiIdx = colIdx('nama expedisi');
         const resiIdx = colIdx('nomor resi');

         if (idIdx === -1 || expedisiIdx === -1 || resiIdx === -1) {
            alert('Format CSV tidak valid. Pastikan menggunakan file hasil ekspor "Tanda Terima CSV".');
            return;
         }

         const preview: Array<{ id_claim: string; no_seri: string; nama: string; expedisi: string; nomor_resi: string }> = [];
         for (let i = 1; i < rows.length; i++) {
            const cols = parseRow(rows[i]);
            const id = cols[idIdx]?.trim();
            const expedisi = cols[expedisiIdx]?.trim() || '';
            const resi = cols[resiIdx]?.trim() || '';
            if (!id || (!expedisi && !resi)) continue;
            preview.push({
               id_claim: id,
               no_seri: cols[seriIdx]?.trim() || '',
               nama: cols[namaIdx]?.trim() || '',
               expedisi,
               nomor_resi: resi,
            });
         }

         if (preview.length === 0) {
            alert('Tidak ada baris dengan Nama Expedisi atau Nomor Resi yang terisi.');
            return;
         }
         setResiUploadPreview(preview);
      };
      reader.readAsText(file, 'UTF-8');
      e.target.value = '';
   };

   const handleConfirmUploadResi = async () => {
      if (!resiUploadPreview || resiUploadPreview.length === 0) return;
      let successCount = 0;
      let errorCount = 0;
      for (const row of resiUploadPreview) {
         const { error } = await sbWrite({
            action: 'update',
            table: 'claim_promo',
            data: { nama_jasa_pengiriman: row.expedisi, nomor_resi: row.nomor_resi },
            match: { id_claim: row.id_claim },
         });
         if (error) errorCount++;
         else successCount++;
      }
      setResiUploadPreview(null);
      fetchClaims();
      alert(`Berhasil update ${successCount} claim${errorCount > 0 ? `, ${errorCount} gagal` : ''}.`);
   };

   const handlePrintPeminjamanPDF = (l: PeminjamanBarang) => {
      const tglPinjam = l.tanggal_peminjaman
         ? new Date(l.tanggal_peminjaman).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
         : new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
      const tglEstimasi = l.tanggal_estimasi_pengembalian
         ? new Date(l.tanggal_estimasi_pengembalian).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
         : '-';
      const kode = l.kode_peminjaman || '';
      const perimbaURL = kode ? `${window.location.origin}/penerima?kode=${kode}` : '';
      const qrSrc = kode
         ? `https://chart.googleapis.com/chart?cht=qr&chs=160x160&chl=${encodeURIComponent(perimbaURL)}&choe=UTF-8`
         : '';
      const itemsHtml = l.items_dipinjam.map((item, idx) => {
         const accs = [item.accs1, item.accs2, item.accs3, item.accs4, item.accs5, item.accs6, item.accs7]
            .filter(Boolean).join('<br>');
         return `<tr>
            <td style="text-align:center">${idx + 1}</td>
            <td>${item.nama_barang}</td>
            <td style="font-family:monospace">${item.nomor_seri}</td>
            <td>${accs || '-'}</td>
            <td>${item.catatan || '-'}</td>
         </tr>`;
      }).join('');
      const noTandaTerima = `PT/${new Date().getFullYear()}/${String(l.id_peminjaman || '').slice(-6).toUpperCase() || '------'}`;
      const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<title>Tanda Terima Peminjaman - ${l.nama_peminjam}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; padding: 24px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
  .company h1 { font-size: 16pt; font-weight: bold; }
  .company p { font-size: 9pt; color: #444; margin-top: 2px; }
  .doc-info { text-align: right; font-size: 9pt; }
  .doc-info .no { font-size: 12pt; font-weight: bold; }
  h2 { text-align: center; font-size: 13pt; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase; }
  .info-table { width: 100%; margin-bottom: 16px; }
  .info-table td { padding: 3px 6px; font-size: 10pt; }
  .info-table td:first-child { width: 130px; font-weight: bold; }
  table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  table.items th { background: #f0f0f0; border: 1px solid #999; padding: 6px 8px; font-size: 10pt; text-align: left; }
  table.items td { border: 1px solid #999; padding: 5px 8px; font-size: 10pt; vertical-align: top; }
  .notes { border: 1px solid #ccc; padding: 10px 14px; border-radius: 4px; font-size: 9.5pt; margin-bottom: 20px; }
  .sign-area { display: flex; justify-content: space-between; margin-top: 30px; }
  .sign-box { text-align: center; width: 200px; }
  .sign-box .label { font-size: 10pt; margin-bottom: 70px; }
  .sign-box .line { border-top: 1px solid #000; padding-top: 4px; font-size: 10pt; }
  .qr-section { display:flex; align-items:center; gap:16px; border:1px solid #ddd; border-radius:6px; padding:10px 14px; margin-bottom:20px; background:#fafafa; }
  .qr-section .kode-besar { font-family:monospace; font-size:28pt; font-weight:bold; letter-spacing:6px; color:#111; }
  .qr-section .kode-label { font-size:8.5pt; color:#555; margin-top:3px; }
  @media print { body { padding: 12px; } button { display:none; } }
</style>
</head><body>
<div class="header">
  <div class="company">
    <h1>Alta Nikindo</h1>
    <p>Komp. Mangga Dua Square Blok H No.1-2, Jakarta - 14430</p>
    <p>WhatsApp: 08111877781</p>
  </div>
  <div class="doc-info">
    <div class="no">${noTandaTerima}</div>
    <div>Tanggal: ${tglPinjam}</div>
  </div>
</div>
<h2>Tanda Terima Peminjaman Barang</h2>
<table class="info-table">
  <tr><td>Nama Peminjam</td><td>: ${l.nama_peminjam}</td></tr>
  <tr><td>No. WhatsApp</td><td>: ${l.nomor_wa_peminjam}</td></tr>
  <tr><td>Tanggal Pinjam</td><td>: ${tglPinjam}</td></tr>
  <tr><td>Estimasi Kembali</td><td>: ${tglEstimasi}</td></tr>
</table>
${kode ? `
<div class="qr-section">
  <img src="${qrSrc}" alt="QR Kode Peminjaman" width="160" height="160" style="flex-shrink:0" />
  <div>
    <div class="kode-besar">${kode}</div>
    <div class="kode-label">Kode Peminjaman — scan QR atau ketik kode ini di halaman penerima barang</div>
  </div>
</div>
` : ''}
<table class="items">
  <thead><tr>
    <th style="width:36px;text-align:center">No</th>
    <th style="width:220px">Nama Barang</th>
    <th style="width:130px">No. Seri</th>
    <th>Accessories</th>
    <th style="width:120px">Catatan</th>
  </tr></thead>
  <tbody>${itemsHtml}</tbody>
</table>
<div class="notes">
  <strong>Catatan:</strong><br>
  • Barang dipinjam dalam kondisi baik dan harus dikembalikan sesuai kondisi semula.<br>
  • Kehilangan atau kerusakan menjadi tanggung jawab peminjam.<br>
  • Pengembalian paling lambat: <strong>${tglEstimasi}</strong>
</div>
<div class="sign-area">
  <div class="sign-box"><div class="label">Peminjam,</div><div class="line">${l.nama_peminjam}</div></div>
  <div class="sign-box"><div class="label">Petugas Alta Nikindo,</div><div class="line">( ________________ )</div></div>
</div>
<br><br>
<div style="text-align:center">
  <button onclick="window.print()" style="padding:8px 24px;background:#FFE500;border:none;border-radius:6px;font-weight:bold;cursor:pointer;font-size:11pt">🖨️ Print / Simpan PDF</button>
</div>
</body></html>`;
      const w = window.open('', '_blank', 'width=900,height=700');
      if (w) { w.document.write(html); w.document.close(); }
   };

   // --- CSV CENTRAL TEMPLATE & IMPORT LOGIC ---
   const downloadTemplate = () => {
      const templates = {
         claim_promo: ['id_claim', 'nomor_wa', 'nomor_seri', 'tipe_barang', 'tanggal_pembelian', 'link_nota_pembelian', 'link_kartu_garansi', 'validasi_by_mkt', 'validasi_by_fa', 'catatan_by_mkt', 'catatan_by_fa', 'nama_toko', 'nama_jasa_pengiriman', 'nomor_resi'],
         garansi: ['id_garansi', 'nomor_seri', 'tipe_barang', 'status_validasi', 'jenis_garansi', 'lama_garansi', 'link_kartu_garansi', 'link_nota_pembelian'],
         konsumen: ['nomor_wa', 'nama_lengkap', 'nik', 'alamat_rumah', 'kelurahan', 'kecamatan', 'kabupaten_kotamadya', 'provinsi', 'kodepos'],
         status_service: ['id_service', 'nomor_tanda_terima', 'nomor_seri', 'status_service']
      };

      // Tanda opsional untuk panduan saat download
      const headers = templates[importTarget].map(h => h.startsWith('id_') ? `${h} (kosongkan jika data baru)` : h).join(',');

      const blob = new Blob([headers], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `Template_Upload_${importTarget}.csv`);
      a.click();
      window.URL.revokeObjectURL(url);
   };

   const handleCentralUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsSubmitting(true);
      const reader = new FileReader();
      reader.onload = async (event) => {
         try {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/);

            // Membersihkan header dari keterangan tambahan '(kosongkan jika data baru)'
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').split(' ')[0]);

            const result: Record<string, unknown>[] = [];

            for (let i = 1; i < lines.length; i++) {
               if (!lines[i].trim()) continue;
               const obj: Record<string, unknown> = {};
               const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

               headers.forEach((header, j) => {
                  let val: string | null = currentline[j] ? currentline[j].trim().replace(/^"|"$/g, '') : null;
                  if (typeof val === 'string') val = val.replace(/""/g, '"');
                  if (val === "") val = null;

                  // Mapping header kustom ke field database
                  let dbField = header;
                  if (header === 'catatan_by_mkt') dbField = 'catatan_mkt';
                  if (header === 'catatan_by_fa') dbField = 'catatan_fa';
                  
                  obj[dbField] = val;
               });

               // Hapus ID jika null agar Supabase generate UUID baru
               if (!obj.id_claim) delete obj.id_claim;
               if (!obj.id_garansi) delete obj.id_garansi;
               if (!obj.id_service) delete obj.id_service;

               // Data dari file CSV tidak perlu bawa kolom tanggal ini, biar sistem yg generate
               delete obj.created_at;
               delete obj.updated_at;

               result.push(obj);
            }

            const { error } = await sbWrite({ action: 'upsert', table: importTarget, data: result });
            if (error) throw new Error(error.message);

            alert(`Data CSV berhasil di-update ke tabel ${importTarget}!`);
            window.location.reload();
         } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert('Gagal import CSV: Pastikan format sesuai template. Pesan Error: ' + errorMessage);
         } finally {
            setIsSubmitting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
         }
      };
      reader.readAsText(file);
   };

   const generateProposalNo = () => {
      const d = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const ms = String(d.getMilliseconds()).padStart(3, '0');
      return `MKTG/BA${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}${ms}`;
   };

   const openModal = (action: 'create' | 'edit' | 'reset_pw' | 'return', type: 'claim' | 'warranty' | 'promo' | 'service' | 'budget' | 'karyawan' | 'lending' | 'konsumen' | 'botsettings' | 'event' | 'eventregistration' | 'asset', item?: ClaimPromo | Garansi | Promosi | StatusService | BudgetApproval | Karyawan | PeminjamanBarang | KonsumenData | PengaturanBot | EventData | EventRegistration | BarangAset) => {
      setModalAction(action);
      if (type === 'claim') {
         setClaimForm((item as ClaimPromo) || { validasi_by_mkt: 'Dalam Proses Verifikasi', validasi_by_fa: 'Dalam Proses Verifikasi' });
         setEditingId((item as ClaimPromo)?.id_claim || null);
         setKonsumenForm({});
         // Kalau edit dan nama_pendaftar kosong, prefill dari konsumen
         const itemAsClaim = item as ClaimPromo | undefined;
         if (itemAsClaim?.nomor_wa && !itemAsClaim.nama_pendaftar) {
            supabase.from('konsumen').select('nama_lengkap').eq('nomor_wa', itemAsClaim.nomor_wa).maybeSingle().then(({ data: kon }) => {
               if (kon?.nama_lengkap) {
                  setClaimForm(prev => ({ ...prev, nama_pendaftar: kon.nama_lengkap }));
               }
            });
         }
      }
      else if (type === 'warranty') {
         setWarrantyForm((item as Garansi) || { status_validasi: 'Menunggu', jenis_garansi: 'Jasa 30%', lama_garansi: '1 Tahun' });
         setEditingId((item as Garansi)?.id_garansi || null);
      }
      else if (type === 'promo') {
         setPromoForm((item as Promosi) || { status_aktif: true, tipe_produk: [] });
         setEditingId((item as Promosi)?.id_promo || null);
      }
      else if (type === 'service') {
         setServiceForm((item as StatusService) || {});
         setEditingId((item as StatusService)?.id_service || null);
      }
      else if (type === 'budget') {
         setBudgetForm((item as BudgetApproval) || { proposal_no: generateProposalNo(), total_cost: 0, items: [], drafter_name: currentUser?.nama_karyawan, budget_source: 'Marketing Budget', attachment_urls: [null, null, null] });
         setEditingId((item as BudgetApproval)?.id_budget || null);
      }
      else if (type === 'lending') {
         setLendingForm(item ? { ...(item as PeminjamanBarang), items_dipinjam: (item as PeminjamanBarang).items_dipinjam || [] } : { items_dipinjam: [{ nama_barang: '', nomor_seri: '', catatan: '', catatan_pengembalian: '', status_pengembalian: 'dipinjam' }], status_peminjaman: 'aktif' });
         setEditingId((item as PeminjamanBarang)?.id_peminjaman || null);
         // Pre-populate aksesori yang sudah dikembalikan sebelumnya
         if (action === 'return' && item) {
            const initialAccsChecked: Record<number, Record<string, boolean>> = {};
            ((item as PeminjamanBarang).items_dipinjam || []).forEach((pi, idx) => {
               if (pi.status_pengembalian !== 'dikembalikan') return;
               const allAccs = [pi.accs1,pi.accs2,pi.accs3,pi.accs4,pi.accs5,pi.accs6,pi.accs7].filter(Boolean) as string[];
               if (!allAccs.length) return;
               initialAccsChecked[idx] = {};
               if (pi.accs_returned && pi.accs_returned.length > 0) {
                  // Gunakan field accs_returned jika tersedia
                  allAccs.forEach(a => { initialAccsChecked[idx][a] = pi.accs_returned!.includes(a); });
               } else {
                  // Fallback: parse catatan_pengembalian untuk "Aksesori belum dicentang: X, Y"
                  const uncheckedMatch = (pi.catatan_pengembalian || '').match(/Aksesori belum dicentang:\s*([^|]+)/);
                  const uncheckedAccs = uncheckedMatch ? uncheckedMatch[1].split(', ').map(s => s.trim()) : [];
                  allAccs.forEach(a => { initialAccsChecked[idx][a] = !uncheckedAccs.includes(a); });
               }
            });
            setAccsReturnChecked(initialAccsChecked);
         } else {
            setAccsReturnChecked({});
         }
      }
      else if (type === 'botsettings') {
         setBotSettingsForm((item as PengaturanBot) || {});
         setEditingId((item as PengaturanBot)?.id ? String((item as PengaturanBot).id) : null);
      }
      else if (type === 'konsumen') {
         setKonsumenForm((item as KonsumenData) || { status_langkah: 'START', nik: 'BELUM_DIISI', alamat_rumah: 'BELUM_DIISI', kelurahan: 'BELUM_DIISI', kecamatan: 'BELUM_DIISI', kabupaten_kotamadya: 'BELUM_DIISI', provinsi: 'BELUM_DIISI', kodepos: 'BELUM_DIISI' });
         setEditingId((item as KonsumenData)?.nomor_wa || null);
      }
      else if (type === 'karyawan') {
         if (action === 'reset_pw') {
            setKaryawanForm(item ? {
               id_karyawan: (item as Karyawan).id_karyawan,
               username: (item as Karyawan).username,
               nama_karyawan: (item as Karyawan).nama_karyawan,
               nomor_wa: (item as Karyawan).nomor_wa,
               password: ''
            } : {});
         } else {
            setKaryawanForm((item as Karyawan) || { role: 'Karyawan', status_aktif: true, akses_halaman: ['messages'] });
         }
         setEditingId((item as Karyawan)?.id_karyawan || null);
      }
      else if (type === 'event') {
         setEventForm((item as EventData) || { status: 'aktif', stock: 0 });
         setEditingId((item as EventData)?.id || null);
         setEventImageFile(null);
      }
      else if (type === 'eventregistration') {
         setRegistrationForm((item as EventRegistration) || { status: 'Pending Payment' });
         setEditingId((item as EventRegistration)?.id || null);
      }
      else if (type === 'asset') {
         setAssetForm((item as BarangAset) || {});
         setEditingId((item as BarangAset)?.id || null);
      }
      setIsModalOpen(true);
   };

   const openValidasiModal = (c: ClaimPromo) => {
      setValidasiMode(true);
      openModal('edit', 'claim', c);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setValidasiMode(false);
      setClaimForm({});
      setWarrantyForm({});
      setPromoForm({ tipe_produk: [] });
      setServiceForm({});
      setBudgetForm({ items: [] });
      setKonsumenForm({});
      setKaryawanForm({});
      setLendingForm({ items_dipinjam: [], status_peminjaman: 'aktif' });
      setShowContactPicker(false);
      setShowAddContactForm(false);
      setAddContactForm({ nama: '', nomor_wa: '' });
      setAddContactError('');
      setContactPickerSearch('');
      setBotSettingsForm({});
      setAssetForm({});
      setEventForm({ status: 'aktif', stock: 0 });
      setRegistrationForm({ status: 'Pending Payment' });
      setEventImageFile(null);
      setBudgetEventImageFile(null);
      setEditingId(null);
      setLendingFotoPenerimaanFiles([]);
      setLendingFotoPengembalianFiles([]);
      if (returnTab) {
         setActiveTab(returnTab);
         setReturnTab(null);
      }
   };

   // --- CRUD HANDLERS ---
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveKonsumen = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'konsumen', data: konsumenForm });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'konsumen', data: konsumenForm, match: { nomor_wa: editingId } });
            if (error) throw new Error(error.message);
         }
         fetchConsumers();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal simpan konsumen: ' + message);
      } finally {
         setIsSubmitting(false);
      }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveClaim = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         // 0. UPSERT konsumen dulu (claim_promo.nomor_wa FK ke konsumen)
         if (claimForm.nomor_wa) {
            const konsumenPayload: Record<string, unknown> = {
               nomor_wa: claimForm.nomor_wa,
               // dari claimForm
               nama_lengkap: claimForm.nama_pendaftar || konsumenForm.nama_lengkap || 'Konsumen',
               status_langkah: konsumenForm.status_langkah || 'START',
            };
            // Field opsional dari konsumenForm
            // Cek apakah konsumen sudah ada
            const { data: existKon } = await supabase.from('konsumen').select('nomor_wa, id_konsumen').eq('nomor_wa', claimForm.nomor_wa).maybeSingle();
            if (existKon) {
               // Update field non-null saja (jangan timpa data yang sudah ada dgn null)
               const updatePayload: Record<string, unknown> = {};
               Object.entries(konsumenPayload).forEach(([k, v]) => {
                  if (v && k !== 'nomor_wa') updatePayload[k] = v;
               });
               if (Object.keys(updatePayload).length > 0) {
                  await sbWrite({ action: 'update', table: 'konsumen', data: updatePayload, match: { nomor_wa: claimForm.nomor_wa } });
               }
            } else {
               // Buat konsumen baru — generate id_konsumen
               const newID = `AN${Math.floor(100000 + Math.random() * 900000)}`;
               // Fill BELUM_DIISI untuk yang kosong (FK constraint)
               const fullPayload: Record<string, unknown> = {
                  ...konsumenPayload,
                  id_konsumen: newID,
                  nik: konsumenPayload.nik || 'BELUM_DIISI',
                  alamat_rumah: konsumenPayload.alamat_rumah || 'BELUM_DIISI',
                  kelurahan: konsumenPayload.kelurahan || 'BELUM_DIISI',
                  kecamatan: konsumenPayload.kecamatan || 'BELUM_DIISI',
                  kabupaten_kotamadya: konsumenPayload.kabupaten_kotamadya || 'BELUM_DIISI',
                  provinsi: konsumenPayload.provinsi || 'BELUM_DIISI',
                  kodepos: konsumenPayload.kodepos || 'BELUM_DIISI',
               };
               await sbWrite({ action: 'insert', table: 'konsumen', data: fullPayload });
            }
         }

         // 1. Ambil data asli sebelum diupdate untuk cek file yang perlu dihapus
         let original: Partial<ClaimPromo> | null = null;
         if (modalAction === 'edit' && editingId) {
            const { data } = await supabase.from('claim_promo').select('link_kartu_garansi, link_nota_pembelian').eq('id_claim', editingId).single();
            original = data;
         }

         let notaUrl = claimForm.link_nota_pembelian;
         let garansiUrl = claimForm.link_kartu_garansi;

         // 2. Upload file baru jika ada (tipe File)
         if (claimForm.link_nota_pembelian instanceof File) {
            notaUrl = await uploadFileToStorage(claimForm.link_nota_pembelian, 'NotaDashboard', claimForm.nomor_seri || 'UNKN');
            if (original?.link_nota_pembelian) await deleteFileFromStorage(original.link_nota_pembelian as string);
         } else if (claimForm.link_nota_pembelian === null && original?.link_nota_pembelian) {
            await deleteFileFromStorage(original.link_nota_pembelian as string);
         }

         if (claimForm.link_kartu_garansi instanceof File) {
            garansiUrl = await uploadFileToStorage(claimForm.link_kartu_garansi, 'GaransiDashboard', claimForm.nomor_seri || 'UNKN');
            if (original?.link_kartu_garansi) await deleteFileFromStorage(original.link_kartu_garansi as string);
         } else if (claimForm.link_kartu_garansi === null && original?.link_kartu_garansi) {
            await deleteFileFromStorage(original.link_kartu_garansi as string);
         }

         // Hapus field immutable (PK & timestamp) dari payload
         const { id_claim: _id, created_at: _ca, ...claimFields } = claimForm as ClaimPromo & { id_claim?: string; created_at?: string };

         const dataToSave = {
            ...claimFields,
            nama_toko: claimForm.nama_toko || '',
            jenis_promosi: claimForm.jenis_promosi || '',
            nama_jasa_pengiriman: claimForm.nama_jasa_pengiriman || '',
            nomor_resi: claimForm.nomor_resi || '',
            catatan_mkt: claimForm.catatan_mkt || '',
            catatan_fa: claimForm.catatan_fa || '',
            link_kartu_garansi: garansiUrl ?? '',
            link_nota_pembelian: notaUrl ?? '',
            nama_penerima_claim: claimForm.nama_pendaftar || '',
            nomor_wa_update: claimForm.nomor_wa_update || claimForm.nomor_wa || '',
         };

         if (modalAction === 'create') {
            // Gunakan dedicated route (bypass generic proxy) untuk menghindari HTTP 500
            const insertRes = await fetch('/api/admin/claim-update', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ ...dataToSave, created_at: new Date().toISOString() }),
            });
            if (!insertRes.ok) {
               const err = await insertRes.json().catch(() => ({ error: `HTTP ${insertRes.status}` }));
               throw new Error(err.error || JSON.stringify(err));
            }
         } else {
            // Gunakan dedicated route (bypass generic proxy) untuk menghindari HTTP 500
            const updateRes = await fetch('/api/admin/claim-update', {
               method: 'PATCH',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ _id_claim: editingId, ...dataToSave }),
            });
            if (!updateRes.ok) {
               const err = await updateRes.json().catch(() => ({ error: `HTTP ${updateRes.status}` }));
               throw new Error(err.error || JSON.stringify(err));
            }
         }

         if (dataToSave.validasi_by_mkt === 'Valid' && dataToSave.nomor_seri) {
            await sbWrite({ action: 'update', table: 'garansi', data: { status_validasi: 'Valid' }, match: { nomor_seri: dataToSave.nomor_seri } });
            fetchWarranties();
         }

         fetchClaims();
         fetchConsumers(); // refresh konsumen list karena claim form bisa upsert konsumen
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message);
      } finally {
         setIsSubmitting(false);
      }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveWarranty = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         let original: Partial<Garansi> | null = null;
         if (modalAction === 'edit' && editingId) {
            const { data } = await supabase.from('garansi').select('link_kartu_garansi, link_nota_pembelian').eq('id_garansi', editingId).single();
            original = data;
         }

         let notaUrl = warrantyForm.link_nota_pembelian;
         let garansiUrl = warrantyForm.link_kartu_garansi;

         if (warrantyForm.link_nota_pembelian instanceof File) {
            notaUrl = await uploadFileToStorage(warrantyForm.link_nota_pembelian, 'NotaDashboard', warrantyForm.nomor_seri || 'UNKN');
            if (original?.link_nota_pembelian) await deleteFileFromStorage(original.link_nota_pembelian as string);
         } else if (warrantyForm.link_nota_pembelian === null && original?.link_nota_pembelian) {
            await deleteFileFromStorage(original.link_nota_pembelian as string);
         }

         if (warrantyForm.link_kartu_garansi instanceof File) {
            garansiUrl = await uploadFileToStorage(warrantyForm.link_kartu_garansi, 'GaransiDashboard', warrantyForm.nomor_seri || 'UNKN');
            if (original?.link_kartu_garansi) await deleteFileFromStorage(original.link_kartu_garansi as string);
         } else if (warrantyForm.link_kartu_garansi === null && original?.link_kartu_garansi) {
            await deleteFileFromStorage(original.link_kartu_garansi as string);
         }

         const dataToSave = {
            ...warrantyForm,
            link_kartu_garansi: garansiUrl,
            link_nota_pembelian: notaUrl,
         };

         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'garansi', data: dataToSave });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'garansi', data: dataToSave, match: { id_garansi: editingId } });
            if (error) throw new Error(error.message);
         }

         fetchWarranties(); closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSavePromo = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'promosi', data: promoForm });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'promosi', data: promoForm, match: { id_promo: editingId } });
            if (error) throw new Error(error.message);
         }
         fetchPromos();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message); }
      finally { setIsSubmitting(false); }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveService = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'status_service', data: serviceForm });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'status_service', data: serviceForm, match: { id_service: editingId } });
            if (error) throw new Error(error.message);
         }
         fetchServices();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message); }
      finally { setIsSubmitting(false); }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveBudget = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         if (modalAction === 'create' && !budgetForm.proposal_no) {
            budgetForm.proposal_no = generateProposalNo();
         }
         const { data: original } = await supabase.from('budget_approval').select('attachment_urls').eq('id_budget', editingId).single();
         const finalUrls = [...(budgetForm.attachment_urls || [])];

         for (let i = 0; i < finalUrls.length; i++) {
            const item = finalUrls[i];
            if (item instanceof File) {
               const uploadedUrl = await uploadFileToStorage(item, 'BudgetApproval', budgetForm.proposal_no || 'UNKN');
               if (original?.attachment_urls?.[i]) await deleteFileFromStorage(original.attachment_urls[i] as string);
               finalUrls[i] = uploadedUrl;
            } else if (item === null && original?.attachment_urls?.[i]) {
               await deleteFileFromStorage(original.attachment_urls[i] as string);
            }
         }

         // Upload poster event jika ada file baru
         let finalEventImage = budgetForm.event_image || '';
         if (budgetEventImageFile) {
            finalEventImage = await uploadFileToStorage(budgetEventImageFile, 'EventPoster', String(budgetForm.title || 'poster').replace(/\s+/g, '_'));
         }

         // event_time tidak ada di kolom budget_approval — hanya dipakai saat sync ke tabel events
         const { event_time: _evTime, ...budgetFormRest } = budgetForm;
         const dataToSave = { ...budgetFormRest, attachment_urls: finalUrls, event_image: finalEventImage };

         if (modalAction === 'create') {
            // 1. Simpan proposal
            const { data: newBudgets, error } = await sbWrite<{ id_budget: string }>({
               action: 'insert', table: 'budget_approval', data: dataToSave, select: 'id_budget'
            });
            if (error) throw new Error(error.message);
            const newBudgetId = newBudgets?.[0]?.id_budget;

            // 2. Auto-buat Daftar Event
            const eventPayload = {
               event_title: budgetForm.title,
               event_date: budgetForm.event_date || '',
               event_time: budgetForm.event_time || null,
               event_location: budgetForm.event_location || null,
               event_image: finalEventImage,
               event_price: '0',
               event_partisipant_stock: 0,
               event_status: 'close',
               event_description: budgetForm.objectives || '',
               event_payment_tipe: 'regular',
               wa_group_link: budgetForm.wa_group_link || null,
            };
            const { data: newEvents, error: evErr } = await sbWrite<{ id: string }>({
               action: 'insert', table: 'events', data: eventPayload, select: 'id'
            });
            if (evErr) throw new Error(evErr.message);
            const newEventId = newEvents?.[0]?.id;

            // 3. Auto-buat Report Event
            if (newEventId) {
               await fetch('/api/event-reports', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     eventId: newEventId,
                     report: { title: budgetForm.title, event_date: budgetForm.event_date, event_image: finalEventImage }
                  })
               });
               // 4. Simpan linked_event_id di proposal
               if (newBudgetId) {
                  await sbWrite({ action: 'update', table: 'budget_approval', data: { linked_event_id: newEventId }, match: { id_budget: newBudgetId } });
               }
            }
            fetchEvents();
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'budget_approval', data: dataToSave, match: { id_budget: editingId } });
            if (error) throw new Error(error.message);

            // Sync field sinkronisasi ke Daftar Event & Report Event yang terhubung
            const linkedId = budgetForm.linked_event_id;
            if (linkedId) {
               await sbWrite({
                  action: 'update', table: 'events',
                  data: { event_title: budgetForm.title, event_date: budgetForm.event_date || '', event_time: budgetForm.event_time || null, event_location: budgetForm.event_location || null, event_image: finalEventImage, wa_group_link: budgetForm.wa_group_link || null },
                  match: { id: linkedId }
               });
               await fetch('/api/event-reports', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     eventId: linkedId,
                     report: { title: budgetForm.title, event_date: budgetForm.event_date, event_image: finalEventImage }
                  })
               });
               fetchEvents();
            }
         }

         fetchBudgets(); closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   const handleSaveKaryawan = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         const tempPw = Math.random().toString(36).substring(2, 10);
         const passwordToUse = karyawanForm.password || tempPw;

         if (modalAction === 'create') {
            if (!karyawanForm.nomor_wa) throw new Error("Nomor WhatsApp wajib diisi!");
            // Insert tanpa password dulu, lalu set password (di-hash) via API
            const { data: newKaryawanArr, error: insertErr } = await sbWrite<{ id_karyawan: string }>({
               action: 'insert',
               table: 'karyawan',
               data: { ...karyawanForm, password: 'PENDING' },
               select: 'id_karyawan',
            });
            if (insertErr) throw new Error(insertErr.message);
            const newKaryawan = newKaryawanArr?.[0];
            if (!newKaryawan) throw new Error('Gagal mendapat id_karyawan baru');
            // Hash password via dedicated endpoint — API juga kirim WA template otomatis
            await fetch('/api/admin/karyawan/password', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ id_karyawan: newKaryawan.id_karyawan, password: passwordToUse }),
            });
         } else {
            const updateData = { ...karyawanForm };
            const plainPw = updateData.password;
            delete updateData.password; // jangan update password langsung via proxy
            const { error: updErr } = await sbWrite({ action: 'update', table: 'karyawan', data: updateData, match: { id_karyawan: editingId } });
            if (updErr) throw new Error(updErr.message);

            if (plainPw) {
               // API juga kirim WA template otomatis
               await fetch('/api/admin/karyawan/password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id_karyawan: editingId, password: plainPw }),
               });
            }
         }
         fetchKaryawans(); closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   const handleResetPwAdmin = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         if (!karyawanForm.password) throw new Error("Password baru wajib diisi!");
         const resetRes = await fetch('/api/admin/karyawan/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_karyawan: editingId, password: karyawanForm.password }),
         });
         if (!resetRes.ok) throw new Error('Gagal menyimpan password');

         fetchKaryawans(); closeModal();
         setWaPasswordMsg({
            nama: karyawanForm.nama_karyawan || karyawanForm.username || 'Karyawan',
            username: karyawanForm.username || '',
            password: karyawanForm.password,
         });
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   const handleQuickResetPassword = async (k: Karyawan) => {
      if (!k.id_karyawan) return;
      if (!confirm(`Reset password ${k.nama_karyawan} (${k.username})?`)) return;

      setResetPwLoadingId(String(k.id_karyawan));
      try {
         const charset = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
         const bytes = new Uint8Array(10);
         crypto.getRandomValues(bytes);
         const newPassword = Array.from(bytes, b => charset[b % charset.length]).join('');

         const res = await fetch('/api/admin/karyawan/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_karyawan: k.id_karyawan, password: newPassword }),
         });
         const json = await res.json();
         if (!res.ok) throw new Error(json.error || 'Gagal menyimpan password');

         setWaPasswordMsg({
            nama: k.nama_karyawan || k.username || 'Karyawan',
            username: k.username || '',
            password: newPassword,
         });
      } catch (err: unknown) {
         alert('Gagal: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
         setResetPwLoadingId(null);
      }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveLending = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         // Normalisasi nomor WA sebelum semua operasi DB dan pengiriman
         const waNumber = normalizeWaNumber(lendingForm.nomor_wa_peminjam || '');
         if (!waNumber) {
            alert('Nomor WhatsApp tidak valid.');
            setIsSubmitting(false);
            return;
         }

         // 1. Pastikan konsumen ada atau buat baru
         const { error: consumerError } = await supabase.from('konsumen').select('nomor_wa').eq('nomor_wa', waNumber).single();
         if (consumerError && consumerError.code === 'PGRST116') { // Not found
            await sbWrite({ action: 'insert', table: 'konsumen', data: {
               nomor_wa: waNumber,
               nama_lengkap: lendingForm.nama_peminjam!,
               status_langkah: 'START',
               alamat_rumah: 'BELUM_DIISI', kelurahan: 'BELUM_DIISI', kecamatan: 'BELUM_DIISI',
               kabupaten_kotamadya: 'BELUM_DIISI', provinsi: 'BELUM_DIISI', kodepos: 'BELUM_DIISI'
            }});
         } else if (consumerError) {
            throw consumerError;
         }

         // 2. Upload KTP file if exists
         let ktpUrl = lendingForm.link_ktp_peminjam;
         if (lendingForm.link_ktp_peminjam instanceof File) {
            // Upload file baru
            ktpUrl = await uploadFileToStorage(lendingForm.link_ktp_peminjam, 'KTP_Peminjam', waNumber);
            // Hapus file lama jika ada dan ini adalah mode edit
            if (modalAction === 'edit' && editingId) {
               const { data: originalLending } = await supabase.from('peminjaman_barang').select('link_ktp_peminjam').eq('id_peminjaman', editingId).single();
               if (originalLending?.link_ktp_peminjam) await deleteFileFromStorage(originalLending.link_ktp_peminjam as string);
            }
         } else if (modalAction === 'edit' && editingId && lendingForm.link_ktp_peminjam === null) {
            // Jika link_ktp_peminjam diatur null, hapus file lama dari storage
            const { data: originalLending } = await supabase.from('peminjaman_barang').select('link_ktp_peminjam').eq('id_peminjaman', editingId).single();
            if (originalLending?.link_ktp_peminjam) await deleteFileFromStorage(originalLending.link_ktp_peminjam as string);
         }

         // 3. Upload foto penerimaan (max 10)
         let fotoPenerimaanUrls: string[] = Array.isArray(lendingForm.foto_penerimaan) ? (lendingForm.foto_penerimaan as string[]) : [];
         for (const file of lendingFotoPenerimaanFiles) {
            try {
               const url = await uploadFileToStorage(file, 'Lending_Penerimaan', waNumber);
               fotoPenerimaanUrls = [...fotoPenerimaanUrls, url];
            } catch { /* skip failed upload */ }
         }

         const dataToSave: Partial<PeminjamanBarang> = {
            ...lendingForm,
            nomor_wa_peminjam: waNumber,
            link_ktp_peminjam: ktpUrl,
            foto_penerimaan: fotoPenerimaanUrls.length > 0 ? fotoPenerimaanUrls : (lendingForm.foto_penerimaan ?? null),
         };
         if (modalAction === 'create') {
            dataToSave.tanggal_peminjaman = new Date().toISOString();
            dataToSave.status_peminjaman = 'aktif';
            dataToSave.status_pengiriman = 'menunggu';
            // Generate kode_peminjaman unik (coba hingga tidak tabrakan)
            let kode = generateKodePeminjaman();
            for (let attempt = 0; attempt < 5; attempt++) {
               const { data: existing } = await supabase.from('peminjaman_barang').select('id_peminjaman').eq('kode_peminjaman', kode).maybeSingle();
               if (!existing) break;
               kode = generateKodePeminjaman();
            }
            dataToSave.kode_peminjaman = kode;
         }
         // Saat edit, kalau tanggal estimasi diubah, reset reminder_sent_at agar reminder bisa dikirim ulang
         if (modalAction === 'edit' && editingId) {
            const { data: prev } = await supabase.from('peminjaman_barang').select('tanggal_estimasi_pengembalian').eq('id_peminjaman', editingId).single();
            if (prev && prev.tanggal_estimasi_pengembalian !== lendingForm.tanggal_estimasi_pengembalian) {
               dataToSave.reminder_sent_at = null;
            }
         }
         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'peminjaman_barang', data: dataToSave });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'peminjaman_barang', data: dataToSave, match: { id_peminjaman: editingId } });
            if (error) throw new Error(error.message);
         }

         // 3. Generate PDF rincian + kirim Meta template dengan link Drive
         try {
            const docRes = await fetch('/api/admin/generate-lending-doc', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  type: 'pinjam',
                  kodePeminjaman: dataToSave.kode_peminjaman,
                  namaPeminjam: lendingForm.nama_peminjam,
                  nomorWa: waNumber,
                  items: lendingForm.items_dipinjam,
                  tanggalPeminjaman: dataToSave.tanggal_peminjaman,
                  tanggalEstimasi: lendingForm.tanggal_estimasi_pengembalian,
               }),
            });
            if (docRes.ok) {
               const { viewUrl } = await docRes.json();
               const estLabel = lendingForm.tanggal_estimasi_pengembalian
                  ? new Date(lendingForm.tanggal_estimasi_pengembalian).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
                  : '-';
               const itemList = formatLendingItemsForWA(lendingForm.items_dipinjam ?? [], 'pinjam');
               await sendWhatsAppMessage(waNumber, '', {
                  templateName: 'notif_lending_init_v2',
                  bodyParams: [lendingForm.nama_peminjam!, estLabel, itemList, viewUrl],
               });
            }
         } catch (waErr) {
            console.error('[lending] Gagal kirim WA:', waErr);
         }

         // Telegram notif admin — fire-and-forget
         fetch('/api/admin/notify-lending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
               type: 'pinjam',
               nama_peminjam: lendingForm.nama_peminjam,
               nomor_wa: waNumber,
               items: lendingForm.items_dipinjam?.map(item => ({
                  nama_barang: item.nama_barang,
                  nomor_seri: item.nomor_seri,
                  accs: [item.accs1,item.accs2,item.accs3,item.accs4,item.accs5,item.accs6,item.accs7].filter(Boolean),
               })),
               tanggal_peminjaman: dataToSave.tanggal_peminjaman ?? new Date().toISOString(),
               tanggal_estimasi: lendingForm.tanggal_estimasi_pengembalian,
            }),
         }).catch(() => {/* non-kritis */});

         fetchLendingRecords();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   
   
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveRegistration = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         const payload = { ...registrationForm };
         // Auto-sync event_name dari event_id kalau dipilih dari list
         if (payload.event_id) {
            const evt = events.find(ev => ev.id === payload.event_id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (evt) payload.event_name = (evt as any).event_title || (evt as any).title || payload.event_name;
         }
         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'event_registrations', data: payload });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'event_registrations', data: payload, match: { id: editingId } });
            if (error) throw new Error(error.message);
         }
         fetchEventRegistrations();
         fetchEvents();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message);
      } finally {
         setIsSubmitting(false);
      }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveEvent = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         // eslint-disable-next-line @typescript-eslint/no-explicit-any
         const ef = eventForm as any;
         // Build payload dgn nama kolom DB sebenarnya (event_*)
         const payload: Record<string, unknown> = {
            event_title: ef.event_title ?? ef.title,
            event_date: ef.event_date ?? ef.date,
            event_price: ef.event_price ?? ef.price,
            event_image: ef.event_image ?? ef.image,
            event_description: ef.event_description ?? ef.detail_acara,
            event_partisipant_stock: parseInt(ef.event_partisipant_stock ?? ef.stock ?? 0) || 0,
            event_status: ef.event_status ?? ef.status ?? 'In stock',
            bank_info: ef.bank_info ?? null,
            event_payment_tipe: ef.event_payment_tipe ?? 'regular',
            event_speaker: ef.event_speaker ?? null,
            event_speaker_genre: ef.event_speaker_genre ?? null,
            deposit_amount: ef.deposit_amount ?? null,
            event_time: ef.event_time ?? null,
            event_location: ef.event_location ?? null,
            wa_group_link: ef.wa_group_link ?? null,
            display_start_date: ef.display_start_date ?? null,
            registration_open_date: ef.registration_open_date ?? null,
            registration_close_date: ef.registration_close_date ?? null,
         };
         if (eventImageFile) {
            const imageUrl = await uploadFileToStorage(eventImageFile, 'EventPoster', String(payload.event_title || 'poster').replace(/\s+/g, '_'));
            payload.event_image = imageUrl;
         }
         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'events', data: payload });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'events', data: payload, match: { id: editingId } });
            if (error) throw new Error(error.message);
         }
         fetchEvents();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal menyimpan event: ' + message);
      } finally {
         setIsSubmitting(false);
      }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveBotSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'pengaturan_bot', data: botSettingsForm });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'pengaturan_bot', data: botSettingsForm, match: { id: editingId } });
            if (error) throw new Error(error.message);
         }
         fetchBotSettings();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal menyimpan pengaturan bot: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   const saveTelegramChatId = async () => {
      const value = telegramChatIdInput.trim();
      setTelegramSaving(true);
      setTelegramMsg(null);
      try {
         const { data: existing } = await supabase.from('pengaturan_bot').select('id').eq('nama_pengaturan', 'telegram_admin_chat_id').maybeSingle();
         if (existing?.id) {
            const { error } = await sbWrite({ action: 'update', table: 'pengaturan_bot', data: { description: value }, match: { id: existing.id } });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'insert', table: 'pengaturan_bot', data: { nama_pengaturan: 'telegram_admin_chat_id', description: value, url_file: '' } });
            if (error) throw new Error(error.message);
         }
         setTelegramChatId(value);
         setTelegramMsg({ ok: true, text: '✅ Chat ID tersimpan.' });
      } catch (e) {
         setTelegramMsg({ ok: false, text: `❌ Gagal: ${e instanceof Error ? e.message : String(e)}` });
      } finally {
         setTelegramSaving(false);
      }
   };

   const saveNotifChannel = async (value: 'wa_only' | 'email_only' | 'wa_and_email') => {
      setNotifChannelSaving(true);
      setNotifChannelMsg(null);
      try {
         const { data: existing } = await supabase.from('pengaturan_bot').select('id').eq('nama_pengaturan', 'notif_channel').maybeSingle();
         if (existing?.id) {
            const { error } = await sbWrite({ action: 'update', table: 'pengaturan_bot', data: { description: value }, match: { id: existing.id } });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'insert', table: 'pengaturan_bot', data: { nama_pengaturan: 'notif_channel', description: value, url_file: null } });
            if (error) throw new Error(error.message);
         }
         setNotifChannel(value);
         setNotifChannelMsg({ ok: true, text: 'Berhasil disimpan!' });
         setTimeout(() => setNotifChannelMsg(null), 3000);
      } catch (err: unknown) {
         setNotifChannelMsg({ ok: false, text: 'Gagal: ' + (err instanceof Error ? err.message : String(err)) });
      } finally {
         setNotifChannelSaving(false);
      }
   };

   const saveChatbotTemplate = async (key: string) => {
      const text = chatbotEditValues[key] ?? (DEFAULT_TEMPLATES[key]?.template || '');
      setChatbotSaving(prev => ({ ...prev, [key]: true }));
      try {
         const dbKey = `${DB_KEY_PREFIX}${key}`;
         const { data: existing } = await supabase.from('pengaturan_bot').select('id').eq('nama_pengaturan', dbKey).maybeSingle();
         if (existing?.id) {
            const { error } = await sbWrite({ action: 'update', table: 'pengaturan_bot', data: { description: text }, match: { id: existing.id } });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'insert', table: 'pengaturan_bot', data: { nama_pengaturan: dbKey, description: text, url_file: null } });
            if (error) throw new Error(error.message);
         }
         setChatbotTemplates(prev => ({ ...prev, [key]: text }));
      } catch (err: unknown) {
         alert('Gagal menyimpan: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
         setChatbotSaving(prev => ({ ...prev, [key]: false }));
      }
   };

   const handleSaveAsset = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         const data = { ...assetForm };
         if (modalAction === 'create') {
            const { error } = await sbWrite({ action: 'insert', table: 'barang_aset', data });
            if (error) throw new Error(error.message);
         } else {
            const { error } = await sbWrite({ action: 'update', table: 'barang_aset', data, match: { id: editingId } });
            if (error) throw new Error(error.message);
         }
         await fetchAssets();
         closeModal();
      } finally { setIsSubmitting(false); }
   };

   const handleDelete = async (type: 'claim' | 'warranty' | 'promo' | 'service' | 'budget' | 'karyawan' | 'lending' | 'konsumen' | 'botsettings' | 'events' | 'eventregistration' | 'asset', id: string) => {
      if (!window.confirm('Yakin menghapus data?')) return;
      if (type === 'claim') { await sbWrite({ action: 'delete', table: 'claim_promo', match: { id_claim: id } }); fetchClaims(); }
      else if (type === 'warranty') { await sbWrite({ action: 'delete', table: 'garansi', match: { id_garansi: id } }); fetchWarranties(); }
      else if (type === 'konsumen') { await sbWrite({ action: 'delete', table: 'konsumen', match: { nomor_wa: id } }); fetchConsumers(); }
      else if (type === 'promo') { await sbWrite({ action: 'delete', table: 'promosi', match: { id_promo: id } }); fetchPromos(); }
      else if (type === 'service') { await sbWrite({ action: 'delete', table: 'status_service', match: { id_service: id } }); fetchServices(); }
      else if (type === 'karyawan') { await sbWrite({ action: 'delete', table: 'karyawan', match: { id_karyawan: id } }); fetchKaryawans(); }
      else if (type === 'botsettings') { await sbWrite({ action: 'delete', table: 'pengaturan_bot', match: { id } }); fetchBotSettings(); }
      else if (type === 'events') { await sbWrite({ action: 'delete', table: 'events', match: { id } }); fetchEvents(); }
      else if (type === 'eventregistration') { await sbWrite({ action: 'delete', table: 'event_registrations', match: { id } }); fetchEventRegistrations(); fetchEvents(); }
      else if (type === 'lending') {
         await sbWrite({ action: 'delete', table: 'peminjaman_barang', match: { id_peminjaman: id } });
         // TODO: Delete KTP file from storage if it exists
         fetchLendingRecords();
      }
      else if (type === 'asset') { await sbWrite({ action: 'delete', table: 'barang_aset', match: { id } }); fetchAssets(); }
      else { await sbWrite({ action: 'delete', table: 'budget_approval', match: { id_budget: id } }); fetchBudgets(); }
   };

   const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setMediaFile(file);
      if (file.type.startsWith('image/')) {
         const reader = new FileReader();
         reader.onload = ev => setMediaPreview(ev.target?.result as string);
         reader.readAsDataURL(file);
      } else {
         setMediaPreview(null);
      }
      e.target.value = '';
   };

   const handleSendReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedWa) return;

      // --- Kirim media jika ada file dipilih ---
      if (mediaFile) {
         setIsUploadingMedia(true);
         try {
            const url = await uploadFileToStorage(mediaFile, 'ChatMedia', selectedWa);
            const isImage = mediaFile.type.startsWith('image/');
            const isVideo = mediaFile.type.startsWith('video/');
            const mediaType = isImage ? 'image' : isVideo ? 'video' : 'document';
            const isiPesan = replyText.trim() || (isImage ? '[image]' : isVideo ? '[video]' : '[document]');
            const now = new Date().toISOString();
            const tempId = `__opt_${now}`;
            const optimisticMsg: RiwayatPesan = {
               id_pesan: tempId, nomor_wa: selectedWa,
               nama_profil_wa: getRealProfileName(selectedWa),
               arah_pesan: 'OUT', isi_pesan: isiPesan,
               url_media: url, waktu_pesan: now, bicara_dengan_cs: false, created_at: now,
            };
            setMessages(prev => [optimisticMsg, ...prev]);
            setMediaFile(null); setMediaPreview(null); setReplyText('');
            setTimeout(scrollToBottom, 50);
            const { error: insertErr } = await sbWrite({ action: 'insert', table: 'riwayat_pesan', data: { nomor_wa: selectedWa, nama_profil_wa: getRealProfileName(selectedWa), arah_pesan: 'OUT', isi_pesan: isiPesan, url_media: url, jenis_pesan: mediaType, waktu_pesan: now, bicara_dengan_cs: false, created_at: now } });
            if (insertErr) {
               console.error('Insert riwayat_pesan error:', insertErr);
               alert('Gambar terupload tapi gagal disimpan ke database:\n' + insertErr.message);
            } else {
               // Kirim via server-side (fetch Drive → upload WA media → send dengan media_id)
               const driveIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]{10,100})/) || url.match(/\/d\/([a-zA-Z0-9_-]{10,100})/);
               if (driveIdMatch) {
                  fetch('/api/admin/send-chat-media', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ driveFileId: driveIdMatch[1], target: selectedWa, mediaType, caption: replyText.trim() || undefined }),
                  }).then(r => r.json()).then(d => { if (d.error) console.error('[send-chat-media]', d.error); }).catch(console.error);
               } else {
                  supabase.functions.invoke('send-wa', { body: { target: selectedWa, mediaUrl: url, mediaType, message: replyText.trim() || undefined } }).catch(console.error);
               }
            }
         } catch (err) {
            alert('Gagal mengirim file: ' + (err as Error).message);
         } finally {
            setIsUploadingMedia(false);
         }
         return;
      }

      if (!replyText.trim()) return;
      let fullMessage = replyText.trim();
      if (replyToMessage) {
         const quotedText = replyToMessage.isi_pesan.length > 80 ? replyToMessage.isi_pesan.substring(0, 80) + '...' : replyToMessage.isi_pesan;
         const quotedName = replyToMessage.arah_pesan === 'OUT' ? 'Anda' : getRealProfileName(replyToMessage.nomor_wa);
         fullMessage = `> _${quotedName}: ${quotedText}_\n\n${replyText.trim()}`;
      }

      // --- Optimistic update: tampilkan pesan di UI sebelum network call selesai ---
      const now = new Date().toISOString();
      const tempId = `__opt_${now}`;
      const optimisticMsg: RiwayatPesan = {
         id_pesan: tempId,
         nomor_wa: selectedWa,
         nama_profil_wa: getRealProfileName(selectedWa),
         arah_pesan: 'OUT',
         isi_pesan: fullMessage,
         waktu_pesan: now,
         bicara_dengan_cs: false,
         created_at: now,
      };
      setMessages(prev => [optimisticMsg, ...prev]);
      setReplyText('');
      setReplyToMessage(null);
      setTimeout(scrollToBottom, 50);

      // --- Simpan ke DB dulu — insert DB → tampil di UI via polling, WA = fire-and-forget ---
      const { error: insertErr } = await sbWrite({
         action: 'insert',
         table: 'riwayat_pesan',
         data: { nomor_wa: selectedWa, nama_profil_wa: getRealProfileName(selectedWa), arah_pesan: 'OUT', isi_pesan: fullMessage, waktu_pesan: now, bicara_dengan_cs: false, created_at: now },
      });
      if (insertErr) {
         console.error('[handleSendReply] insert error:', insertErr.message);
         // Batalkan optimistic jika gagal simpan
         setMessages(prev => prev.filter(m => m.id_pesan !== tempId));
         alert('⚠️ Gagal menyimpan pesan ke database:\n' + insertErr.message);
         return;
      }

      // --- Kirim WA — fire-and-forget, tidak memblokir UI ---
      // bicara_dengan_cs TIDAK di-clear di sini; hanya tombol "Selesai CS" yang boleh clear
      sendWhatsAppMessage(selectedWa, fullMessage)
         .catch(err => console.error('[handleSendReply] wa error:', err));
      // Polling 5 detik akan replace optimistic dengan data real dari DB secara otomatis
   };

   const handleSendNewChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChatWa || !newChatMsg.trim()) return;
      await sendWhatsAppMessage(newChatWa, newChatMsg.trim());
      await sbWrite({ action: 'insert', table: 'riwayat_pesan', data: { nomor_wa: newChatWa, nama_profil_wa: getRealProfileName(newChatWa), arah_pesan: 'OUT', isi_pesan: newChatMsg.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false, created_at: new Date().toISOString() } });
      setIsNewChatModalOpen(false);
      setNewChatWa('');
      setNewChatMsg('');
      setSelectedWa(newChatWa);
      scrollToBottom();
   };

   const handleSaveResiModal = async () => {
      if (!resiModal?.id_claim) return;
      const { nama_jasa_pengiriman, nomor_resi } = resiModalForm;
      await sbWrite({ action: 'update', table: 'claim_promo', data: { nama_jasa_pengiriman, nomor_resi }, match: { id_claim: resiModal.id_claim } });
      setClaims(prev => prev.map(cl => cl.id_claim === resiModal.id_claim ? { ...cl, nama_jasa_pengiriman, nomor_resi } : cl));
      setResiModal(null);
   };

   const handleKirimStatusClaim = async (c: ClaimPromo) => {

      if (!window.confirm('Kirim status claim ke WA konsumen?')) return;
      const showMkt = ['HOLD', 'Valid'].includes(c.validasi_by_mkt || '');
      const showFa  = c.validasi_by_fa === 'Valid';
      const msg = getText('statusClaim', {
         nomor_seri: c.nomor_seri,
         tipe_barang: c.tipe_barang,
         status_mkt: showMkt ? (c.validasi_by_mkt || '') : '',
         status_fa:  showFa  ? (c.validasi_by_fa  || '') : '',
         jasa_kirim: c.nama_jasa_pengiriman || '',
         nomor_resi: c.nomor_resi || '',
         catatan_mkt: c.catatan_mkt || '',
      });
      const sentAt = new Date().toISOString();
      await sendWhatsAppMessage(c.nomor_wa, msg);
      await sbWrite({ action: 'insert', table: 'riwayat_pesan', data: { nomor_wa: c.nomor_wa, nama_profil_wa: getRealProfileName(c.nomor_wa), arah_pesan: 'OUT', isi_pesan: msg, waktu_pesan: sentAt, bicara_dengan_cs: false, created_at: sentAt } });
      // Simpan timestamp ke DB — status Teal (Resi Terkirim) diambil dari DB, bukan localStorage
      if (c.id_claim) {
         const { error: updErr } = await sbWrite({ action: 'update', table: 'claim_promo', match: { id_claim: c.id_claim }, data: { resi_sent_at: sentAt } });
         if (updErr) {
            console.error('[kirimStatus] gagal update resi_sent_at:', updErr);
         }
         setSentStatusClaimIds(prev => new Set([...prev, c.id_claim!])); // fallback sementara
      }
      alert('Pesan status berhasil dikirim!');
      fetchMessages();
      fetchClaims(); // refresh agar resi_sent_at dari DB langsung terbaca
   };

   const handleKirimStatusGaransi = async (w: Garansi) => {
      const linked = claims.find(c => c.nomor_seri === w.nomor_seri);
      if (!linked || !linked.nomor_wa) return alert('Gagal: Tidak dapat menemukan Nomor WA (Barang ini tidak ada di tabel Claim Promo).');
      if (!window.confirm('Kirim status garansi ke WA konsumen?')) return;
      const msg = getText('statusGaransi', { seri: w.nomor_seri, barang: w.tipe_barang, jenis: w.jenis_garansi, lama: w.lama_garansi, sisa: calculateSisaGaransi(linked.tanggal_pembelian, w.lama_garansi) });
      await sendWhatsAppMessage(linked.nomor_wa, msg);
      await sbWrite({ action: 'insert', table: 'riwayat_pesan', data: { nomor_wa: linked.nomor_wa, nama_profil_wa: getRealProfileName(linked.nomor_wa), arah_pesan: 'OUT', isi_pesan: msg, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false, created_at: new Date().toISOString() } });
      alert('Pesan status berhasil dikirim!');
      fetchMessages();
   };

   const handleSendEventSuccessWA = async (reg: EventRegistration) => {
      if (!window.confirm(`Kirim notifikasi konfirmasi pembayaran ke ${reg.full_name}?`)) return;
      
      const namaReg = reg.full_name || reg.nama_lengkap || '';
      const waReg = reg.wa_number || reg.nomor_wa || '';
      const message = `Halo *${namaReg}*,\n\nPembayaran Anda untuk event *${reg.event_name}* telah kami validasi. ✅\n\nSilakan simpan pesan ini sebagai bukti pendaftaran resmi. Sampai jumpa di lokasi acara!\n\nSalam,\nNikon Indonesia`;

      try {
         await sendWhatsAppMessage(waReg, message);
         await sbWrite({ action: 'insert', table: 'riwayat_pesan', data: {
            nomor_wa: waReg,
            nama_profil_wa: namaReg,
            arah_pesan: 'OUT',
            isi_pesan: message,
            waktu_pesan: new Date().toISOString(),
            bicara_dengan_cs: false,
            created_at: new Date().toISOString(),
         }});
         alert('Notifikasi berhasil dikirim!');
         fetchMessages();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal mengirim pesan: ' + message);
      }
   };

   const handleSelesaiCS = async (nomor_wa: string) => {
      try {
         await sbWrite({ action: 'update', table: 'riwayat_pesan', data: { bicara_dengan_cs: false }, match: { nomor_wa } });
         await sbWrite({ action: 'update', table: 'konsumen', data: { status_langkah: 'START' }, match: { nomor_wa } });
         fetchMessages();
      } catch (error: unknown) {
         const message = error instanceof Error ? error.message : String(error);
         console.error('Gagal update CS:', message);
      }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleReturnItems = async (lending: PeminjamanBarang, accsChecked: Record<number, Record<string, boolean>> = {}) => {
      if (!window.confirm('Yakin mengembalikan barang yang dipilih?')) return;
      setIsSubmitting(true);
      try {
         // Build items dulu agar bisa cek aksesori yang tidak dicentang
         const itemsWithAccsNotes = lending.items_dipinjam.map((item, idx) => {
            const allAccs = [item.accs1,item.accs2,item.accs3,item.accs4,item.accs5,item.accs6,item.accs7].filter(Boolean) as string[];
            if (item.status_pengembalian !== 'dikembalikan') return item;
            const checkedAccsList = allAccs.filter(a => !!(accsChecked[idx]?.[a]));
            const unchecked = allAccs.filter(a => !(accsChecked[idx]?.[a]));
            // Hapus note lama "Aksesori belum dicentang" sebelum append yang baru
            const catatanBase = (item.catatan_pengembalian || '').replace(/\s*\|?\s*Aksesori belum dicentang:[^|]*/g, '').replace(/\|\s*$/, '').trim();
            if (unchecked.length > 0) {
               const note = `Aksesori belum dicentang: ${unchecked.join(', ')}`;
               return { ...item, accs_returned: checkedAccsList, catatan_pengembalian: [catatanBase, note].filter(Boolean).join(' | ') };
            }
            return { ...item, accs_returned: allAccs, catatan_pengembalian: catatanBase || item.catatan_pengembalian };
         });

         // Status: selesai hanya jika SEMUA item dikembalikan DAN semua aksesori dicentang
         const allItemsReturned  = itemsWithAccsNotes.every(item => item.status_pengembalian === 'dikembalikan');
         const someItemsReturned = itemsWithAccsNotes.some(item => item.status_pengembalian === 'dikembalikan');
         const hasUncheckedAccs  = itemsWithAccsNotes.some((item) => {
            if (item.status_pengembalian !== 'dikembalikan') return false;
            const allAccs = [item.accs1,item.accs2,item.accs3,item.accs4,item.accs5,item.accs6,item.accs7].filter(Boolean) as string[];
            if (allAccs.length === 0) return false;
            return allAccs.some(a => !(item.accs_returned ?? []).includes(a));
         });
         const newStatusPeminjaman = (allItemsReturned && !hasUncheckedAccs) ? 'selesai'
            : (someItemsReturned || hasUncheckedAccs) ? 'partial'
            : 'aktif';

         // Upload foto pengembalian (max 10)
         let fotoPengembalianUrls: string[] = Array.isArray(lending.foto_pengembalian) ? (lending.foto_pengembalian as string[]) : [];
         for (const file of lendingFotoPengembalianFiles) {
            try {
               const url = await uploadFileToStorage(file, 'Lending_Pengembalian', lending.nomor_wa_peminjam);
               fotoPengembalianUrls = [...fotoPengembalianUrls, url];
            } catch { /* skip failed upload */ }
         }

         await sbWrite({ action: 'update', table: 'peminjaman_barang', data: {
            items_dipinjam: itemsWithAccsNotes,
            tanggal_pengembalian: allItemsReturned ? new Date().toISOString() : null,
            status_peminjaman: newStatusPeminjaman,
            ...(fotoPengembalianUrls.length > 0 ? { foto_pengembalian: fotoPengembalianUrls } : {}),
         }, match: { id_peminjaman: lending.id_peminjaman } });

         // Send WhatsApp message for returned items
         const returnedItems = itemsWithAccsNotes.filter(item => item.status_pengembalian === 'dikembalikan');
         if (returnedItems.length > 0) {
            try {
               const tglKembali = new Date().toISOString();
               const docRes = await fetch('/api/admin/generate-lending-doc', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                     type: 'kembali',
                     kodePeminjaman: lending.kode_peminjaman,
                     namaPeminjam: lending.nama_peminjam,
                     nomorWa: lending.nomor_wa_peminjam,
                     items: itemsWithAccsNotes,
                     tanggalPengembalian: tglKembali,
                  }),
               });
               if (docRes.ok) {
                  const { viewUrl } = await docRes.json();
                  const tglLabel = new Date(tglKembali).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
                  const itemList = formatLendingItemsForWA(itemsWithAccsNotes, 'kembali');
                  const returnTemplateName = newStatusPeminjaman === 'partial'
                     ? 'notif_lending_return_partial'
                     : 'notif_lending_return_v2';
                  await sendWhatsAppMessage(lending.nomor_wa_peminjam, '', {
                     templateName: returnTemplateName,
                     bodyParams: [lending.nama_peminjam, tglLabel, itemList, viewUrl],
                  });
               }
            } catch (waErr) {
               console.error('[lending-return] Gagal kirim WA:', waErr);
            }

            // Telegram notif admin — fire-and-forget
            fetch('/api/admin/notify-lending', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                  type: 'kembali',
                  nama_peminjam: lending.nama_peminjam,
                  nomor_wa: lending.nomor_wa_peminjam,
                  items: returnedItems.map(item => ({
                     nama_barang: item.nama_barang,
                     nomor_seri: item.nomor_seri,
                     catatan_pengembalian: item.catatan_pengembalian,
                  })),
                  tanggal_pengembalian: allItemsReturned ? new Date().toISOString() : undefined,
                  status_akhir: newStatusPeminjaman,
               }),
            }).catch(() => {/* non-kritis */});
         }

         fetchLendingRecords();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal mengembalikan barang: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   const handleRunCleanup = async () => {
      if (!window.confirm('Yakin ingin membersihkan sesi chat inaktif?')) return;
      setIsSubmitting(true);
      try {
         const yesterday = new Date();
         yesterday.setDate(yesterday.getDate() - 1);
         const { error } = await supabase
            .from('riwayat_pesan')
            .update({ bicara_dengan_cs: false })
            .eq('bicara_dengan_cs', true)
            .lt('waktu_pesan', yesterday.toISOString());
            
         if (error) throw error;
         alert('Sesi inaktif berhasil dibersihkan.');
         fetchMessages();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal membersihkan sesi: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   const calculateSisaGaransi = (tgl: string | undefined, lama: string) => {
      if (!tgl || !lama || lama === 'Tidak Garansi') return 'Tidak Garansi';
      const beli = new Date(tgl);
      beli.setFullYear(beli.getFullYear() + (lama === '1 Tahun' ? 1 : 2));
      const diff = beli.getTime() - new Date().getTime();
      return diff < 0 ? 'Garansi Habis' : `${Math.ceil(diff / (1000 * 60 * 60 * 24))} Hari`;
   };

   const getRealProfileName = useCallback((nomorWa: string | null) => {
      if (!nomorWa) return 'Pelanggan';
      // Prioritas 1: Nama dari data konsumen (database)
      if (consumers[nomorWa]) return consumers[nomorWa];
      // Prioritas 2: Nama profil WhatsApp dari riwayat pesan terbaru (Abaikan "Sistem Bot")
      const latestMsgWithProfile = messages.find(m => m.nomor_wa === nomorWa && m.nama_profil_wa && m.nama_profil_wa !== m.nomor_wa && m.nama_profil_wa !== "Sistem Bot");
      return latestMsgWithProfile?.nama_profil_wa || nomorWa;
   }, [consumers, messages]);

   const getNamaPromo = useCallback((tipeBarang: string) => {
      if (!tipeBarang) return '-';
      const matchedPromo = promos.find(p => p.tipe_produk && p.tipe_produk.some(prod => tipeBarang.toLowerCase().includes(prod.nama_produk.toLowerCase()) || prod.nama_produk.toLowerCase().includes(tipeBarang.toLowerCase())));
      return matchedPromo ? matchedPromo.nama_promo : '-';
   }, [promos]);

   // --- PRINT LABEL PENGIRIMAN (HTML5 CANVAS) ---
   const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      for (const word of words) {
         const testLine = currentLine ? `${currentLine} ${word}` : word;
         const metrics = ctx.measureText(testLine);
         if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
         } else {
            currentLine = testLine;
         }
      }
      if (currentLine) lines.push(currentLine);
      return lines;
   };

   const handlePrintLabelPengiriman = (c: ClaimPromo, rowNumber?: number) => {
      const consumer = consumersList.find(k => k.nomor_wa === c.nomor_wa);
      const canvas = document.createElement('canvas');
      canvas.width = 850;
      canvas.height = 380;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

      // Draw row number box in top-left corner
      if (rowNumber) {
         const boxSize = 35;
         ctx.fillStyle = '#FFFFFF';
         ctx.fillRect(20, 20, boxSize, boxSize);
         ctx.strokeStyle = '#000000';
         ctx.lineWidth = 1.5;
         ctx.strokeRect(20, 20, boxSize, boxSize);
         ctx.fillStyle = '#000000';
         ctx.font = 'bold 14px Arial';
         ctx.textAlign = 'center';
         ctx.textBaseline = 'middle';
         ctx.fillText(rowNumber.toString(), 20 + boxSize / 2, 20 + boxSize / 2);
      }

      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.textAlign = 'right';
      const dateStr = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\s/g, '-');
      ctx.fillText(dateStr, canvas.width - 30, 45);
      ctx.textAlign = 'left';
      const nama = (consumer?.nama_lengkap || consumers[c.nomor_wa] || c.nomor_wa).toUpperCase();
      const noWa = c.nomor_wa;
      ctx.font = '14px Arial';
      ctx.fillText('Kepada :', 40, 94);
      ctx.font = 'bold 15px Arial';
      ctx.fillText(`${rowNumber ? rowNumber + '. ' : ''}${nama} (${noWa})`, 130, 94);
      ctx.font = '15px Arial';
      let currentY = 122;
      if (c.alamat_pengiriman) {
         // Alamat jalan
         const alamatLines = wrapText(ctx, c.alamat_pengiriman.toUpperCase(), 590);
         alamatLines.forEach((line) => { ctx.fillText(line, 160, currentY); currentY += 25; });
         // Wilayah terstruktur
         const wilayahArr = [];
         if (c.kelurahan_pengiriman)  wilayahArr.push(`KEL. ${c.kelurahan_pengiriman}`);
         if (c.kecamatan_pengiriman)  wilayahArr.push(`KEC. ${c.kecamatan_pengiriman}`);
         if (c.kabupaten_pengiriman)  wilayahArr.push(c.kabupaten_pengiriman);
         if (wilayahArr.length > 0) {
            const wilayahLines = wrapText(ctx, wilayahArr.join(', ').toUpperCase(), 590);
            wilayahLines.forEach((line) => { ctx.fillText(line, 160, currentY); currentY += 25; });
         }
         const provKodepos = [
            c.provinsi_pengiriman ? c.provinsi_pengiriman.toUpperCase() : '',
            c.kodepos_pengiriman  ? c.kodepos_pengiriman                : '',
         ].filter(Boolean).join(' - ');
         if (provKodepos) { ctx.fillText(provKodepos, 160, currentY); currentY += 25; }
      } else {
         const alamat = consumer?.alamat_rumah !== 'BELUM_DIISI' ? consumer?.alamat_rumah : '-';
         const alamatLines = wrapText(ctx, (alamat || '-').toUpperCase(), 590);
         alamatLines.forEach((line) => {
            ctx.fillText(line, 160, currentY);
            currentY += 25;
         });
         const areaY = currentY;
         const areaArr = [];
         if (consumer?.kelurahan && consumer.kelurahan !== 'BELUM_DIISI') areaArr.push(`KEL. ${consumer.kelurahan}`);
         if (consumer?.kecamatan && consumer.kecamatan !== 'BELUM_DIISI') areaArr.push(`KEC. ${consumer.kecamatan}`);
         ctx.fillText(areaArr.length > 0 ? areaArr.join(', ').toUpperCase() : '-', 160, areaY);
         const provArr = [];
         if (consumer?.kabupaten_kotamadya && consumer.kabupaten_kotamadya !== 'BELUM_DIISI') provArr.push(`KAB/KOTA. ${consumer.kabupaten_kotamadya}`);
         if (consumer?.provinsi && consumer.provinsi !== 'BELUM_DIISI') provArr.push(`PROV. ${consumer.provinsi}`);
         if (consumer?.kodepos && consumer.kodepos !== 'BELUM_DIISI') provArr.push(`${consumer.kodepos}`);
         ctx.fillText(provArr.length > 0 ? provArr.join(', ').toUpperCase() : '-', 160, areaY + 30);
         currentY = areaY + 55;
      }
      ctx.fillText('From :', 40, 265);
      ctx.fillText('Alta Nikindo', 160, 265);
      ctx.fillText('Komp. Mangga Dua Square Blok H No.1-2, Jakarta - 14430', 160, 295);
      ctx.fillText('Whatsapp : 0851-7827-0172', 160, 325);
      ctx.textAlign = 'right';
      const sn = c.nomor_seri || '-';
      const promoName = c.jenis_promosi || getNamaPromo(c.tipe_barang);
      ctx.fillText(`${sn} - ${promoName}`, canvas.width - 30, canvas.height - 20);
      const imgURL = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgURL;
      const sanitizedNama = nama.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedSeri = (c.nomor_seri || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${sanitizedNama}_${sanitizedSeri}_Label.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (c.id_claim) {
         const today = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/\s/g, '-');
         const newDates = [...(c.tanggal_cetak || []), today];
         // Update lokal langsung (feedback instan)
         setClaims(prev => prev.map(cl => cl.id_claim === c.id_claim ? { ...cl, tanggal_cetak: newDates } : cl));
         // Simpan permanen ke Supabase
         sbWrite({
            action: 'update',
            table: 'claim_promo',
            data: { tanggal_cetak: newDates },
            match: { id_claim: c.id_claim },
         }).catch(e => console.error('[printLabel] simpan tanggal_cetak error:', e));
      }
   };

   const uniqueContacts = useMemo(() => {
      return Array.from(messages.reduce((map, msg) => {
         if (msg.nomor_wa) {
            if (!map.has(msg.nomor_wa)) {
               map.set(msg.nomor_wa, { ...msg });
            } else if (msg.bicara_dengan_cs) {
               map.set(msg.nomor_wa, { ...map.get(msg.nomor_wa), bicara_dengan_cs: true });
            }
         }
         return map;
      }, new Map()).values()) as RiwayatPesan[];
   }, [messages]);

   const filteredContacts = uniqueContacts.filter((c: RiwayatPesan) => {
      const name = getRealProfileName(c.nomor_wa).toLowerCase();
      const num = (c.nomor_wa || "").toLowerCase();
      const search = searchChat.toLowerCase();
      return name.includes(search) || num.includes(search);
   });

   const filteredConsumers = useMemo(() => consumersList.filter((c: KonsumenData) => {
      const name = (c.nama_lengkap || "").toLowerCase();
      const num = (c.nomor_wa || "").toLowerCase();
      const id = (c.id_konsumen || "").toLowerCase();
      const search = searchKonsumen.toLowerCase();
      return name.includes(search) || num.includes(search) || id.includes(search);
   }), [consumersList, searchKonsumen]);

   const sortedConsumers = useMemo(() => {
      const sortableItems = [...filteredConsumers];
      // Pass null as consumersMap is not needed for KonsumenData directly
      return sortableItems.sort(getSortFunction(sortConfigKonsumen, null));
   }, [filteredConsumers, sortConfigKonsumen, getSortFunction]);

   const currentChatThread = useMemo(() => {
      if (!selectedWa) return [];
      const filtered = messages.filter((m: RiwayatPesan) =>
         m.nomor_wa === selectedWa &&
         (showSystemMessages || m.jenis_pesan !== 'system'),
      );
      // De-duplikasi: hapus optimistic message (__opt_) jika sudah ada pesan real
      // dengan isi dan waktu yang sama (selisih < 10 detik)
      const optimistic = filtered.filter(m => m.id_pesan?.startsWith('__opt_'));
      const real = filtered.filter(m => !m.id_pesan?.startsWith('__opt_'));
      const deduped = [
         ...real,
         ...optimistic.filter(opt => {
            const optTime = new Date(opt.waktu_pesan || opt.created_at || 0).getTime();
            return !real.some(r =>
               r.isi_pesan === opt.isi_pesan &&
               Math.abs(new Date(r.waktu_pesan || r.created_at || 0).getTime() - optTime) < 10_000
            );
         }),
      ];
      return deduped.sort((a, b) => {
         const dateA = new Date(a.waktu_pesan || a.created_at || 0).getTime();
         const dateB = new Date(b.waktu_pesan || b.created_at || 0).getTime();
         return dateA - dateB;
      });
   }, [selectedWa, messages, showSystemMessages]);

   const filteredPromos = useMemo(() => promos.filter((p: Promosi) => {
      const name = (p.nama_promo || "").toLowerCase();
      const start = (p.tanggal_mulai || "").toLowerCase();
      const end = (p.tanggal_selesai || "").toLowerCase();
      const search = searchPromo.toLowerCase();
      return name.includes(search) || start.includes(search) || end.includes(search);
   }), [promos, searchPromo]);
   const sortedPromos = useMemo(() => {
      const sortableItems = [...filteredPromos];
      return sortableItems.sort(getSortFunction(sortConfigPromos, consumers));
   }, [filteredPromos, sortConfigPromos, consumers, getSortFunction]);
   
   const claimStatusCounts = useMemo(() => {
      const counts: Record<string, number> = { Putih: 0, Merah: 0, Orange: 0, Biru: 0, Pink: 0, Hijau: 0, Teal: 0 };
      claims.forEach(c => {
         const color = getClaimStatusColor(c);
         if (counts[color] !== undefined) counts[color]++;
      });
      return counts;
   }, [claims, getClaimStatusColor]);

   // ── Sidebar actionable counts ──────────────────────────────────────────────
   const sidebarCounts = useMemo(() => {
      const todayStr = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
      // Pesan: thread WA yang masih dalam mode CS (belum resolve)
      const csUnresolved = (() => {
         const perWa = new Map<string, boolean>();
         messages.forEach(m => { if (m.bicara_dengan_cs !== undefined) perWa.set(m.nomor_wa, !!m.bicara_dengan_cs); });
         return Array.from(perWa.values()).filter(Boolean).length;
      })();
      // Konsumen baru hari ini
      const konsumenBaru = consumersList.filter(k => {
         if (!k.created_at) return false;
         const d = new Date(k.created_at).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' });
         return d === todayStr;
      }).length;
      // Claim belum di cek
      const claimBelumCek = claimStatusCounts.Putih ?? 0;
      // Garansi belum divalidasi
      const garansiBelum = warranties.filter(w => w.status_validasi !== 'Valid').length;
      // Service aktif / belum selesai
      const serviceAktif = services.filter(s => s.status_service !== 'selesai' && s.status_service !== 'diambil').length;
      // Peminjaman aktif
      const peminjamanAktif = lendingRecords.filter(l => l.status_peminjaman === 'aktif').length;
      // Peserta menunggu validasi
      const pesertaPending = eventRegistrations.filter(r => r.status_pendaftaran === 'menunggu_validasi').length;
      return { csUnresolved, konsumenBaru, claimBelumCek, garansiBelum, serviceAktif, peminjamanAktif, pesertaPending };
   }, [messages, consumersList, claimStatusCounts, warranties, services, lendingRecords, eventRegistrations]);

   const duplicateClaimIds = useMemo(() => {
      const duplicatesToMark = new Set<string>();
      const snToIds: Record<string, string[]> = {};
      claims.forEach(c => {
         const sn = (c.nomor_seri || "").trim().toUpperCase();
         if (sn && sn !== '-' && sn !== 'TBA' && c.id_claim) {
            if (!snToIds[sn]) snToIds[sn] = [];
            snToIds[sn].push(c.id_claim);
         }
      });
      Object.values(snToIds).forEach(list => {
         if (list.length > 1) list.forEach(id => duplicatesToMark.add(id));
      });
      return duplicatesToMark;
   }, [claims]);

   const filteredClaims = useMemo(() => claims.filter((c: ClaimPromo) => {
      const name = (consumers[c.nomor_wa] || c.nomor_wa || "").toLowerCase();
      const seri = (c.nomor_seri || "").toLowerCase();
      const promo = (c.jenis_promosi || getNamaPromo(c.tipe_barang)).toLowerCase();
      const mkt = (c.validasi_by_mkt || "").toLowerCase();
      const fa = (c.validasi_by_fa || "").toLowerCase();
      const search = searchClaim.toLowerCase();

      const matchesSearch = name.includes(search) || seri.includes(search) || promo.includes(search) || mkt.includes(search) || fa.includes(search);
      if (!matchesSearch) return false;

      if (filterStatusWarna !== 'Semua') {
         const color = getClaimStatusColor(c);
         if (color !== filterStatusWarna) return false;
      }
      if (filterDuplikat && !(c.id_claim && duplicateClaimIds.has(c.id_claim))) return false;

      // Per-column filters
      const fc = filterColClaims;
      if (fc.nama && !name.includes(fc.nama.toLowerCase())) return false;
      if (fc.nomor_seri && !seri.includes(fc.nomor_seri.toLowerCase())) return false;
      if (fc.tipe_barang && fc.tipe_barang !== '__all__' && c.tipe_barang !== fc.tipe_barang) return false;
      if (fc.jenis_promosi && fc.jenis_promosi !== '__all__' && promo !== fc.jenis_promosi.toLowerCase()) return false;
      if (fc.nama_toko && !(c.nama_toko || '').toLowerCase().includes(fc.nama_toko.toLowerCase())) return false;
      if (fc.validasi_by_mkt && fc.validasi_by_mkt !== '__all__' && mkt !== fc.validasi_by_mkt.toLowerCase()) return false;
      if (fc.validasi_by_fa && fc.validasi_by_fa !== '__all__' && fa !== fc.validasi_by_fa.toLowerCase()) return false;
      if (fc.tanggal_pembelian && !(c.tanggal_pembelian || '').includes(fc.tanggal_pembelian)) return false;
      if (fc.status && fc.status !== '__all__') {
         const color = getClaimStatusColor(c);
         if (color !== fc.status) return false;
      }
      if (fc.created_at && !(c.created_at || '').includes(fc.created_at)) return false;
      if (fc.nota_garansi && fc.nota_garansi !== '__all__') {
         const hasNota = !!(c.link_nota_pembelian);
         const hasGaransi = !!(c.link_kartu_garansi);
         if (fc.nota_garansi === 'nota' && !hasNota) return false;
         if (fc.nota_garansi === 'garansi' && !hasGaransi) return false;
         if (fc.nota_garansi === 'keduanya' && !(hasNota && hasGaransi)) return false;
         if (fc.nota_garansi === 'tidak_ada' && (hasNota || hasGaransi)) return false;
      }
      if (fc.catatan_mkt && !(c.catatan_mkt || '').toLowerCase().includes(fc.catatan_mkt.toLowerCase())) return false;
      if (fc.kirim_status && fc.kirim_status !== '__all__') {
         const sudahKirim = !!(c.resi_sent_at) || (c.id_claim ? sentStatusClaimIds.has(c.id_claim) : false);
         if (fc.kirim_status === 'sudah' && !sudahKirim) return false;
         if (fc.kirim_status === 'belum' && sudahKirim) return false;
      }

      return true;
   }), [claims, searchClaim, filterStatusWarna, filterDuplikat, filterColClaims, duplicateClaimIds, consumers, getNamaPromo, getClaimStatusColor, sentStatusClaimIds]);

   const sortedClaims = useMemo(() => {
      const sortableItems = [...filteredClaims];
      return sortableItems.sort(getSortFunction(sortConfigClaims, consumers));
   }, [filteredClaims, sortConfigClaims, consumers, getSortFunction]);

   // Unique option lists for per-column claim dropdowns
   const claimColOptions = useMemo(() => {
      const tipe = Array.from(new Set(claims.map(c => c.tipe_barang).filter(Boolean))).sort();
      const promo = Array.from(new Set(claims.map(c => c.jenis_promosi || getNamaPromo(c.tipe_barang)).filter(Boolean))).sort();
      const mkt = Array.from(new Set(claims.map(c => c.validasi_by_mkt).filter(Boolean))).sort();
      const fa = Array.from(new Set(claims.map(c => c.validasi_by_fa).filter(Boolean))).sort();
      return { tipe, promo, mkt, fa };
   }, [claims, getNamaPromo]);

   const setClaimColFilter = (col: string, val: string) =>
      setFilterColClaims(prev => ({ ...prev, [col]: val }));

   const hasActiveColFilters = Object.values(filterColClaims).some(v => v && v !== '__all__');

   const claimNumberMap = useMemo(() => {
      const map = new Map<string, number>();
      const total = claims.length;
      claims.forEach((c: ClaimPromo, idx: number) => {
         if (c.id_claim) map.set(c.id_claim, total - idx);
      });
      return map;
   }, [claims]);

   const konsumenNumberMap = useMemo(() => {
      const map = new Map<string, number>();
      const total = consumersList.length;
      consumersList.forEach((k, idx) => {
         if (k.nomor_wa) map.set(k.nomor_wa, total - idx);
      });
      return map;
   }, [consumersList]);

   const garansiNumberMap = useMemo(() => {
      const map = new Map<string, number>();
      const total = warranties.length;
      warranties.forEach((w, idx) => {
         if (w.id_garansi) map.set(w.id_garansi, total - idx);
      });
      return map;
   }, [warranties]);

   const eventNumberMap = useMemo(() => {
      const map = new Map<string, number>();
      const total = events.length;
      events.forEach((e, idx) => {
         if (e.id) map.set(e.id, total - idx);
      });
      return map;
   }, [events]);

   const filteredEvents = useMemo(() => events.filter((e: EventData) => (e.title || "").toLowerCase().includes(searchEvent.toLowerCase())), [events, searchEvent]);
   const sortedEvents = useMemo(() => {
      const sortableItems = [...filteredEvents];
      return sortableItems.sort(getSortFunction(sortConfigEvents, consumers));
   }, [filteredEvents, sortConfigEvents, consumers, getSortFunction]);

   const getClaimDurationDays = (createdAt?: string) => {
      if (!createdAt) return '-';
      const created = new Date(createdAt);
      if (isNaN(created.getTime())) return '-';
      const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return `${diff} hari`;
   };

   const formatSubmitDate = (createdAt?: string) => {
      if (!createdAt) return '-';
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
   };

   const formatTglBeli = (val?: string) => {
      if (!val) return '-';
      const d = new Date(val);
      if (isNaN(d.getTime())) return val;
      const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
      const dd = String(d.getDate()).padStart(2, '0');
      return `${dd} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
   };

   const warrantyStatusCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      warranties.forEach(w => {
         const s = w.status_validasi || 'Belum';
         counts[s] = (counts[s] || 0) + 1;
      });
      return counts;
   }, [warranties]);

   const filteredWarranties = useMemo(() => warranties.filter((w: Garansi) => {
      const matchSearch = (w.nomor_seri || '').toLowerCase().includes(searchGaransi.toLowerCase());
      const matchStatus = filterStatusGaransi === 'Semua' || (w.status_validasi || 'Belum') === filterStatusGaransi;
      return matchSearch && matchStatus;
   }), [warranties, searchGaransi, filterStatusGaransi]);

   const sortedWarranties = useMemo(() => {
      const sortableItems = [...filteredWarranties];
      return sortableItems.sort(getSortFunction(sortConfigWarranties, consumers));
   }, [filteredWarranties, sortConfigWarranties, consumers, getSortFunction]);

   const filteredServices = useMemo(() => services.filter((s: StatusService) => {
      const ttr = (s.nomor_tanda_terima || "").toLowerCase();
      const seri = (s.nomor_seri || "").toLowerCase();
      const status = (s.status_service || "").toLowerCase();
      const search = searchService.toLowerCase();
      return ttr.includes(search) || seri.includes(search) || status.includes(search);
   }), [services, searchService]); // Keep filteredServices for search
   const sortedServices = useMemo(() => {
      const sortableItems = [...filteredServices];
      return sortableItems.sort(getSortFunction(sortConfigServices, consumers));
   }, [filteredServices, sortConfigServices, consumers, getSortFunction]);
   const filteredBudgets = useMemo(() => budgets.filter((b: BudgetApproval) => (b.title || "").toLowerCase().includes(searchBudget.toLowerCase())), [budgets, searchBudget]); // Keep filteredBudgets for search

   const sortedBudgets = useMemo(() => {
      const sortableItems = [...filteredBudgets];
      return sortableItems.sort(getSortFunction(sortConfigBudgets, consumers));
   }, [filteredBudgets, sortConfigBudgets, consumers, getSortFunction]);

   const filteredKaryawans = useMemo(() => karyawans.filter((k: Karyawan) => { // Keep filteredKaryawans for search
      const nama = (k.nama_karyawan || "").toLowerCase();
      const user = (k.username || "").toLowerCase();
      const search = searchKaryawan.toLowerCase();
      return nama.includes(search) || user.includes(search);
   }), [karyawans, searchKaryawan]); // Keep filteredKaryawans for search
   const sortedKaryawans = useMemo(() => {
      const sortableItems = [...filteredKaryawans];
      return sortableItems.sort(getSortFunction(sortConfigKaryawans, consumers));
   }, [filteredKaryawans, sortConfigKaryawans, consumers, getSortFunction]);
   // No need for filteredConsumers here, it's already defined above and sorted.

   const filteredLendingRecords = useMemo(() => lendingRecords.filter((l: PeminjamanBarang) => {
      const name = (l.nama_peminjam || "").toLowerCase();
      const wa = (l.nomor_wa_peminjam || "").toLowerCase();
      const status = (l.status_peminjaman || "").toLowerCase();
      const items = l.items_dipinjam.map(item => `${item.nama_barang} ${item.nomor_seri}`).join(' ').toLowerCase();
      const kode = (l.kode_peminjaman || "").toLowerCase();
      const search = searchLending.toLowerCase();
      return name.includes(search) || wa.includes(search) || status.includes(search) || items.includes(search) || kode.includes(search);
   }), [lendingRecords, searchLending]);

   const sortedLendingRecords = useMemo(() => {
      const sortableItems = [...filteredLendingRecords];
      return sortableItems.sort(getSortFunction(sortConfigLending, consumers));
   }, [filteredLendingRecords, sortConfigLending, consumers, getSortFunction]);

   const ALL_TABS_GROUPED = useMemo(() => [
      {
         category: 'Utama',
         tabs: [
            { id: 'dashboard', label: '🎯 Dashboard', count: undefined },
            { id: 'messages', label: '💬 Pesan', count: sidebarCounts.csUnresolved || undefined },
            { id: 'konsumen', label: '👥 Konsumen', count: sidebarCounts.konsumenBaru || undefined },
         ]
      },
      {
         category: 'Operasional',
         tabs: [
            { id: 'promos', label: '📢 Promo', count: undefined },
            { id: 'promo_datacolor', label: '🏷️ Promo Datacolor', count: undefined },
            { id: 'claims', label: '🎫 Claim Promo', count: sidebarCounts.claimBelumCek || undefined },
            { id: 'warranties', label: '🛡️ Garansi', count: sidebarCounts.garansiBelum || undefined },
            { id: 'services', label: '🔧 Service', count: sidebarCounts.serviceAktif || undefined },
            { id: 'lending', label: '📦 Peminjaman', count: sidebarCounts.peminjamanAktif || undefined },
            { id: 'assets', label: '🗄️ Barang Aset', count: undefined },
            { id: 'dealer', label: '🏪 Transaksi Dealer', count: undefined },
            { id: 'affiliate', label: '🤝 Affiliate', count: undefined },
            { id: 'resi', label: '📦 Upload File Resi', count: undefined },
         ]
      },
      {
         category: 'Event',
         tabs: [
            { id: 'budgets', label: '💳 1. Proposal Event', count: undefined },
            { id: 'events', label: '📅 2. Daftar Event', count: undefined },
            { id: 'eventregistrations', label: '👥 3. Data Peserta', count: sidebarCounts.pesertaPending || undefined },
            { id: 'eventreport', label: '📊 4. Report Event (SG)', count: undefined },
            { id: 'expense_claim', label: '🧾 5. Claim Biaya', count: undefined },
         ]
      },
      {
         category: 'Manajemen',
         tabs: [
            { id: 'import', label: '📤 Import Data', count: undefined },
            { id: 'userrole', label: '🔐 User Role', count: karyawans.length },
            { id: 'botsettings', label: '⚙️ Bot Settings', count: botSettings.length },
            { id: 'autocomplete', label: '✏️ Saran Isian', count: undefined },
            { id: 'wa_templates', label: '💬 WA Templates', count: undefined },
            { id: 'infrastruktur', label: '🖥️ Infrastruktur', count: undefined },
         ]
      },
      {
         category: 'Halaman Admin',
         tabs: [
            { id: 'admin_events', label: '🗂️ Validasi Pembayaran Event', count: undefined },
            { id: 'admin_deposit', label: '💰 Deposit & Refund Event', count: undefined },
            { id: 'admin_attendance', label: '📋 Absensi Event', count: undefined },
         ]
      }
   ], [messages.length, consumersList.length, promos.length, claims.length, warranties.length, services.length, budgets.length, lendingRecords.length, karyawans.length, botSettings.length, events.length, eventRegistrations.length, dealerSheet?.rows.length, affiliates.length]);

   const groupedVisibleTabs = useMemo(() => {
      return ALL_TABS_GROUPED.map(group => ({
         ...group,
         tabs: group.tabs.filter(tab => {
            if (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') return true;
            if (tab.id === 'userrole' || tab.id === 'autocomplete' || tab.id === 'wa_templates') return false;
            if (tab.id === 'expense_claim') return true; // semua karyawan bisa akses, filter per-user di API
            if (tab.id === 'resi') return true; // semua karyawan bisa akses, filter per-user di API
            return (currentUser?.akses_halaman || []).includes(tab.id);
         })
      })).filter(group => group.tabs.length > 0);
   }, [currentUser, ALL_TABS_GROUPED]);

   useEffect(() => {
      if (currentUser && groupedVisibleTabs.length > 0 && !groupedVisibleTabs.flatMap(g => g.tabs).find(t => t.id === activeTab)) {
         // eslint-disable-next-line react-hooks/set-state-in-effect
         setActiveTab(groupedVisibleTabs[0].tabs[0].id);
      }
   }, [currentUser, activeTab, groupedVisibleTabs]);

   // --- UI RENDER ---


   if (!isLoggedIn) {
      return (
         <div className="flex items-center justify-center min-h-screen bg-black text-gray-900 relative overflow-hidden bg-[radial-gradient(#FFE500_1px,transparent_1px)] bg-size-[30px_30px]">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#FFE500_1px,transparent_1px)] bg-size-[30px_30px]"></div>
            <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm relative z-10 border-t-4 border-[#FFE500]">
               <div className="text-center mb-10">
                  <div className="mb-4 transform hover:scale-105 transition inline-block">
                     <Image src="/nikon-logo.svg" alt="Nikon" width={64} height={64} className="h-16 w-auto rounded-xl shadow-lg" />
                  </div>
                  <p className="text-sm text-gray-600 font-semibold">Dashboard Manajemen</p>
                  <p className="text-xs text-gray-500 mt-1">Masuk untuk mengelola Bot & Data</p>
               </div>
               {loginError && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-sm mb-5 font-medium shadow-sm">{loginError}</div>}

               {!isForgotPw ? (
                  <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                     <div>
                        <label className="block text-sm font-bold mb-2 text-gray-800">Username</label>
                        <input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} required className="input-modern" placeholder="Masukkan username" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-2 text-gray-800">Password</label>
                        <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required className="input-modern" placeholder="Masukkan password" />
                     </div>
                     <button type="submit" className="btn-primary w-full mt-4">
                        🔓 MASUK
                     </button>
                     <div className="text-center mt-6">
                        <button type="button" onClick={() => setIsForgotPw(true)} className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">Lupa Password?</button>
                     </div>
                  </form>
               ) : (
                  <form onSubmit={handleForgotPwSubmit} className="space-y-5 animate-fade-in">
                     {forgotPwMessage && <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg text-sm font-medium mb-4">{forgotPwMessage}</div>}
                     <div>
                        <label className="block text-sm font-bold mb-2 text-gray-800">Nomor WhatsApp Terdaftar</label>
                        <input type="text" value={forgotPwUsername} onChange={e => setForgotPwUsername(e.target.value)} required className="input-modern" placeholder="Contoh: 62812345678" />
                     </div>
                     <button type="submit" disabled={isSubmitting} className="btn-secondary w-full">
                        {isSubmitting ? '⏳ Mengirim...' : '📤 Kirim Password Baru'}
                     </button>
                     <div className="text-center mt-6">
                        <button type="button" onClick={() => { setIsForgotPw(false); setForgotPwMessage(''); setForgotPwUsername(''); }} className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">← Kembali ke Login</button>
                     </div>
                  </form>
               )}
            </div>
         </div>
      );
   }

   if (loading) return <div className="flex flex-col justify-center items-center h-screen bg-white gap-4"><div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-[#FFE500]"></div><span className="text-sm text-gray-400 font-medium">Memuat...</span></div>;

   return (
      <>
         {/* Banner error jika data gagal dimuat */}
         {dataLoadError && (
            <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-xs px-4 py-2 flex items-center justify-between gap-2 shadow-lg">
               <span className="flex-1">{dataLoadError}</span>
               <button
                  onClick={() => { localStorage.removeItem('nikon_karyawan'); setIsLoggedIn(false); setCurrentUser(null); setLoading(false); }}
                  className="bg-white text-red-700 font-bold px-2 py-0.5 rounded text-xs hover:bg-red-100 whitespace-nowrap"
               >Login Ulang</button>
               <button onClick={() => setDataLoadError(null)} className="font-bold hover:opacity-75 px-1">✕</button>
            </div>
         )}
         <div className={`h-screen bg-gray-50 flex flex-col relative text-gray-900 ${printData ? 'hidden print:hidden' : 'print:hidden'}`} style={{fontFamily:'system-ui,-apple-system,sans-serif'}}>

               <Header
                  sidebarOpen={sidebarOpen}
                  setSidebarOpen={setSidebarOpen}
                  currentUser={currentUser}
                  handleLogout={handleLogout}
                  onChangePassword={() => { setChangePwForm({ current: '', newPw: '', confirm: '' }); setChangePwError(''); setChangePwSuccess(''); setIsChangePwOpen(true); }}
                  activeTabLabel={groupedVisibleTabs.flatMap(g => g.tabs).find(t => t.id === activeTab)?.label?.replace(/^[^\w\s]+\s*/, '') ?? 'Dashboard'}
               />

            <div className="flex flex-1 overflow-hidden relative">
               {/* MOBILE OVERLAY */}
               {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

               {/* SIDEBAR NAVIGATION */}
               <div className={`fixed md:relative z-20 md:z-auto top-0 left-0 h-full w-56 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

                  {/* Logo */}
                  <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-100 shrink-0">
                     <div className="w-7 h-7 bg-[#FFE500] rounded-md flex items-center justify-center text-black font-black text-sm shrink-0">N</div>
                     <span className="text-sm font-bold text-gray-900 truncate">Nikon Dashboard</span>
                  </div>

                  {/* User info */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 shrink-0">
                     <div className="w-8 h-8 rounded-md bg-[#FFE500] flex items-center justify-center text-black font-bold text-xs shrink-0 shadow-sm">
                        {currentUser?.nama_karyawan?.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase() ?? '??'}
                     </div>
                     <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-900 truncate leading-tight">{currentUser?.nama_karyawan}</p>
                        <p className="text-[11px] text-gray-400 truncate leading-tight">{currentUser?.username ? `${currentUser.username}` : 'altanikindo.com'}</p>
                     </div>
                  </div>

                  {/* Nav scrollable */}
                  <div className="flex-1 overflow-y-auto py-2">
                     {(() => {
                        // Icon map by tab ID
                        const icons: Record<string, string> = {
                           dashboard:          'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
                           messages:           'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-1-1z',
                           konsumen:           'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
                           promos:             'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
                           claims:             'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
                           warranties:         'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
                           services:           'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
                           lending:            'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
                           assets:             'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4',
                           dealer:             'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z',
                           affiliate:          'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
                           resi:               'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10',
                           budgets:            'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
                           events:             'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                           eventregistrations: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
                           eventreport:        'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                           expenseclaim:       'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
                           import:             'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
                           userrole:           'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
                           botsettings:        'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
                           autocomplete:       'M13 10V3L4 14h7v7l9-11h-7z',
                           watemplates:        'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4-1-1z',
                           monitoring:         'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                           admin_events:       'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                           admin_deposit:      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 0V5m0 2c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                           admin_attendance:   'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
                        };
                        const defaultIcon = 'M4 6h16M4 12h16M4 18h16';
                        const adminPageUrls: Record<string, string> = {
                           admin_events: '/admin/events',
                           admin_deposit: '/admin/events/deposit',
                           admin_attendance: '/admin/events/attendance',
                        };

                        return groupedVisibleTabs.map(group => (
                           <div key={group.category} className="mb-1">
                              <h3 className="px-4 pt-3 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{group.category}</h3>
                              <div className="space-y-px px-2">
                                 {group.tabs.map(tab => {
                                    const extUrl = adminPageUrls[tab.id];
                                    const cleanLabel = tab.label.replace(/^[^\w\s]+\s*/, '');
                                    const iconPath = icons[tab.id] || defaultIcon;
                                    const isActive = activeTab === tab.id;
                                    const iconEl = (
                                       <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          {iconPath.includes('M15 12') ? (
                                             iconPath.split(' M').map((p, i) => <path key={i} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={i === 0 ? p : 'M' + p} />)
                                          ) : (
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
                                          )}
                                       </svg>
                                    );
                                    return extUrl ? (
                                       <a key={tab.id} href={extUrl} target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)}
                                          className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors group">
                                          {iconEl}
                                          <span className="flex-1 truncate">{cleanLabel}</span>
                                          <svg className="w-2.5 h-2.5 shrink-0 opacity-30 group-hover:opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                       </a>
                                    ) : (
                                       <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }}
                                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${isActive ? 'bg-[#FFE500] text-black font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'}`}>
                                          {iconEl}
                                          <span className="flex-1 text-left truncate">{cleanLabel}</span>
                                          {tab.count !== undefined && (
                                             <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold shrink-0 tabular-nums ${isActive ? 'bg-black/10 text-black' : 'bg-gray-100 text-gray-500'}`}>{tab.count}</span>
                                          )}
                                       </button>
                                    );
                                 })}
                              </div>
                           </div>
                        ));
                     })()}

                     {/* Halaman Lain */}
                     <div className="mt-1 pt-2 border-t border-gray-100 mx-2">
                        <h3 className="px-2.5 pt-2 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Halaman Lain</h3>
                        <div className="space-y-px">
                           {[
                              { href: '/nikon', label: 'Website Nikon' },
                              { href: '/claim', label: 'Form Claim' },
                              { href: '/garansi', label: 'Form Garansi' },
                              { href: '/events/register', label: 'Daftar Event' },
                              { href: '/nikon/upload-lomba', label: 'Upload Foto Lomba' },
                              ...((currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.akses_halaman?.includes('admin_events')) ? [{ href: '/admin/events', label: 'Admin Events' }] : []),
                              ...((currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.akses_halaman?.includes('admin_attendance')) ? [{ href: '/admin/events/attendance', label: 'Absensi Event' }] : []),
                              ...((currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin' || currentUser?.akses_halaman?.includes('admin_deposit')) ? [{ href: '/admin/events/deposit', label: 'Refund Deposit' }] : []),
                              ...((currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') ? [
                                 { href: '/admin/monitoring', label: 'System Monitoring' },
                                 { href: '/admin/google-auth', label: 'Google Drive Auth' },
                                 { href: 'https://photos.altanikindo.web.id', label: 'Galeri Foto' },
                                 { href: 'https://backup.altanikindo.web.id/dashboard', label: 'Backup Dashboard' },
                              ] : []),
                              ...(currentUser?.role === 'Super Admin' ? [
                                 { href: 'https://terminal.altanikindo.web.id', label: 'Terminal SSH' },
                              ] : []),
                           ].map(link => (
                              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)}
                                 className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors group">
                                 <svg className="w-3.5 h-3.5 shrink-0 text-gray-300 group-hover:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                 <span className="flex-1 truncate">{link.label}</span>
                              </a>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Bottom: refresh */}
                  <div className="shrink-0 px-3 py-3 border-t border-gray-100">
                     <button
                        onClick={async () => {
                           if (isRefreshing) return;
                           setIsRefreshing(true);
                           try {
                              const tab = activeTabRef.current;
                              const tasks: Promise<void>[] = [];
                              if (['dashboard', 'messages'].includes(tab))  { tasks.push(fetchMessages()); tasks.push(fetchConsumers()); }
                              if (['dashboard', 'claims'].includes(tab))     tasks.push(fetchClaims());
                              if (['dashboard', 'warranties'].includes(tab)) tasks.push(fetchWarranties());
                              if (['dashboard', 'services'].includes(tab))   tasks.push(fetchServices());
                              if (['dashboard', 'budgets'].includes(tab))    tasks.push(fetchBudgets());
                              if (tab === 'promos')             tasks.push(fetchPromos());
                              if (tab === 'lending')            tasks.push(fetchLendingRecords());
                              if (tab === 'assets')             tasks.push(fetchAssets());
                              if (tab === 'events')             tasks.push(fetchEvents());
                              if (tab === 'eventregistrations') tasks.push(fetchEventRegistrations());
                              if (tab === 'konsumen')           tasks.push(fetchConsumers());
                              if (tab === 'userrole')           tasks.push(fetchKaryawans());
                              if (tab === 'botsettings')        tasks.push(fetchBotSettings());
                              if (tab === 'autocomplete')       tasks.push(fetchAutocomplete());
                              if (tab === 'affiliate')          tasks.push(fetchAffiliates());
                              if (tasks.length === 0) tasks.push(fetchMessages());
                              await Promise.all(tasks);
                              setLastRefreshed(new Date());
                           } finally {
                              setIsRefreshing(false);
                           }
                        }}
                        disabled={isRefreshing}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-40"
                     >
                        <svg className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        {isRefreshing ? 'Memperbarui...' : 'Refresh data'}
                     </button>
                     {lastRefreshed && (
                        <p className="text-[10px] text-center text-gray-400 mt-1">
                           {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' })}
                        </p>
                     )}
                  </div>
               </div>

               {/* MAIN CONTENT */}
               <main className={activeTab === 'messages' ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto px-5 md:px-7 py-5 md:py-6 space-y-5"}>

               {/* ======================= DASHBOARD OVERVIEW ======================= */}
               {activeTab === 'dashboard' && (() => {
                  const now = new Date();
                  const hour = parseInt(now.toLocaleString('id-ID', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
                  const greeting = hour < 11 ? 'Selamat pagi' : hour < 15 ? 'Selamat siang' : hour < 18 ? 'Selamat sore' : 'Selamat malam';
                  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

                  // "Perlu perhatian" count
                  const needsAttention = [
                     eventRegistrations.filter(r => r.status_pendaftaran === 'menunggu_validasi').length,
                     claimStatusCounts.Pink ?? 0,
                     lendingRecords.filter(l => l.status_peminjaman === 'aktif').length,
                  ].reduce((a, b) => a + b, 0);

                  // Stats
                  const pendingValidasi = eventRegistrations.filter(r => r.status_pendaftaran === 'menunggu_validasi').length;
                  const now2 = new Date();
                  const thisMonth = now2.toLocaleString('id-ID', { month: '2-digit', year: 'numeric', timeZone: 'Asia/Jakarta' }).replace(' ', '/');
                  const claimsTungguResi = claimStatusCounts.Pink ?? 0;

                  // Recent registrations (last 6)
                  const recentRegs = [...eventRegistrations]
                     .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
                     .slice(0, 6);

                  const initials2 = (name: string) => (name || '?').split(/\s+/).map(w => w[0] || '').filter(Boolean).slice(0, 2).join('').toUpperCase();
                  const avatarColors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#ef4444','#6366f1'];
                  const avatarColor = (s: string) => avatarColors[s.charCodeAt(0) % avatarColors.length];

                  const regStatusLabel = (s: string) => s === 'menunggu_validasi' ? 'Validasi' : s === 'terdaftar' ? 'Terdaftar' : 'Ditolak';
                  const regStatusStyle = (s: string) => s === 'menunggu_validasi'
                     ? 'bg-orange-100 text-orange-700'
                     : s === 'terdaftar' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600';

                  // Activity feed — built from recent data across tables
                  type ActivityItem = { icon: string; iconBg: string; title: string; sub: string; timeMs: number };
                  const activities: ActivityItem[] = [];

                  // Recent registrations as activity
                  recentRegs.slice(0, 3).forEach(r => {
                     activities.push({
                        icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                        iconBg: '#eff6ff',
                        title: r.status_pendaftaran === 'menunggu_validasi' ? 'Registrasi baru masuk' : r.status_pendaftaran === 'terdaftar' ? 'Pembayaran divalidasi' : 'Registrasi ditolak',
                        sub: `${r.nama_lengkap} · ${r.event_name || '-'}`,
                        timeMs: new Date(r.created_at || 0).getTime(),
                     });
                  });

                  // Recent claims with resi
                  claims.filter(c => c.nama_jasa_pengiriman && c.resi_sent_at).slice(0, 2).forEach(c => {
                     activities.push({
                        icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
                        iconBg: '#f0fdf4',
                        title: 'Resi dikirim ke konsumen',
                        sub: `${c.nama_pendaftar || c.nama_penerima_claim || '-'} · ${c.nama_jasa_pengiriman}`,
                        timeMs: new Date(c.resi_sent_at || 0).getTime(),
                     });
                  });

                  // Claims tunggu resi
                  if (claimsTungguResi > 0) {
                     activities.push({
                        icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                        iconBg: '#fff7ed',
                        title: `${claimsTungguResi} claim tunggu resi`,
                        sub: 'Perlu diisi nomor resi pengiriman',
                        timeMs: Date.now() - 3600000,
                     });
                  }

                  // Pending validasi
                  if (pendingValidasi > 0) {
                     activities.push({
                        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                        iconBg: '#fffbeb',
                        title: `${pendingValidasi} registrasi menunggu validasi`,
                        sub: 'Perlu di-approve atau ditolak',
                        timeMs: Date.now() - 7200000,
                     });
                  }

                  activities.sort((a, b) => b.timeMs - a.timeMs);

                  const timeAgo = (ms: number) => {
                     const diff = Date.now() - ms;
                     if (diff < 60000) return 'Baru saja';
                     if (diff < 3600000) return `${Math.floor(diff / 60000)}m lalu`;
                     if (diff < 86400000) return `${Math.floor(diff / 3600000)}j lalu`;
                     return `${Math.floor(diff / 86400000)}h lalu`;
                  };

                  // Active events
                  const activeEvents = events
                     .filter(e => { const { closed } = getEventClosedStatus(e, eventRegistrationsCount[e.title] || 0); return !closed; })
                     .slice(0, 3);

                  // Bot WA status
                  const botWaOn = botSettings.some(s => s.nama_pengaturan === 'bot_aktif' && s.url_file === 'true') || botSettings.length > 0;

                  return (
                     <div className="animate-fade-in space-y-4">
                        {/* HEADER ROW */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                           <div>
                              <h2 className="text-xl font-bold text-gray-900">{greeting}, {currentUser?.nama_karyawan?.split(' ')[0]}</h2>
                              <p className="text-sm text-gray-400 mt-0.5">{dateStr}{needsAttention > 0 && <span className="ml-2 text-orange-500 font-medium">· {needsAttention} item perlu perhatian</span>}</p>
                           </div>
                           <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm self-start sm:self-auto">
                              {(['Hari Ini', 'Minggu', 'Bulan'] as const).map((p, i) => (
                                 <button key={p} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${i === 0 ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{p}</button>
                              ))}
                           </div>
                        </div>

                        {/* STAT CARDS */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                           {[
                              { label: 'Total Konsumen', value: consumersList.length, sub: consumersList.length > 0 ? '+8.2%' : null, subColor: 'text-green-600', onClick: () => setActiveTab('konsumen') },
                              { label: 'Perlu Validasi', value: pendingValidasi, sub: pendingValidasi > 0 ? 'Segera' : 'Semua clear', subColor: pendingValidasi > 0 ? 'text-orange-500' : 'text-green-600', onClick: () => setActiveTab('eventregistrations') },
                              { label: 'Pesan WA', value: messagesCount || messages.length, sub: '+8%', subColor: 'text-green-600', onClick: () => setActiveTab('messages') },
                              { label: 'Resi Bulan Ini', value: claims.filter(c => c.resi_sent_at && c.resi_sent_at.startsWith(thisMonth.split('/').reverse().join('-').substring(0,7))).length, sub: `+${claimsTungguResi} tunggu`, subColor: 'text-blue-500', onClick: () => setActiveTab('claims') },
                           ].map(s => (
                              <button key={s.label} onClick={s.onClick} className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:border-gray-300 hover:shadow-sm transition-all group">
                                 <p className="text-xs text-gray-400 font-medium mb-2">{s.label}</p>
                                 <p className="text-2xl font-bold text-gray-900">{s.value.toLocaleString('id-ID')}</p>
                                 {s.sub && <p className={`text-xs font-semibold mt-1.5 flex items-center gap-1 ${s.subColor}`}><span>↑</span>{s.sub}</p>}
                              </button>
                           ))}
                        </div>

                        {/* MAIN GRID */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                           {/* REGISTRASI TERBARU */}
                           <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <div className="flex items-center justify-between mb-3">
                                 <h3 className="text-sm font-semibold text-gray-800">Registrasi Terbaru</h3>
                                 <button onClick={() => setActiveTab('eventregistrations')} className="text-xs text-blue-600 hover:underline font-medium">Semua</button>
                              </div>
                              {recentRegs.length === 0 ? (
                                 <p className="text-sm text-gray-400 py-4 text-center">Belum ada registrasi</p>
                              ) : (
                                 <div className="space-y-2.5">
                                    {recentRegs.map(r => (
                                       <div key={r.id} className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: avatarColor(r.nama_lengkap || '?') }}>
                                             {initials2(r.nama_lengkap || '?')}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <p className="text-sm font-semibold text-gray-800 truncate">{r.nama_lengkap}</p>
                                             <p className="text-xs text-gray-400 truncate">{r.event_name} · {r.tipe_kamera || '-'}</p>
                                          </div>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${regStatusStyle(r.status_pendaftaran || '')}`}>
                                             {regStatusLabel(r.status_pendaftaran || '')}
                                          </span>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </div>

                           {/* AKTIVITAS TERKINI */}
                           <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <div className="flex items-center justify-between mb-3">
                                 <h3 className="text-sm font-semibold text-gray-800">Aktivitas Terkini</h3>
                                 {activities.length > 7 && (
                                    <button onClick={() => setShowAllActivities(v => !v)} className="text-xs text-blue-600 hover:underline font-medium">
                                       {showAllActivities ? 'Ringkas' : `Semua (${activities.length})`}
                                    </button>
                                 )}
                              </div>
                              {activities.length === 0 ? (
                                 <p className="text-sm text-gray-400 py-4 text-center">Tidak ada aktivitas terbaru</p>
                              ) : (
                                 <div className="space-y-3">
                                    {(showAllActivities ? activities : activities.slice(0, 7)).map((a, i) => (
                                       <div key={i} className="flex items-start gap-3">
                                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: a.iconBg }}>
                                             <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={a.icon} />
                                             </svg>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                             <p className="text-xs font-semibold text-gray-800 truncate">{a.title}</p>
                                             <p className="text-[11px] text-gray-400 truncate">{a.sub}</p>
                                          </div>
                                          <span className="text-[10px] text-gray-400 shrink-0 mt-0.5">{timeAgo(a.timeMs)}</span>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* BOTTOM GRID */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                           {/* EVENT AKTIF */}
                           <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <div className="flex items-center justify-between mb-3">
                                 <h3 className="text-sm font-semibold text-gray-800">Event Aktif</h3>
                                 <button onClick={() => setActiveTab('events')} className="text-xs text-blue-600 hover:underline font-medium">Semua</button>
                              </div>
                              {activeEvents.length === 0 ? (
                                 <p className="text-sm text-gray-400 py-4 text-center">Tidak ada event aktif</p>
                              ) : (
                                 <div className="space-y-4">
                                    {activeEvents.map(evt => {
                                       const count = eventRegistrationsCount[evt.title] || 0;
                                       const pct = evt.stock > 0 ? Math.min(100, Math.round(count / evt.stock * 100)) : 0;
                                       const evtDate = evt.date ? new Date(evt.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' }) : '-';
                                       return (
                                          <div key={evt.id}>
                                             <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-semibold text-gray-800">{evt.title}</p>
                                                <span className="text-xs text-gray-500 font-medium">{count}/{evt.stock}</span>
                                             </div>
                                             <div className="w-full h-1.5 bg-gray-100 rounded-md overflow-hidden">
                                                <div className="h-full rounded-md bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
                                             </div>
                                             <p className="text-[11px] text-gray-400 mt-1">{evtDate}</p>
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}
                           </div>

                           {/* STATUS SISTEM */}
                           <div className="bg-white rounded-xl border border-gray-200 p-4">
                              <h3 className="text-sm font-semibold text-gray-800 mb-3">Status Sistem</h3>
                              <div className="space-y-2.5">
                                 {[
                                    { label: 'Bot WA', ok: botWaOn },
                                    { label: 'Database', ok: true },
                                    { label: 'Google Drive', ok: true },
                                 ].map(s => (
                                    <div key={s.label} className="flex items-center justify-between">
                                       <span className="text-sm text-gray-600 flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-md ${s.ok ? 'bg-green-400' : 'bg-red-400'}`} />
                                          {s.label}
                                       </span>
                                       <span className={`text-xs font-semibold ${s.ok ? 'text-green-600' : 'text-red-500'}`}>{s.ok ? 'Online' : 'Offline'}</span>
                                    </div>
                                 ))}
                                 <div className="pt-2 mt-1 border-t border-gray-100 space-y-2">
                                    <div className="flex items-center justify-between">
                                       <span className="text-xs text-gray-400">Claim promo</span>
                                       <span className="text-xs font-semibold text-gray-700">{claims.length} total</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                       <span className="text-xs text-gray-400">Garansi aktif</span>
                                       <span className="text-xs font-semibold text-gray-700">{warranties.filter(w => w.status_validasi === 'Valid').length} valid</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                       <span className="text-xs text-gray-400">Peminjaman aktif</span>
                                       <span className="text-xs font-semibold text-gray-700">{lendingRecords.filter(l => l.status_peminjaman === 'aktif').length} unit</span>
                                    </div>
                                 </div>
                                 <button
                                    onClick={async () => {
                                       setDbChecking(true);
                                       try {
                                          const res = await fetch('/api/admin/data-check', { cache: 'no-store' });
                                          const json = await res.json();
                                          setDbCheckResult(json);
                                       } catch (e) { setDbCheckResult({ error: String(e) }); }
                                       finally { setDbChecking(false); }
                                    }}
                                    disabled={dbChecking}
                                    className="mt-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors w-full"
                                 >{dbChecking ? 'Memeriksa...' : 'Cek koneksi DB'}</button>
                                 {dbCheckResult && (
                                    <div className="text-xs font-mono mt-1 space-y-0.5">
                                       {dbCheckResult.error ? (
                                          <p className="text-red-600">❌ {String(dbCheckResult.error)}</p>
                                       ) : (
                                          <p className="text-green-600">✅ Terhubung — service key {dbCheckResult.serviceKeySet ? 'OK' : 'MISSING'}</p>
                                       )}
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     </div>
                  );
               })()}

               {/* ======================= IMPORT DATA TAB ======================= */}
               {activeTab === 'import' && (
                  <div className="space-y-8 animate-fade-in text-gray-900">
                     <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                           <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                           </div>
                           Pusat Upload &amp; Update Database
                        </h2>
                        <p className="text-gray-600 mb-6 text-sm">Pilih tabel target, unduh template untuk menyesuaikan kolom, lalu unggah file CSV Anda. Sistem akan melakukan *Upsert* (Update jika data sudah ada, Insert jika data baru).</p>
                        <p className="font-semibold text-gray-800 mb-3">Urutan template yang diupload :</p>
                        <ul className="list-disc list-inside text-gray-600 text-sm mb-6">
                           <li>Template 1: Tabel Konsumen (Wajib jika data konsumen belum ada, jika sudah bisa lanjut ke upload lainnya)</li>
                           <li>Template 2: Tabel Claim Promo</li>
                           <li>Template 3: Tabel Garansi</li>
                           <li>Template 2: Tabel Garansi</li>
                           <li>Template 3: Tabel Claim Promo</li>
                           <li>Template 4: Tabel Status Service</li>
                        </ul>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                           <div>
                              <label htmlFor="import-target-select" className="block text-sm font-bold mb-2">1. Pilih Tabel Database</label>
                              <select id="import-target-select" value={importTarget} onChange={e => setImportTarget(e.target.value as typeof importTarget)} className="w-full border border-gray-300 p-3 rounded-md bg-white text-gray-900 outline-none focus:ring-2 focus:ring-black">
                                 <option value="claim_promo">Tabel Claim Promo</option>
                                 <option value="garansi">Tabel Garansi</option>
                                 <option value="konsumen">Tabel Konsumen</option>
                                 <option value="status_service">Tabel Status Service</option>
                              </select>
                           </div>
                           <div>
                              <button onClick={downloadTemplate} className="w-full bg-gray-800 text-white p-3 rounded-md font-bold hover:bg-gray-700 transition">
                                 <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Unduh Template CSV
                              </button>
                           </div>
                        </div>

                        <div className="mt-10 p-10 border-2 border-dashed border-gray-300 rounded-xl text-center bg-gray-50">
                           <div className="mb-4 w-14 h-14 mx-auto rounded-xl bg-gray-100 flex items-center justify-center">
                              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"/></svg>
                           </div>
                           <h3 className="font-bold text-lg mb-1">Upload File CSV</h3>
                           <p className="text-gray-500 text-sm mb-6">Pastikan file bertipe .csv dan mengikuti format template.</p>
                           <button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 transition shadow-md">
                              {isSubmitting ? 'Sedang Memproses...' : 'Pilih File & Upload'}
                           </button>
                           <input type="file" ref={fileInputRef} className="hidden" accept=".csv" aria-label="Upload file CSV" onChange={handleCentralUpload} />
                        </div>
                     </div>

                     <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-1.5">
                           <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                           Tips Penting:
                        </h4>
                        <ul className="text-sm text-black list-disc ml-5 space-y-1 font-medium">
                           <li>Kolom ID adalah kunci utama. Jika ingin mengupdate data lama, sertakan ID aslinya.</li>
                           <li>Sistem secara otomatis akan mengisi <b>created_at</b>, <b>updated_at</b>, dan men-generate ID unik jika tidak diisi.</li>
                           <li>Gunakan aplikasi Excel atau Google Sheets untuk mengedit file template, lalu &quot;Save As&quot; sebagai CSV.</li>
                        </ul>
                     </div>
                  </div>
               )}

               {/* ======================= OTHER TABS FILTER HEADER ======================= */}
               {activeTab !== 'import' && activeTab !== 'lending' && activeTab !== 'messages' && activeTab !== 'eventreport' && activeTab !== 'claims' && (
                  <div className="flex flex-wrap gap-3 justify-between items-center mb-5 text-gray-900">
                     <div className="flex flex-wrap gap-2 items-center">
                        {activeTab !== 'konsumen' && activeTab !== 'budgets' && activeTab !== 'userrole' && (
                           <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                              <input aria-label="Dari Tanggal" type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="text-xs text-gray-700 bg-transparent outline-none border-0 w-28" />
                              <span className="text-gray-300 text-xs">—</span>
                              <input aria-label="Sampai Tanggal" type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="text-xs text-gray-700 bg-transparent outline-none border-0 w-28" />
                           </div>
                        )}
                        {activeTab !== 'konsumen' && (
                           <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                              <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'table' ? 'bg-[#FFE500] text-black' : 'text-gray-500 hover:bg-gray-50'}`}>Baris</button>
                              <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 text-xs font-semibold transition ${viewMode === 'card' ? 'bg-[#FFE500] text-black' : 'text-gray-500 hover:bg-gray-50'}`}>Kartu</button>
                           </div>
                        )}
                     </div>
                     <div className="flex flex-wrap gap-2 items-center">
{activeTab === 'botsettings' && <button onClick={() => openModal('create', 'botsettings')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">+ Tambah Pengaturan</button>}
                        {activeTab === 'events' && <button onClick={() => openModal('create', 'event')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">+ Tambah Event</button>}
                        {activeTab === 'eventregistrations' && <button onClick={() => setIsScannerOpen(true)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 transition shadow-sm">Scan QR</button>}
                        {activeTab === 'eventregistrations' && <button onClick={() => openModal('create', 'eventregistration')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">+ Tambah Peserta</button>}
                        {activeTab === 'warranties' && <button onClick={() => openModal('create', 'warranty')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">+ Tambah Garansi</button>}
                        {activeTab === 'services' && <button onClick={() => openModal('create', 'service')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">+ Tambah Service</button>}
                        {activeTab === 'budgets' && <button onClick={() => openModal('create', 'budget')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">+ Buat Proposal</button>}
                        {activeTab === 'promos' && (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && <button onClick={() => openModal('create', 'promo')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">+ Tambah Promo</button>}
                        {activeTab === 'userrole' && (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && <button onClick={() => openModal('create', 'karyawan')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">+ Tambah Karyawan</button>}
                     </div>
                  </div>
               )}

               {/* ======================= PESAN ======================= */}
               {activeTab === 'messages' && (
                  <MessagesTab
                     uniqueContacts={uniqueContacts}
                     filteredContacts={filteredContacts}
                     messages={messages}
                     currentChatThread={currentChatThread}
                     consumersList={consumersList}
                     currentUser={currentUser}
                     botSettings={botSettings}
                     selectedWa={selectedWa}
                     setSelectedWa={setSelectedWa}
                     searchChat={searchChat}
                     setSearchChat={setSearchChat}
                     chatFilter={chatFilter}
                     setChatFilter={setChatFilter}
                     readStatus={readStatus}
                     setReadStatus={setReadStatus}
                     chatTags={chatTags}
                     setChatTags={setChatTags}
                     pinnedChats={pinnedChats}
                     setPinnedChats={setPinnedChats}
                     tagMenuFor={tagMenuFor}
                     setTagMenuFor={setTagMenuFor}
                     chatHasMore={chatHasMore}
                     chatLoadedCount={chatLoadedCount}
                     chatLoadingMore={chatLoadingMore}
                     setChatLoadingMore={setChatLoadingMore}
                     replyText={replyText}
                     setReplyText={setReplyText}
                     replyToMessage={replyToMessage}
                     setReplyToMessage={setReplyToMessage}
                     quickReplyOpen={quickReplyOpen}
                     setQuickReplyOpen={setQuickReplyOpen}
                     quickReplyFilter={quickReplyFilter}
                     setQuickReplyFilter={setQuickReplyFilter}
                     mediaFile={mediaFile}
                     setMediaFile={setMediaFile}
                     mediaPreview={mediaPreview}
                     setMediaPreview={setMediaPreview}
                     isUploadingMedia={isUploadingMedia}
                     showSystemMessages={showSystemMessages}
                     setShowSystemMessages={setShowSystemMessages}
                     showScrollToBottom={showScrollToBottom}
                     isNewChatModalOpen={isNewChatModalOpen}
                     setIsNewChatModalOpen={setIsNewChatModalOpen}
                     isRefreshing={isRefreshing}
                     isSubmitting={isSubmitting}
                     chatContainerRef={chatContainerRef}
                     messagesEndRef={messagesEndRef}
                     replyInputRef={replyInputRef}
                     chatFileInputRef={chatFileInputRef}
                     getRealProfileName={getRealProfileName}
                     fetchMessages={fetchMessages}
                     fetchConsumers={fetchConsumers}
                     fetchContactHistory={fetchContactHistory}
                     handleRunCleanup={handleRunCleanup}
                     handleSendReply={handleSendReply}
                     handleMediaSelect={handleMediaSelect}
                     handleSelesaiCS={handleSelesaiCS}
                     openImageViewer={openImageViewer}
                     isGoogleDriveLink={isGoogleDriveLink}
                     toDriveProxy={toDriveProxy}
                     isImageUrl={isImageUrl}
                     scrollToBottom={scrollToBottom}
                     sbWrite={sbWrite}
                  />
               )}

               {activeTab === 'konsumen' && (() => {
                  // Stats
                  const totalKonsumen = consumersList.length;
                  const konsumenWithClaim = consumersList.filter(k => claims.some(c => c.nomor_wa === k.nomor_wa)).length;
                  const konsumenLengkap = consumersList.filter(k => k.nik && k.nik !== 'BELUM_DIISI' && k.alamat_rumah && k.alamat_rumah !== 'BELUM_DIISI').length;
                  const initials = (name: string) => (name || '?').split(/\s+/).map(w => w[0] || '').filter(Boolean).slice(0, 2).join('').toUpperCase();
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
                  const colorFor = (s: string) => colors[s.charCodeAt(0) % colors.length] || 'bg-gray-500';
                  return (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     {/* Stat cards */}
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                           <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">Total Konsumen</p>
                           <p className="text-2xl font-black text-gray-900 mt-1">{totalKonsumen}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                           <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">Punya Claim</p>
                           <p className="text-2xl font-black text-green-700 mt-1">{konsumenWithClaim}</p>
                           <p className="text-[10px] text-gray-700 font-medium">{totalKonsumen ? Math.round(konsumenWithClaim / totalKonsumen * 100) : 0}% dari total</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                           <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">Data Lengkap</p>
                           <p className="text-2xl font-black text-blue-700 mt-1">{konsumenLengkap}</p>
                           <p className="text-[10px] text-gray-700 font-medium">NIK + Alamat terisi</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                           <p className="text-[11px] uppercase tracking-wider font-bold text-gray-600">Total Claim</p>
                           <p className="text-2xl font-black text-amber-700 mt-1">{claims.length}</p>
                        </div>
                     </div>

                     {/* Toolbar: search + view toggle + actions */}
                     <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-50">
                           <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                           <input
                              type="text"
                              title="Cari Konsumen"
                              aria-label="Cari Konsumen"
                              placeholder="Cari Nama, No. WA, ID Konsumen, atau NIK..."
                              value={searchKonsumen}
                              onChange={e => setSearchKonsumen(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-300 bg-white text-gray-900 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-2 focus:ring-[#FFE500]/40 text-sm font-medium"
                           />
                        </div>
                        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                           <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>📋 Tabel</button>
                           <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>🪪 Kartu</button>
                        </div>
                        <button onClick={() => openModal('create', 'konsumen')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2.5 rounded-lg font-bold text-sm transition shadow-sm whitespace-nowrap">+ Tambah Konsumen</button>
                        <button onClick={() => openModal('create', 'claim')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm transition shadow-sm whitespace-nowrap">+ Tambah Claim</button>
                     </div>

                     {/* Empty state */}
                     {sortedConsumers.length === 0 && (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                           <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gray-100 flex items-center justify-center">
                              {searchKonsumen ? (
                                 <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0015.803 15.803z"/></svg>
                              ) : (
                                 <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>
                              )}
                           </div>
                           <p className="text-gray-900 font-bold mb-1">{searchKonsumen ? 'Tidak ada konsumen ditemukan' : 'Belum ada konsumen'}</p>
                           <p className="text-sm text-gray-700">{searchKonsumen ? 'Coba ubah kata kunci pencarian.' : 'Klik tombol "+ Tambah Konsumen" untuk menambah konsumen baru.'}</p>
                        </div>
                     )}

                     {/* TABLE VIEW */}
                     {viewMode === 'table' && sortedConsumers.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                 <tr>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">#</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKonsumen, setSortConfigKonsumen, 'nama_lengkap')}>Konsumen {sortConfigKonsumen.column === 'nama_lengkap' && (<span>{sortConfigKonsumen.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Kontak</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Alamat</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">NIK</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Claim</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {sortedConsumers.map((k: KonsumenData) => {
                                    const userClaims = claims.filter((c: ClaimPromo) => c.nomor_wa === k.nomor_wa);
                                    const alamatLengkap = [k.alamat_rumah, k.kelurahan, k.kecamatan, k.kabupaten_kotamadya, k.provinsi, k.kodepos].filter(v => v && v !== 'BELUM_DIISI').join(', ');
                                    return (
                                       <tr key={k.nomor_wa} className="hover:bg-gray-50 font-medium">
                                          <td className="px-4 py-3 text-center text-xs font-bold text-gray-700">{konsumenNumberMap.get(k.nomor_wa)}</td>
                                          <td className="px-4 py-3">
                                             <div className="flex items-center gap-2.5">
                                                <div className={`w-9 h-9 rounded-md ${colorFor(k.nama_lengkap || '?')} text-white font-bold text-sm flex items-center justify-center shrink-0`}>{initials(k.nama_lengkap || '?')}</div>
                                                <div className="min-w-0">
                                                   <p className="font-bold text-gray-900 truncate">{k.nama_lengkap || '-'}</p>
                                                   <p className="text-[10px] font-mono text-gray-700">{k.id_konsumen || '—'}</p>
                                                </div>
                                             </div>
                                          </td>
                                          <td className="px-4 py-3">
                                             <p className="text-gray-900 font-mono text-xs">{k.nomor_wa}</p>
                                          </td>
                                          <td className="px-4 py-3 text-xs text-gray-800 max-w-xs">
                                             {alamatLengkap || <span className="text-gray-500 italic">Belum diisi</span>}
                                          </td>
                                          <td className="px-4 py-3 text-xs text-gray-800 font-mono">{k.nik && k.nik !== 'BELUM_DIISI' ? k.nik : <span className="text-gray-500 italic font-sans">-</span>}</td>
                                          <td className="px-4 py-3">
                                             {userClaims.length > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-xs font-bold">
                                                   {userClaims.length} claim
                                                </span>
                                             ) : (
                                                <span className="text-gray-500 italic text-xs">-</span>
                                             )}
                                          </td>
                                          <td className="px-4 py-3">
                                             <div className="flex gap-1.5 items-center">
                                                <button onClick={() => setViewingKonsumen(k)} className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">👁 View</button>
                                                <GradientActionBtn onClick={() => openModal('edit', 'konsumen', k)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                                {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                   <GradientActionBtn onClick={() => handleDelete('konsumen', k.nomor_wa)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                                )}
                                             </div>
                                          </td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     )}

                     {/* CARD VIEW */}
                     {viewMode === 'card' && sortedConsumers.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                           {sortedConsumers.map((k: KonsumenData) => {
                              const userClaims = claims.filter((c: ClaimPromo) => c.nomor_wa === k.nomor_wa);
                              const alamatLengkap = [k.alamat_rumah, k.kelurahan, k.kecamatan, k.kabupaten_kotamadya, k.provinsi, k.kodepos].filter(v => v && v !== 'BELUM_DIISI').join(', ');
                              return (
                                 <div key={k.nomor_wa} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                    <div className={`${colorFor(k.nama_lengkap || '?')} p-4 text-white`}>
                                       <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 rounded-md bg-white/30 backdrop-blur text-white font-bold flex items-center justify-center text-lg shrink-0">{initials(k.nama_lengkap || '?')}</div>
                                          <div className="min-w-0 flex-1">
                                             <p className="font-bold text-base truncate">{k.nama_lengkap || '-'}</p>
                                             <p className="text-[11px] font-mono opacity-90">{k.id_konsumen || '—'}</p>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="p-4 space-y-2 text-xs">
                                       <div>
                                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600">WhatsApp</p>
                                          <p className="font-mono text-gray-900">{k.nomor_wa}</p>
                                       </div>
                                       <div>
                                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600">NIK</p>
                                          <p className="font-mono text-gray-900">{k.nik && k.nik !== 'BELUM_DIISI' ? k.nik : <span className="text-gray-500 italic font-sans">Belum diisi</span>}</p>
                                       </div>
                                       <div>
                                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-600">Alamat</p>
                                          <p className="text-gray-900 leading-snug">{alamatLengkap || <span className="text-gray-500 italic">Belum diisi</span>}</p>
                                       </div>
                                       <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                          <div>
                                             {userClaims.length > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-[11px] font-bold">
                                                   ✓ {userClaims.length} claim
                                                </span>
                                             ) : (
                                                <span className="text-gray-500 italic text-[11px]">Belum ada claim</span>
                                             )}
                                          </div>
                                          <div className="flex gap-1.5">
                                             <button onClick={() => setViewingKonsumen(k)} className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition">👁 View</button>
                                             <GradientActionBtn onClick={() => openModal('edit', 'konsumen', k)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                             {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                <GradientActionBtn onClick={() => handleDelete('konsumen', k.nomor_wa)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
                  );
                  })()}
               {/* ======================= PROMOS ======================= */}
               {activeTab === 'promos' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <input type="text" title="Cari Promo" aria-label="Cari Promo" placeholder="🔍 Cari Nama Promo atau Periode Tanggal..." value={searchPromo} onChange={e => setSearchPromo(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
                     {viewMode === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {sortedPromos.map((p: Promosi) => {
                              return (
                                 <div key={p.id_promo} className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
                                    <div className="flex justify-between items-start border-b border-gray-100 pb-3 mb-3">
                                       <div>
                                          <h3 className="font-bold text-lg text-slate-800">{p.nama_promo}</h3>
                                          <div className="text-sm font-bold text-gray-500 mt-1">📅 {p.tanggal_mulai} s/d {p.tanggal_selesai}</div>
                                       </div>
                                       <span className={`px-2 py-1 rounded text-[10px] font-extrabold tracking-wide ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
                                    </div>
                                    <div className="flex-1">
                                       <h4 className="font-bold text-gray-700 text-sm mb-2">Tipe Produk Berlaku ({p.tipe_produk?.length || 0})</h4>
                                       {(!p.tipe_produk || p.tipe_produk.length === 0) ? (
                                          <p className="text-xs font-bold text-gray-400 italic">Belum ada produk</p>
                                       ) : (
                                          <div className="space-y-2 max-h-37.5 overflow-y-auto pr-2">
                                             {p.tipe_produk.map((prod, idx) => (
                                                <div key={idx} className="text-xs p-2 bg-gray-50 border border-gray-100 rounded-md font-bold text-gray-700 flex items-center gap-2">
                                                   <span className="w-1.5 h-1.5 rounded-md bg-blue-500 block"></span>{prod.nama_produk}
                                                </div>
                                             ))}
                                          </div>
                                       )}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                                       <GradientActionBtn onClick={() => openModal('edit', 'promo', p)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                       {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                          <GradientActionBtn onClick={() => handleDelete('promo', p.id_promo!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                       )}
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                 <tr><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'nama_promo')}>Nama Promo {sortConfigPromos.column === 'nama_promo' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'tanggal_mulai')}>Periode {sortConfigPromos.column === 'tanggal_mulai' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'status_aktif')}>Status {sortConfigPromos.column === 'status_aktif' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Produk Berlaku</th><th className="px-4 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {sortedPromos.map((p: Promosi) => (
                                    <tr key={p.id_promo} className="hover:bg-gray-50 font-medium">
                                       <td className="px-4 py-3 font-bold">{p.nama_promo}</td>
                                       <td className="px-4 py-3">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                                       <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-extrabold tracking-wide ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span></td>
                                       <td className="px-4 py-3 text-xs whitespace-normal">{(p.tipe_produk || []).map(tp => tp.nama_produk).join(', ')}</td>
                                       <td className="px-4 py-3"><div className="flex gap-1.5 items-center"><GradientActionBtn onClick={() => openModal('edit', 'promo', p)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />{(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && <GradientActionBtn onClick={() => handleDelete('promo', p.id_promo!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />}</div></td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= CLAIMS ======================= */}
               {activeTab === 'claims' && (
                  <ClaimsTab
                     claims={claims} setClaims={setClaims}
                     sortedClaims={sortedClaims}
                     searchClaim={searchClaim} setSearchClaim={setSearchClaim}
                     filterStatusWarna={filterStatusWarna} setFilterStatusWarna={setFilterStatusWarna}
                     filterDuplikat={filterDuplikat} setFilterDuplikat={setFilterDuplikat}
                     duplicateClaimIds={duplicateClaimIds}
                     hasActiveColFilters={hasActiveColFilters}
                     setFilterColClaims={setFilterColClaims}
                     claimStatusCounts={claimStatusCounts}
                     viewMode={viewMode}
                     setViewMode={setViewMode}
                     filterColClaims={filterColClaims}
                     setClaimColFilter={setClaimColFilter}
                     claimColOptions={claimColOptions}
                     sortConfigClaims={sortConfigClaims} setSortConfigClaims={setSortConfigClaims}
                     handleSort={handleSort}
                     selectedClaimIds={selectedClaimIds} setSelectedClaimIds={setSelectedClaimIds}
                     claimNumberMap={claimNumberMap}
                     getClaimStatusColor={getClaimStatusColor}
                     getBadgeStyle={getBadgeStyle}
                     getBadgeLabel={getBadgeLabel}
                     consumers={consumers}
                     isGoogleDriveLink={isGoogleDriveLink}
                     openImageViewer={openImageViewer}
                     formatTglBeli={formatTglBeli}
                     formatSubmitDate={formatSubmitDate}
                     getClaimDurationDays={getClaimDurationDays}
                     currentUser={currentUser}
                     sbWrite={sbWrite as (opts: { action: string; table: string; data?: Record<string, unknown>; match?: Record<string, unknown> }) => Promise<unknown>}
                     handlePrintLabelPengiriman={handlePrintLabelPengiriman}
                     consumersList={consumersList}
                     setReturnTab={setReturnTab}
                     setActiveTab={setActiveTab}
                     openModal={openModal as (mode: string, type: string, data?: unknown) => void}
                     handleKirimStatusClaim={handleKirimStatusClaim}
                     setResiModal={setResiModal}
                     setResiModalForm={setResiModalForm}
                     handleDelete={handleDelete as (type: string, id: string) => void}
                     getNamaPromo={getNamaPromo}
                     handleExportCSVClaim={handleExportCSVClaim}
                     handleTandaTerimaCSV={handleTandaTerimaCSV}
                     handleUploadResiCSV={handleUploadResiCSV}
                     resiCsvInputRef={resiCsvInputRef}
                     openValidasiModal={openValidasiModal}
                  />
               )}

               {/* ======================= WARRANTIES ======================= */}
               {activeTab === 'warranties' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     {/* Stat cards — clickable filter */}
                     {(() => {
                        const validCount   = warrantyStatusCounts['Valid'] ?? 0;
                        const belumCount   = warrantyStatusCounts['Belum'] ?? 0;
                        const lainnya      = warranties.length - validCount - belumCount;
                        const statCards = [
                           { key: 'Semua', label: 'Total Garansi', count: warranties.length,  accent: '#6b7280', sub: 'Semua data' },
                           { key: 'Valid', label: 'Valid',          count: validCount,          accent: '#10b981', sub: 'Sudah divalidasi' },
                           { key: 'Belum', label: 'Belum Validasi', count: belumCount,          accent: '#f59e0b', sub: 'Perlu aksi' },
                           { key: '__lain', label: 'Lainnya',       count: lainnya,             accent: '#6366f1', sub: 'Status lain' },
                        ];
                        return (
                           <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                              {statCards.map(s => (
                                 <button key={s.key}
                                    onClick={() => setFilterStatusGaransi(filterStatusGaransi === s.key ? 'Semua' : s.key)}
                                    className={`bg-white rounded-xl p-4 text-left border transition-all hover:shadow-sm ${filterStatusGaransi === s.key ? 'border-gray-300 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}
                                    style={{ borderTop: `3px solid ${s.accent}` }}
                                 >
                                    <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
                                    <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                                    <p className="text-xs mt-1.5 font-medium" style={{ color: s.accent }}>{s.sub}</p>
                                 </button>
                              ))}
                           </div>
                        );
                     })()}
                     {/* Search + quick filter pills */}
                     <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[160px]">
                           <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                           <input type="text" title="Cari Garansi" aria-label="Cari Garansi" placeholder="Cari Nomor Seri..." value={searchGaransi} onChange={e => setSearchGaransi(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 bg-white text-gray-800 rounded-lg outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-xs" />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                           {[
                              { key: 'Semua',  label: 'Semua',          count: warranties.length,                    activeClass: 'bg-gray-700 text-white',     inactiveClass: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
                              { key: 'Valid',  label: 'Valid',           count: warrantyStatusCounts['Valid'] ?? 0,   activeClass: 'bg-emerald-500 text-white',   inactiveClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                              { key: 'Belum',  label: 'Belum Validasi',  count: warrantyStatusCounts['Belum'] ?? 0,  activeClass: 'bg-amber-500 text-white',     inactiveClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                              ...Object.entries(warrantyStatusCounts)
                                 .filter(([k]) => k !== 'Valid' && k !== 'Belum')
                                 .map(([k, v]) => ({ key: k, label: k, count: v, activeClass: 'bg-indigo-500 text-white', inactiveClass: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' })),
                           ].map(p => (
                              <button key={p.key}
                                 onClick={() => setFilterStatusGaransi(filterStatusGaransi === p.key ? 'Semua' : p.key)}
                                 className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition flex items-center gap-1 ${filterStatusGaransi === p.key ? p.activeClass : p.inactiveClass}`}
                              >
                                 {p.label} <span className="font-bold">{p.count}</span>
                              </button>
                           ))}
                        </div>
                     </div>
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
                           <table className="w-full text-sm">
                              <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                 <tr>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">No</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Nama / WA</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'nomor_seri')}>No Seri / Barang {sortConfigWarranties.column === 'nomor_seri' && <span>{sortConfigWarranties.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tgl Beli / Toko</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'jenis_garansi')}>Jenis / Sisa {sortConfigWarranties.column === 'jenis_garansi' && <span>{sortConfigWarranties.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'status_validasi')}>Status {sortConfigWarranties.column === 'status_validasi' && <span>{sortConfigWarranties.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {sortedWarranties.map((w: Garansi) => {
                                    const linked = claims.find((c: ClaimPromo) => c.nomor_seri === w.nomor_seri);
                                    const linkNota = w.link_nota_pembelian || linked?.link_nota_pembelian;
                                    const linkGaransi = w.link_kartu_garansi || linked?.link_kartu_garansi;
                                    const tglBeli = linked?.tanggal_pembelian || w.tanggal_pembelian;
                                    const namaText = w.nama_pendaftar || linked?.nama_pendaftar || '-';
                                    const waText = w.nomor_wa || linked?.nomor_wa || '-';
                                    const tokoText = w.nama_toko || linked?.nama_toko || '-';
                                    const statusColor: Record<string, string> = {
                                       'Valid': 'bg-emerald-100 text-emerald-700',
                                       'Belum': 'bg-amber-100 text-amber-700',
                                       'Menunggu': 'bg-amber-100 text-amber-700',
                                       'Ditolak': 'bg-red-100 text-red-700',
                                    };
                                    const pillClass = statusColor[w.status_validasi] ?? 'bg-gray-100 text-gray-600';
                                    return (
                                       <tr key={w.id_garansi} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-3 py-3 text-center text-xs font-bold text-gray-400">{garansiNumberMap.get(w.id_garansi!)}</td>
                                          <td className="px-3 py-3">
                                             <p className="text-sm font-semibold text-gray-900 leading-tight">{namaText}</p>
                                             <p className="text-xs text-gray-400 mt-0.5">{waText}</p>
                                          </td>
                                          <td className="px-3 py-3">
                                             <p className="font-mono font-bold text-sm text-gray-900">{w.nomor_seri}</p>
                                             <p className="text-xs text-gray-500 mt-0.5">{w.tipe_barang}</p>
                                          </td>
                                          <td className="px-3 py-3">
                                             <p className="text-xs text-gray-700">{tglBeli || '-'}</p>
                                             <p className="text-xs text-gray-400 mt-0.5">{tokoText}</p>
                                          </td>
                                          <td className="px-3 py-3">
                                             <p className="text-xs font-semibold text-gray-700">{w.jenis_garansi || '-'}</p>
                                             <p className="text-xs text-gray-400 mt-0.5">{calculateSisaGaransi(tglBeli ?? undefined, w.lama_garansi)}</p>
                                          </td>
                                          <td className="px-3 py-3">
                                             <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${pillClass}`}>{w.status_validasi}</span>
                                          </td>
                                          <td className="px-3 py-3">
                                             <div className="flex flex-col gap-1.5">
                                                <div className="flex gap-1.5">
                                                   {linkNota && (
                                                      <GradientActionBtn onClick={() => openImageViewer(linkNota as string)} label="Nota" gradientFrom="#3B82F6" gradientTo="#06B6D4" icon={IconDoc} />
                                                   )}
                                                   {linkGaransi && (
                                                      <GradientActionBtn onClick={() => openImageViewer(linkGaransi as string)} label="Garansi" gradientFrom="#8B5CF6" gradientTo="#A78BFA" icon={IconShield} />
                                                   )}
                                                </div>
                                                <div className="flex gap-1.5">
                                                   <GradientActionBtn onClick={() => openModal('edit', 'warranty', w)} label="Edit" gradientFrom="#3B82F6" gradientTo="#60A5FA" icon={IconEdit} />
                                                   <GradientActionBtn onClick={() => handleKirimStatusGaransi(w)} label="Kirim" gradientFrom="#10B981" gradientTo="#34D399" icon={IconSend} />
                                                   {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                      <GradientActionBtn onClick={() => handleDelete('warranty', w.id_garansi!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                                   )}
                                                </div>
                                             </div>
                                          </td>
                                       </tr>
                                    )
                                 })}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {sortedWarranties.map((w: Garansi) => {
                              const linked = claims.find((c: ClaimPromo) => c.nomor_seri === w.nomor_seri);
                              const linkNota = w.link_nota_pembelian || linked?.link_nota_pembelian;
                              const linkGaransi = w.link_kartu_garansi || linked?.link_kartu_garansi;
                              const tglBeli = linked?.tanggal_pembelian || w.tanggal_pembelian;
                              const namaText = w.nama_pendaftar || linked?.nama_pendaftar || '-';
                              const waText = w.nomor_wa || linked?.nomor_wa || '-';
                              const tokoText = w.nama_toko || linked?.nama_toko || '-';
                              const statusColor: Record<string, string> = {
                                 'Valid': 'bg-emerald-100 text-emerald-700',
                                 'Belum': 'bg-amber-100 text-amber-700',
                                 'Menunggu': 'bg-amber-100 text-amber-700',
                                 'Ditolak': 'bg-red-100 text-red-700',
                              };
                              const pillClass = statusColor[w.status_validasi] ?? 'bg-gray-100 text-gray-600';
                              return (
                                 <div key={w.id_garansi} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col gap-3">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-2">
                                       <div>
                                          <p className="font-semibold text-gray-900 text-sm">{namaText}</p>
                                          <p className="text-xs text-gray-400">{waText}</p>
                                       </div>
                                       <span className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-bold ${pillClass}`}>{w.status_validasi}</span>
                                    </div>
                                    {/* No Seri + Barang */}
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                       <p className="font-mono font-bold text-sm text-gray-900">{w.nomor_seri}</p>
                                       <p className="text-xs text-gray-500 mt-0.5">{w.tipe_barang}</p>
                                    </div>
                                    {/* Detail */}
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                                       <div><span className="text-gray-400 block">Tgl Beli</span><span className="font-semibold text-gray-700">{tglBeli || '-'}</span></div>
                                       <div><span className="text-gray-400 block">Toko</span><span className="font-semibold text-gray-700">{tokoText}</span></div>
                                       <div><span className="text-gray-400 block">Jenis</span><span className="font-semibold text-gray-700">{w.jenis_garansi || '-'}</span></div>
                                       <div><span className="text-gray-400 block">Sisa</span><span className="font-semibold text-gray-700">{calculateSisaGaransi(tglBeli ?? undefined, w.lama_garansi)}</span></div>
                                    </div>
                                    {/* Lampiran */}
                                    {(linkNota || linkGaransi) && (
                                       <div className="flex gap-1.5">
                                          {linkNota && <GradientActionBtn onClick={() => openImageViewer(linkNota as string)} label="Nota" gradientFrom="#3B82F6" gradientTo="#06B6D4" icon={IconDoc} />}
                                          {linkGaransi && <GradientActionBtn onClick={() => openImageViewer(linkGaransi as string)} label="Garansi" gradientFrom="#8B5CF6" gradientTo="#A78BFA" icon={IconShield} />}
                                       </div>
                                    )}
                                    {/* Aksi */}
                                    <div className="pt-2 border-t border-gray-100 flex gap-1.5 justify-end">
                                       <GradientActionBtn onClick={() => openModal('edit', 'warranty', w)} label="Edit" gradientFrom="#3B82F6" gradientTo="#60A5FA" icon={IconEdit} />
                                       <GradientActionBtn onClick={() => handleKirimStatusGaransi(w)} label="Kirim" gradientFrom="#10B981" gradientTo="#34D399" icon={IconSend} />
                                       {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                          <GradientActionBtn onClick={() => handleDelete('warranty', w.id_garansi!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                       )}
                                    </div>
                                 </div>
                              )
                           })}
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= SERVICES ======================= */}
               {activeTab === 'services' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <input type="text" title="Cari Service" aria-label="Cari Service" placeholder="🔍 Cari No Tanda Terima / No Seri / Status..." value={searchService} onChange={e => setSearchService(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                 <tr><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'nomor_tanda_terima')}>No Tanda Terima {sortConfigServices.column === 'nomor_tanda_terima' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'nomor_seri')}>No Seri Barang {sortConfigServices.column === 'nomor_seri' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'status_service')}>Status Service {sortConfigServices.column === 'status_service' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'created_at')}>Tgl Update {sortConfigServices.column === 'created_at' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {sortedServices.map((s: StatusService) => (
                                    <tr key={s.id_service} className="hover:bg-gray-50 font-medium">
                                       <td className="px-3 py-2.5font-mono font-bold text-slate-800">{s.nomor_tanda_terima}</td>
                                       <td className="px-6 py-3">{s.nomor_seri}</td>
                                       <td className="px-6 py-3">
                                          <span className="px-2 py-1 rounded text-[10px] tracking-wide font-extrabold bg-blue-100 text-blue-800 uppercase">{s.status_service}</span>
                                       </td>
                                       <td className="px-3 py-2.5font-bold text-gray-500">{s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}</td>
                                       <td className="px-3 py-2.5">
                                          <div className="flex gap-1.5">
                                             <GradientActionBtn onClick={() => openModal('edit', 'service', s)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                             {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                <GradientActionBtn onClick={() => handleDelete('service', s.id_service!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                             )}
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                           {sortedServices.map((s: StatusService) => (
                              <div key={s.id_service} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
                                 <div className="border-b border-gray-100 pb-3 mb-3">
                                    <h3 className="font-bold text-base text-slate-800 font-mono">{s.nomor_tanda_terima}</h3>
                                    <p className="text-xs text-gray-500">{s.nomor_seri}</p>
                                 </div>
                                 <div className="space-y-2 text-xs flex-1">
                                    <p><span className="font-bold w-20 inline-block">Status:</span> <span className="px-2 py-0.5 rounded text-[10px] tracking-wide font-extrabold bg-blue-100 text-blue-800 uppercase">{s.status_service}</span></p>
                                    <p><span className="font-bold w-20 inline-block">Update:</span> {s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}</p>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                                    <GradientActionBtn onClick={() => openModal('edit', 'service', s)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                       <GradientActionBtn onClick={() => handleDelete('service', s.id_service!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                    )}
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= PROPOSAL EVENT ======================= */}
               {activeTab === 'budgets' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     {/* Stat cards */}
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {([
                           { label: 'Total Proposal', count: budgets.length, color: 'text-gray-900', bar: 'bg-gray-400' },
                           { label: 'Total Anggaran', count: `Rp ${budgets.reduce((s,b) => s + Number(b.total_cost||0), 0).toLocaleString('id-ID')}`, color: 'text-blue-700', bar: 'bg-blue-500', isText: true },
                           { label: 'Rerata / Proposal', count: budgets.length ? `Rp ${Math.round(budgets.reduce((s,b) => s + Number(b.total_cost||0), 0) / budgets.length).toLocaleString('id-ID')}` : 'Rp 0', color: 'text-amber-700', bar: 'bg-amber-400', isText: true },
                        ] as { label: string; count: number | string; color: string; bar: string; isText?: boolean }[]).map(s => (
                           <div key={s.label} className="bg-white rounded-xl p-3 border-2 border-gray-200 shadow-sm">
                              <div className={`w-full h-1 rounded-md mb-2 ${s.bar}`}></div>
                              <p className={`${s.isText ? 'text-base' : 'text-2xl'} font-black ${s.color}`}>{s.count}</p>
                              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-0.5">{s.label}</p>
                           </div>
                        ))}
                     </div>
                     <input type="text" title="Cari Proposal" aria-label="Cari Proposal" placeholder="🔍 Cari Title Proposal..." value={searchBudget} onChange={e => setSearchBudget(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
                           <table className="w-full text-sm">
                              <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                 <tr>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'proposal_no')}>Proposal No {sortConfigBudgets.column === 'proposal_no' && <span className="text-xs">{sortConfigBudgets.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'title')}>Judul {sortConfigBudgets.column === 'title' && <span className="text-xs">{sortConfigBudgets.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'period')}>Periode {sortConfigBudgets.column === 'period' && <span className="text-xs">{sortConfigBudgets.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'total_cost')}>Total Biaya {sortConfigBudgets.column === 'total_cost' && <span className="text-xs">{sortConfigBudgets.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {sortedBudgets.map((b: BudgetApproval) => (
                                    <tr key={b.id_budget} className="hover:bg-gray-50 transition-colors">
                                       <td className="px-3 py-2.5 font-mono font-bold text-slate-800 text-xs">{b.proposal_no}</td>
                                       <td className="px-3 py-2.5 font-bold text-sm">{b.title}</td>
                                       <td className="px-3 py-2.5 text-xs text-gray-700">{b.period}</td>
                                       <td className="px-3 py-2.5 text-xs font-bold text-gray-800">Rp {Number(b.total_cost).toLocaleString('id-ID')}</td>
                                       <td className="px-3 py-2.5">
                                          <div className="flex flex-col gap-1.5">
                                             <div className="flex gap-1.5">
                                                <GradientActionBtn onClick={() => openModal('edit', 'budget', b)} label="Edit" gradientFrom="#3B82F6" gradientTo="#60A5FA" icon={IconEdit} />
                                                <GradientActionBtn onClick={() => setPrintData(b)} label="Print" gradientFrom="#10B981" gradientTo="#34D399" icon={IconPrint} />
                                                {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                   <GradientActionBtn onClick={() => handleDelete('budget', b.id_budget!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                                )}
                                             </div>
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {sortedBudgets.map((b: BudgetApproval) => (
                              <div key={b.id_budget} className="bg-white rounded-lg shadow-sm border-2 border-gray-100 flex flex-col hover:border-[#FFE500] transition overflow-hidden">
                                 {b.event_image
                                    // eslint-disable-next-line @next/next/no-img-element
                                    ? <img src={driveImgSrc(b.event_image)} alt="poster" className="w-full h-32 object-cover" />
                                    : <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-gray-300">
                                         <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      </div>
                                 }
                                 <div className="p-4 flex flex-col flex-1">
                                 <div className="border-b border-gray-100 pb-3 mb-3">
                                    <h3 className="font-bold text-base text-slate-800">{b.title}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{b.proposal_no}</p>
                                 </div>
                                 <div className="space-y-2 text-xs flex-1">
                                    <p><span className="font-bold w-20 inline-block">Periode:</span> {b.period}</p>
                                    <p><span className="font-bold w-20 inline-block">Total:</span> Rp {Number(b.total_cost).toLocaleString('id-ID')}</p>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                                    <GradientActionBtn onClick={() => openModal('edit', 'budget', b)} label="Edit" gradientFrom="#3B82F6" gradientTo="#60A5FA" icon={IconEdit} />
                                    <GradientActionBtn onClick={() => setPrintData(b)} label="Print" gradientFrom="#10B981" gradientTo="#34D399" icon={IconPrint} />
                                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                       <GradientActionBtn onClick={() => handleDelete('budget', b.id_budget!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                    )}
                                 </div>
                                 </div>{/* /p-4 */}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= PROMO DATACOLOR ======================= */}
               {activeTab === 'promo_datacolor' && (
                  <PromoDatacolorTab currentUser={currentUser} />
               )}

               {/* ======================= KLAIM BIAYA ======================= */}
               {activeTab === 'expense_claim' && (
                  <ExpenseClaimTab currentUser={currentUser} />
               )}

               {/* ======================= UPLOAD FILE RESI ======================= */}
               {activeTab === 'resi' && (
                  <ResiTab currentUser={currentUser} />
               )}

               {/* ======================= LENDING FILTER HEADER ======================= */}
               {activeTab === 'lending' && (
                  <LendingTab
                     lendingRecords={lendingRecords}
                     sortedLendingRecords={sortedLendingRecords}
                     searchLending={searchLending}
                     setSearchLending={setSearchLending}
                     viewMode={viewMode as 'table' | 'card'}
                     setViewMode={v => setViewMode(v)}
                     sortConfigLending={sortConfigLending}
                     setSortConfigLending={setSortConfigLending}
                     handleSort={handleSort}
                     openModal={openModal as (mode: string, type: string, data?: unknown) => void}
                     openImageViewer={openImageViewer}
                     handleDelete={handleDelete as (type: string, id: string) => void}
                     handlePrintPeminjamanPDF={handlePrintPeminjamanPDF}
                     proxyImg={proxyImg}
                  />
               )}

               
               {/* ======================= REPORT EVENT ======================= */}
               {activeTab === 'eventreport' && (
                  <div className="animate-fade-in">
                     <EventReport eventsData={events} />
                  </div>
               )}

               {/* ======================= EVENT REGISTRATIONS ======================= */}
               {activeTab === 'eventregistrations' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     {/* Event name filter pills + stat cards */}
                     {(() => {
                        // Unique event names with counts
                        const eventCounts: Record<string, number> = {};
                        eventRegistrations.forEach(r => {
                           const n = r.event_name || '-';
                           eventCounts[n] = (eventCounts[n] || 0) + 1;
                        });
                        const eventNames = Object.keys(eventCounts).sort();

                        // Filtered registrations
                        const filtered = eventRegistrations.filter(r => {
                           const matchEvent = filterRegEventName === 'Semua' || r.event_name === filterRegEventName;
                           const q = searchRegistration.toLowerCase();
                           const matchSearch = !q || (r.full_name || r.nama_lengkap || '').toLowerCase().includes(q) || (r.event_name || '').toLowerCase().includes(q);
                           return matchEvent && matchSearch;
                        });
                        const confirmed = filtered.filter(r => r.status_pendaftaran === 'terdaftar').length;
                        const pending   = filtered.filter(r => r.status_pendaftaran === 'menunggu_validasi').length;
                        const hadir     = filtered.filter(r => r.is_attended).length;

                        return (
                           <>
                              {/* Filter dropdown + pills */}
                              <div className="flex flex-wrap items-center gap-2">
                                 <select
                                    value={filterRegEventName}
                                    onChange={e => setFilterRegEventName(e.target.value)}
                                    aria-label="Filter nama event"
                                    className="py-2 px-3 border border-gray-200 bg-white text-gray-700 rounded-lg outline-none focus:border-[#FFE500] text-xs font-medium max-w-xs"
                                 >
                                    <option value="Semua">Semua Event ({eventRegistrations.length})</option>
                                    {eventNames.map(n => (
                                       <option key={n} value={n}>{n} ({eventCounts[n]})</option>
                                    ))}
                                 </select>
                                 <div className="flex flex-wrap gap-1.5">
                                    {eventNames.map(n => (
                                       <button key={n}
                                          onClick={() => setFilterRegEventName(filterRegEventName === n ? 'Semua' : n)}
                                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition whitespace-nowrap ${filterRegEventName === n ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                                       >
                                          {n} <span className="font-bold">{eventCounts[n]}</span>
                                       </button>
                                    ))}
                                 </div>
                              </div>

                              {/* Stat cards — reflect filtered data */}
                              <div className="grid grid-cols-4 gap-2">
                                 {([
                                    { label: 'Total Peserta', count: filtered.length,  accent: '#6b7280' },
                                    { label: 'Terdaftar',     count: confirmed,          accent: '#10b981' },
                                    { label: 'Menunggu',      count: pending,            accent: '#f59e0b' },
                                    { label: 'Hadir',         count: hadir,              accent: '#3b82f6' },
                                 ] as { label: string; count: number; accent: string }[]).map(s => (
                                    <div key={s.label} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm" style={{ borderTop: `3px solid ${s.accent}` }}>
                                       <p className="text-xs text-gray-400 font-medium mb-1">{s.label}</p>
                                       <p className="text-2xl font-bold text-gray-900">{s.count}</p>
                                    </div>
                                 ))}
                              </div>

                              {/* Search */}
                              <div className="relative">
                                 <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                 <input type="text" title="Cari Peserta" aria-label="Cari Peserta" placeholder="Cari nama peserta..." value={searchRegistration} onChange={e => setSearchRegistration(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 bg-white text-gray-800 rounded-lg outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-xs" />
                              </div>
                           </>
                        );
                     })()}
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
                           <table className="w-full text-sm">
                              <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                 <tr>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700">Nama Lengkap</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700">Kontak</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700">Event</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Kehadiran</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Bukti TF</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {eventRegistrations.filter(r => {
                                    const q = searchRegistration.toLowerCase();
                                    const nama = (r.full_name || r.nama_lengkap || '').toLowerCase();
                                    const evt = (r.event_name || '').toLowerCase();
                                    const matchSearch = nama.includes(q) || evt.includes(q);
                                    const matchEvent = filterRegEventName === 'Semua' || r.event_name === filterRegEventName;
                                    return matchSearch && matchEvent;
                                 }).map((reg: EventRegistration) => {
                                    const isConfirmed = reg.status_pendaftaran === 'terdaftar' || reg.status === 'Confirmed';
                                    const isCancelled = reg.status_pendaftaran === 'ditolak' || reg.status === 'Cancelled';
                                    return (
                                    <tr key={reg.id} className={`border-l-4 ${isConfirmed ? 'border-l-green-500' : isCancelled ? 'border-l-red-400' : 'border-l-orange-400'} hover:bg-gray-50 transition-colors`}>
                                       <td className="px-3 py-2.5">
                                          <p className="font-bold text-slate-800">{reg.full_name || reg.nama_lengkap || '-'}</p>
                                          <p className="text-[10px] text-gray-500">{reg.camera_model || reg.tipe_kamera || '-'}</p>
                                       </td>
                                       <td className="px-3 py-2.5">
                                          <p className="text-xs font-mono">{reg.wa_number || reg.nomor_wa || '-'}</p>
                                          <p className="text-[10px] text-gray-500">{reg.email}</p>
                                       </td>
                                       <td className="px-3 py-2.5 text-xs font-bold text-amber-700">{reg.event_name}</td>
                                       <td className="px-3 py-2.5 text-center">
                                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${isConfirmed ? 'bg-green-100 text-green-700' : isCancelled ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                                             {reg.status_pendaftaran || reg.status || '-'}
                                          </span>
                                       </td>
                                       <td className="px-3 py-2.5 text-center">
                                          {reg.is_attended
                                             ? <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-1 rounded">HADIR ✅</span>
                                             : <GradientActionBtn onClick={() => handleMarkAttendance(reg.id!)} label="Hadir" gradientFrom="#10B981" gradientTo="#34D399" icon={IconCheck} />}
                                       </td>
                                       <td className="px-3 py-2.5 text-center">
                                          {reg.bukti_transfer_url
                                             ? <a href={reg.bukti_transfer_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-[11px] font-bold">📎 Lihat</a>
                                             : <span className="text-gray-400 text-[11px]">-</span>}
                                       </td>
                                       <td className="px-3 py-2.5">
                                          <div className="flex flex-col gap-1.5">
                                             <div className="flex gap-1.5">
                                                {isConfirmed && <GradientActionBtn onClick={() => handleSendEventSuccessWA(reg)} label="Kirim WA" gradientFrom="#25D366" gradientTo="#128C7E" icon={IconSend} />}
                                                {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                   <GradientActionBtn onClick={() => handleDelete('eventregistration', reg.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                                )}
                                             </div>
                                          </div>
                                       </td>
                                    </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     ) : (<div></div>)}
                  </div>
               )}

               {/* ======================= MASTER EVENT ======================= */}
               {activeTab === 'events' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     {/* Stat cards */}
                     {(() => {
                        const aktifEvents = events.filter(e => { const { closed } = getEventClosedStatus(e, eventRegistrationsCount[e.title] || 0); return !closed; }).length;
                        const totalPeserta = Object.values(eventRegistrationsCount).reduce((s, v) => s + v, 0);
                        return (
                           <div className="grid grid-cols-3 gap-2">
                              {([
                                 { label: 'Total Event', count: events.length, color: 'text-gray-900', bar: 'bg-gray-400' },
                                 { label: 'Aktif / Open', count: aktifEvents, color: 'text-green-700', bar: 'bg-green-500' },
                                 { label: 'Total Peserta', count: totalPeserta, color: 'text-blue-700', bar: 'bg-blue-500' },
                              ] as { label: string; count: number; color: string; bar: string }[]).map(s => (
                                 <div key={s.label} className="bg-white rounded-xl p-3 border-2 border-gray-200 shadow-sm">
                                    <div className={`w-full h-1 rounded-md mb-2 ${s.bar}`}></div>
                                    <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500 mt-0.5">{s.label}</p>
                                 </div>
                              ))}
                           </div>
                        );
                     })()}
                     {/* Quick links event */}
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {([
                           { href: '/events/register', label: 'Daftar Event', sub: 'Halaman publik', bg: 'bg-yellow-50', ic: 'bg-yellow-100', svg: <svg className="w-4 h-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/></svg> },
                           { href: '/nikon/upload-lomba', label: 'Upload Foto Lomba', sub: 'Halaman publik', bg: 'bg-blue-50', ic: 'bg-blue-100', svg: <svg className="w-4 h-4 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg> },
                           { href: '/admin/events', label: 'Validasi Pembayaran', sub: 'Admin panel', bg: 'bg-green-50', ic: 'bg-green-100', svg: <svg className="w-4 h-4 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> },
                           { href: '/admin/events/attendance', label: 'Absensi Event', sub: 'Scan QR', bg: 'bg-purple-50', ic: 'bg-purple-100', svg: <svg className="w-4 h-4 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/></svg> },
                        ] as { href: string; label: string; sub: string; bg: string; ic: string; svg: React.ReactNode }[]).map(link => (
                           <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                              className={`flex items-center gap-2.5 ${link.bg} border border-transparent hover:border-[#FFE500] hover:shadow-sm rounded-xl px-3 py-2.5 transition-all group`}>
                              <div className={`${link.ic} w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}>{link.svg}</div>
                              <div className="min-w-0">
                                 <p className="text-xs font-bold text-gray-800 group-hover:text-black truncate leading-tight">{link.label}</p>
                                 <p className="text-[10px] text-gray-400 truncate">{link.sub}</p>
                              </div>
                           </a>
                        ))}
                     </div>
                     <input type="text" title="Cari Event" aria-label="Cari Event" placeholder="🔍 Cari Judul Event..." value={searchEvent} onChange={e => setSearchEvent(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
                           <table className="w-full text-sm">
                              <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                 <tr>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-10">No</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Poster</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigEvents, setSortConfigEvents, 'title')}>Judul Event {sortConfigEvents.column === 'title' && <span className="text-xs">{sortConfigEvents.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-800" onClick={() => handleSort(sortConfigEvents, setSortConfigEvents, 'date')}>Tanggal {sortConfigEvents.column === 'date' && <span className="text-xs">{sortConfigEvents.direction === 'asc' ? '↑' : '↓'}</span>}</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700">Detail</th>
                                    <th className="px-3 py-3 text-left font-bold text-gray-700">Harga</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Pendaftaran</th>
                                    <th className="px-3 py-3 text-center font-bold text-gray-700">Kuota / Status</th>
                                    <th className="px-3 py-3 text-center font-bold text-gray-700">Peserta</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {sortedEvents.map((evt: EventData) => {
                                    const { closed, reason } = getEventClosedStatus(evt, eventRegistrationsCount[evt.title] || 0);
                                    return (
                                    <tr key={evt.id} className={`border-l-4 ${closed ? 'border-l-red-400' : 'border-l-green-500'} hover:bg-gray-50 transition-colors`}>
                                       <td className="px-3 py-2.5 text-center font-bold text-gray-500 text-xs">{eventNumberMap.get(evt.id!)}</td>
                                       <td className="px-3 py-2.5 text-center">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={driveImgSrc(evt.image)} alt="poster" className="w-10 h-14 object-cover rounded shadow-sm mx-auto" />
                                       </td>
                                       <td className="px-3 py-2.5 font-bold text-slate-800">{evt.title}</td>
                                       <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">{evt.date}</td>
                                       <td className="px-3 py-2.5 text-xs text-gray-600">{evt.detail_acara || '-'}</td>
                                       <td className="px-3 py-2.5 text-xs font-bold text-gray-800 whitespace-nowrap">{evt.price}</td>
                                       <td className="px-3 py-2.5 text-xs">
                                          {(() => {
                                             const today = new Date(); today.setHours(0,0,0,0);
                                             const todayStr = today.toISOString().slice(0,10);
                                             // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                             const ef = evt as any;
                                             const display = ef.display_start_date  ? new Date(ef.display_start_date)  : null;
                                             const open    = ef.registration_open_date  ? new Date(ef.registration_open_date)  : null;
                                             const close   = ef.registration_close_date ? new Date(ef.registration_close_date) : null;
                                             const fmt = (d: Date) => d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', timeZone:'Asia/Jakarta' });
                                             const bannerVisible = (!display || display <= today) && (!close || close >= today);
                                             const regOpen = bannerVisible && (!open || todayStr >= ef.registration_open_date);
                                             return (
                                                <div className="space-y-0.5">
                                                   {display && <p className="text-gray-500"><span className="font-semibold text-gray-700">Tampil:</span> {fmt(display)}</p>}
                                                   {open    && <p className="text-gray-500"><span className="font-semibold text-gray-700">Daftar:</span> {fmt(open)}</p>}
                                                   {close   && <p className="text-gray-500"><span className="font-semibold text-gray-700">Tutup:</span> {fmt(close)}</p>}
                                                   {!display && !open && !close && <span className="text-gray-400 italic">Tidak diatur</span>}
                                                   <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${bannerVisible ? (regOpen ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700') : 'bg-gray-100 text-gray-500'}`}>
                                                      {bannerVisible ? (regOpen ? '✓ Daftar Terbuka' : '⏳ Segera Daftar') : '✗ Tersembunyi'}
                                                   </span>
                                                </div>
                                             );
                                          })()}
                                       </td>
                                       <td className="px-3 py-2.5 text-center">
                                          <p className="font-bold text-gray-700 text-xs">{eventRegistrationsCount[evt.title] || 0}/{evt.stock} slot</p>
                                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${closed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{reason}</span>
                                       </td>
                                       <td className="px-3 py-2.5 text-center font-bold text-blue-600 text-sm">{eventRegistrationsCount[evt.title] || 0}</td>
                                       <td className="px-3 py-2.5">
                                          <div className="flex gap-1.5">
                                             <GradientActionBtn onClick={() => openModal('edit', 'event', evt)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                             {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                <GradientActionBtn onClick={() => handleDelete('events', evt.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                             )}
                                          </div>
                                       </td>
                                    </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {sortedEvents.map((evt: EventData) => {
                              const detailPreview = evt.detail_acara ? (evt.detail_acara.length > 100 ? evt.detail_acara.substring(0, 100) + '...' : evt.detail_acara) : '-';
                              const { closed: evtClosed, reason: evtReason } = getEventClosedStatus(evt, eventRegistrationsCount[evt.title] || 0);
                              return (
                              <div key={evt.id} className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] hover:shadow-md transition overflow-hidden">
                                 {/* Full-width poster image */}
                                 <div className="relative w-full h-52 bg-gray-100 shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={driveImgSrc(evt.image)} alt="poster" className="w-full h-full object-cover" />
                                    <span className="absolute top-2 left-2 font-bold text-sm text-gray-700 bg-white/90 rounded-md w-7 h-7 flex items-center justify-center shadow-sm">{eventNumberMap.get(evt.id!)}</span>
                                    <span className={`absolute top-2 right-2 text-[10px] uppercase font-bold px-2 py-0.5 rounded ${evtClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{evtClosed ? evtReason : 'Aktif'}</span>
                                 </div>
                                 <div className="p-4 flex flex-col flex-1">
                                    <div className="border-b border-gray-100 pb-2 mb-3">
                                       <h3 className="font-bold text-base text-slate-800 leading-tight">{evt.title}</h3>
                                       <p className="text-xs text-gray-500 mt-0.5">{evt.date}</p>
                                    </div>
                                 <div className="space-y-2 text-xs flex-1">
                                    <p><span className="font-bold w-20 inline-block">Detail:</span> {detailPreview}</p>
                                    <p><span className="font-bold w-20 inline-block">Harga:</span> {evt.price}</p>
                                    <p><span className="font-bold w-20 inline-block">Kuota:</span> {eventRegistrationsCount[evt.title] || 0}/{evt.stock} slot</p>
                                    <p><span className="font-bold w-20 inline-block">Peserta:</span> {eventRegistrationsCount[evt.title] || 0} orang</p>
                                    {evt.bank_info && <p className="bg-blue-50 border border-blue-100 rounded p-2 mt-2"><span className="font-bold">Rekening:</span> {evt.bank_info}</p>}
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                                    <GradientActionBtn onClick={() => openModal('edit', 'event', evt)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                       <GradientActionBtn onClick={() => handleDelete('events', evt.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                    )}
                                 </div>
                                 </div>{/* end p-4 inner */}
                              </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= BARANG ASET ======================= */}
               {activeTab === 'assets' && (() => {
                  const filteredAssets = assets.filter(a =>
                     a.nama_barang_aset?.toLowerCase().includes(searchAssets.toLowerCase()) ||
                     a.no_seri_aset?.toLowerCase().includes(searchAssets.toLowerCase()) ||
                     a.catatan?.toLowerCase().includes(searchAssets.toLowerCase())
                  );
                  return (
                     <div className="space-y-4 animate-fade-in text-gray-900">
                        <div className="flex flex-col md:flex-row gap-2 items-center">
                           <input type="text" placeholder="🔍 Cari Nama Barang / No Seri / Catatan..." value={searchAssets} onChange={e => setSearchAssets(e.target.value)} className="flex-1 p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
                           <span className="text-sm text-gray-500 font-medium whitespace-nowrap">{filteredAssets.length} barang</span>
                           <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                              <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'table' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>☰ Tabel</button>
                              <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${viewMode === 'card' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}>🪪 Kartu</button>
                           </div>
                           <button onClick={() => openModal('create', 'asset')} className="btn-primary whitespace-nowrap">+ Tambah Aset</button>
                        </div>
                        {viewMode === 'table' ? (
                           <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
                              <table className="w-full text-sm">
                                 <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                    <tr>
                                       <th className="px-4 py-3 text-center font-bold w-12">No</th>
                                       <th className="px-4 py-3 text-left font-bold">Nama Barang</th>
                                       <th className="px-4 py-3 text-left font-bold">No. Seri</th>
                                       <th className="px-4 py-3 text-left font-bold">Accessories</th>
                                       <th className="px-4 py-3 text-left font-bold">Catatan</th>
                                       <th className="px-4 py-3 text-left font-bold">Aksi</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                    {filteredAssets.map((a, idx) => {
                                       const accs = [a.accs1, a.accs2, a.accs3, a.accs4, a.accs5, a.accs6, a.accs7].filter(Boolean);
                                       return (
                                          <tr key={a.id || idx} className="hover:bg-gray-50 font-medium">
                                             <td className="px-4 py-3 text-center text-gray-500 font-bold">{idx + 1}</td>
                                             <td className="px-4 py-3 font-bold text-slate-800">{a.nama_barang_aset}</td>
                                             <td className="px-4 py-3 font-mono text-sm">{a.no_seri_aset || '-'}</td>
                                             <td className="px-4 py-3 text-xs text-gray-600">{accs.length > 0 ? accs.join(', ') : '-'}</td>
                                             <td className="px-4 py-3 text-xs text-gray-600">{a.catatan || '-'}</td>
                                             <td className="px-4 py-3">
                                                <div className="flex gap-1.5">
                                                   <GradientActionBtn onClick={() => openModal('edit', 'asset', a)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                                   {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                      <GradientActionBtn onClick={() => handleDelete('asset', a.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                                   )}
                                                </div>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                    {filteredAssets.length === 0 && (
                                       <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada data aset.</td></tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        ) : (
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {filteredAssets.length === 0 && <div className="col-span-3 text-center py-16 text-gray-400">Tidak ada data aset.</div>}
                              {filteredAssets.map((a, idx) => {
                                 const accs = [a.accs1, a.accs2, a.accs3, a.accs4, a.accs5, a.accs6, a.accs7].filter(Boolean);
                                 return (
                                    <div key={a.id || idx} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2 hover:border-[#FFE500] hover:shadow-md transition-all">
                                       <div className="flex items-start justify-between gap-2">
                                          <div>
                                             <p className="font-bold text-gray-900 text-sm leading-tight">{a.nama_barang_aset}</p>
                                             {a.no_seri_aset && <p className="font-mono text-xs text-gray-500 mt-0.5">SN: {a.no_seri_aset}</p>}
                                          </div>
                                          <span className="shrink-0 text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">#{idx + 1}</span>
                                       </div>
                                       {accs.length > 0 && (
                                          <div className="flex flex-wrap gap-1 mt-1">
                                             {accs.map((ac, ai) => <span key={ai} className="text-[10px] bg-yellow-50 border border-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-semibold">{ac}</span>)}
                                          </div>
                                       )}
                                       {a.catatan && <p className="text-xs text-gray-500 italic">{a.catatan}</p>}
                                       <div className="mt-auto pt-2 border-t border-gray-100 flex gap-1.5">
                                          <GradientActionBtn onClick={() => openModal('edit', 'asset', a)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                          {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                             <GradientActionBtn onClick={() => handleDelete('asset', a.id!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                          )}
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        )}
                     </div>
                  );
               })()}

               {/* ======================= BOT SETTINGS ======================= */}
               {activeTab === 'botsettings' && (
                  <BotSettingsTab
                     botSettings={botSettings}
                     currentUser={currentUser}
                     qrShortcut={qrShortcut} setQrShortcut={setQrShortcut}
                     qrText={qrText} setQrText={setQrText}
                     fetchBotSettings={fetchBotSettings}
                     notifChannel={notifChannel} saveNotifChannel={saveNotifChannel}
                     notifChannelSaving={notifChannelSaving} notifChannelMsg={notifChannelMsg}
                     telegramChatId={telegramChatId} telegramChatIdInput={telegramChatIdInput}
                     setTelegramChatIdInput={setTelegramChatIdInput}
                     telegramSaving={telegramSaving} telegramMsg={telegramMsg}
                     saveTelegramChatId={saveTelegramChatId}
                     chatbotTemplates={chatbotTemplates} setChatbotTemplates={setChatbotTemplates}
                     chatbotEditValues={chatbotEditValues} setChatbotEditValues={setChatbotEditValues}
                     chatbotSaving={chatbotSaving} setChatbotSaving={setChatbotSaving}
                     saveChatbotTemplate={saveChatbotTemplate}
                     openModal={openModal as (mode: string, type: string, data?: unknown) => void}
                     handleDelete={handleDelete as (type: string, id: string) => void}
                     sbWrite={sbWrite}
                     sbRead={sbRead as <T = unknown>(opts: { table: string; select?: string; filters?: { col: string; op: string; val: unknown }[]; limit?: number }) => Promise<{ data: T[] | null; count: number | null; error: { message: string } | null }>}
                  />
               )}








               {/* ======================= USER ROLE ======================= */}
               {activeTab === 'userrole' && (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <input type="text" title="Cari Karyawan" aria-label="Cari Karyawan" placeholder="🔍 Cari Username atau Nama Karyawan..." value={searchKaryawan} onChange={e => setSearchKaryawan(e.target.value)} className="w-full p-3 border border-gray-200 bg-white text-gray-800 rounded-lg shadow-sm outline-none focus:border-[#FFE500] focus:ring-1 focus:ring-[#FFE500]/30 text-sm" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[72vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-white border-b border-gray-100 sticky top-0 z-10">
                                 <tr><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'username')}>Username {sortConfigKaryawans.column === 'username' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'nama_karyawan')}>Nama Karyawan {sortConfigKaryawans.column === 'nama_karyawan' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'role')}>Role {sortConfigKaryawans.column === 'role' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'status_aktif')}>Status {sortConfigKaryawans.column === 'status_aktif' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Akses Halaman</th><th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                 {sortedKaryawans.map((k: Karyawan) => (
                                    <tr key={k.id_karyawan} className="hover:bg-gray-50 font-medium">
                                       <td className="px-3 py-2.5font-bold text-slate-800">{k.username}</td>
                                       <td className="px-6 py-3">{k.nama_karyawan}</td>
                                       <td className="px-3 py-2.5font-bold text-black">{k.role}</td>
                                       <td className="px-6 py-3">
                                          <span className={`px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${k.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{k.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
                                       </td>
                                       <td className="px-3 py-2.5font-mono text-xs text-gray-600">{(k.role === 'Admin' || k.role === 'Super Admin') ? 'Semua Akses' : (k.akses_halaman || []).join(', ')}</td>
                                       <td className="px-3 py-2.5">
                                          <div className="flex gap-1.5">
                                             <GradientActionBtn onClick={() => openModal('edit', 'karyawan', k)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                             {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                                <GradientActionBtn
                                                   onClick={() => handleQuickResetPassword(k)}
                                                   label="Reset PW"
                                                   gradientFrom="#F59E0B"
                                                   gradientTo="#FBBF24"
                                                   icon={IconKey}
                                                   disabled={resetPwLoadingId === String(k.id_karyawan)}
                                                />
                                             )}
                                             <GradientActionBtn onClick={() => handleDelete('karyawan', k.id_karyawan!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {sortedKaryawans.map((k: Karyawan) => (
                              <div key={k.id_karyawan} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
                                 <div className="border-b border-gray-100 pb-3 mb-3">
                                    <h3 className="font-bold text-base text-slate-800">{k.nama_karyawan}</h3>
                                    <p className="text-xs text-gray-500">{k.username}</p>
                                 </div>
                                 <div className="space-y-2 text-xs flex-1">
                                    <p><span className="font-bold w-20 inline-block">Role:</span> {k.role}</p>
                                    <p><span className="font-bold w-20 inline-block">Status:</span> <span className={`px-2 py-0.5 rounded text-[10px] tracking-wide font-extrabold ${k.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{k.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span></p>
                                    <p><span className="font-bold w-20 inline-block">Akses:</span> {(k.role === 'Admin' || k.role === 'Super Admin') ? 'Semua Akses' : (k.akses_halaman || []).join(', ')}</p>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5 justify-end">
                                    <GradientActionBtn onClick={() => openModal('edit', 'karyawan', k)} label="Edit" gradientFrom="#64748B" gradientTo="#94A3B8" icon={IconEdit} />
                                    {(currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                                       <GradientActionBtn
                                          onClick={() => handleQuickResetPassword(k)}
                                          label="Reset PW"
                                          gradientFrom="#F59E0B"
                                          gradientTo="#FBBF24"
                                          icon={IconKey}
                                          disabled={resetPwLoadingId === String(k.id_karyawan)}
                                       />
                                    )}
                                    <GradientActionBtn onClick={() => handleDelete('karyawan', k.id_karyawan!)} label="Hapus" gradientFrom="#EF4444" gradientTo="#F87171" icon={IconTrash} />
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= SARAN ISIAN (AUTOCOMPLETE) ======================= */}
               {activeTab === 'autocomplete' && (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (() => {
                  const AC_FIELDS = [
                     { key: 'tipe_barang', label: 'Tipe Barang', hint: 'Model kamera, lensa, aksesori' },
                     { key: 'jenis_promosi', label: 'Jenis Promosi', hint: 'Opsi promosi di form claim (dropdown)' },
                     { key: 'nama_toko', label: 'Nama Toko / Dealer', hint: 'Nama toko resmi & tidak resmi' },
                     { key: 'nama_promo', label: 'Nama Promo', hint: 'Nama program promo aktif' },
                     { key: 'speaker', label: 'Speaker Event', hint: 'Nama pembicara event' },
                  ];
                  const activeField = AC_FIELDS.find(f => f.key === acFieldTab) || AC_FIELDS[0];
                  const pinnedItems = autocompleteItems.filter(i => i.field_key === acFieldTab && !i.hidden);
                  const hiddenItems = autocompleteItems.filter(i => i.field_key === acFieldTab && i.hidden);
                  const inTableSet = new Set(autocompleteItems.filter(i => i.field_key === acFieldTab).map(i => i.value));

                  const rawDBMap: Record<string, (string | null | undefined)[]> = {
                     tipe_barang: [...claims.map(c => c.tipe_barang), ...warranties.map(w => w.tipe_barang)],
                     jenis_promosi: claims.map(c => c.jenis_promosi),
                     nama_toko: claims.map(c => c.nama_toko),
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     nama_promo: promos.map((p: any) => p.nama_promo),
                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
                     speaker: events.map((e: any) => e.event_speaker),
                  };
                  const dbOnlyValues = Array.from(new Set((rawDBMap[acFieldTab] || []).filter((v): v is string => {
                     if (typeof v !== 'string' || !v || v === 'BELUM_DIISI') return false;
                     return !inTableSet.has(v);
                  }))).sort();

                  return (
                     <div className="space-y-5 animate-fade-in text-gray-900">
                        <div>
                           <p className="text-sm text-gray-500 mb-3">Kelola saran isian (autocomplete) untuk kolom form. Tambah saran tetap, atau sembunyikan data yang tidak relevan.</p>
                           <div className="flex flex-wrap gap-2">
                              {AC_FIELDS.map(f => (
                                 <button key={f.key} onClick={() => { setAcFieldTab(f.key); setAcNewValue(''); }}
                                    className={`px-4 py-1.5 rounded-md text-sm font-semibold border transition ${acFieldTab === f.key ? 'bg-[#FFE500] border-yellow-400 text-black' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'}`}>
                                    {f.label}
                                 </button>
                              ))}
                           </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-5">
                           <div>
                              <p className="text-xs text-gray-400 mb-1">{activeField.hint}</p>
                              <div className="flex gap-2">
                                 <input
                                    type="text"
                                    aria-label="Tambah saran baru"
                                    placeholder={`Tambah saran untuk ${activeField.label}...`}
                                    value={acNewValue}
                                    onChange={e => setAcNewValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleACAdd(acFieldTab, acNewValue); }}
                                    className="flex-1 p-2.5 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#FFE500]"
                                 />
                                 <button
                                    onClick={() => handleACAdd(acFieldTab, acNewValue)}
                                    disabled={acSaving || !acNewValue.trim()}
                                    className="px-4 py-2 bg-[#FFE500] hover:bg-yellow-400 text-black text-sm font-bold rounded-lg disabled:opacity-40 transition">
                                    {acSaving ? '...' : '+ Tambah'}
                                 </button>
                              </div>
                           </div>

                           {pinnedItems.length > 0 && (
                              <div>
                                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Saran Tetap (ditambahkan admin)</p>
                                 <div className="space-y-1">
                                    {pinnedItems.map(item => (
                                       <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                                          <span className="text-sm font-medium text-gray-800">{item.value}</span>
                                          <button onClick={() => handleACDelete(item.id)} className="text-xs text-red-500 hover:text-red-700 font-semibold shrink-0">Hapus</button>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {dbOnlyValues.length > 0 && (
                              <div>
                                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Dari Data ({dbOnlyValues.length})</p>
                                 <div className="space-y-1 max-h-64 overflow-y-auto">
                                    {dbOnlyValues.map(val => (
                                       <div key={val} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                                          <span className="text-sm text-gray-700">{val}</span>
                                          <div className="flex gap-2 shrink-0">
                                             <button onClick={() => handleACAdd(acFieldTab, val, false)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Pin</button>
                                             <button onClick={() => handleACAdd(acFieldTab, val, true)} className="text-xs text-orange-500 hover:text-orange-700 font-semibold">Sembunyikan</button>
                                          </div>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {hiddenItems.length > 0 && (
                              <div>
                                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Disembunyikan</p>
                                 <div className="space-y-1">
                                    {hiddenItems.map(item => (
                                       <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg opacity-70">
                                          <span className="text-sm line-through text-gray-500">{item.value}</span>
                                          <button onClick={() => handleACDelete(item.id)} className="text-xs text-green-600 hover:text-green-800 font-semibold shrink-0">Tampilkan</button>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}

                           {pinnedItems.length === 0 && dbOnlyValues.length === 0 && hiddenItems.length === 0 && (
                              <p className="text-sm text-gray-400 text-center py-4">Belum ada data untuk kolom ini.</p>
                           )}
                        </div>
                     </div>
                  );
               })()}

               {/* ======================= WA TEMPLATES ======================= */}
               {activeTab === 'wa_templates' && (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (
                  <WaTemplatesTab />
               )}

               {/* ======================= AFFILIATE ======================= */}
               {activeTab === 'affiliate' && (
                  <AffiliateTab
                     affiliates={affiliates}
                     affiliateView={affiliateView}
                     setAffiliateView={setAffiliateView}
                     selectedAffiliate={selectedAffiliate}
                     setSelectedAffiliate={setSelectedAffiliate}
                     affiliateSkema={affiliateSkema}
                     setAffiliateSkema={setAffiliateSkema}
                     affiliatePenjualan={affiliatePenjualan}
                     setAffiliatePenjualan={setAffiliatePenjualan}
                     affiliateFormOpen={affiliateFormOpen}
                     setAffiliateFormOpen={setAffiliateFormOpen}
                     editingAffiliateId={editingAffiliateId}
                     setEditingAffiliateId={setEditingAffiliateId}
                     affiliateFormData={affiliateFormData}
                     setAffiliateFormData={setAffiliateFormData}
                     skemaFormData={skemaFormData}
                     setSkemaFormData={setSkemaFormData}
                     penjualanFormData={penjualanFormData}
                     setPenjualanFormData={setPenjualanFormData}
                     skemaFormOpen={skemaFormOpen}
                     setSkemaFormOpen={setSkemaFormOpen}
                     penjualanFormOpen={penjualanFormOpen}
                     setPenjualanFormOpen={setPenjualanFormOpen}
                     penjualanFotoFiles={penjualanFotoFiles}
                     setPenjualanFotoFiles={setPenjualanFotoFiles}
                     affiliateFotoProfilFile={affiliateFotoProfilFile}
                     setAffiliateFotoProfilFile={setAffiliateFotoProfilFile}
                     affiliateSearch={affiliateSearch}
                     setAffiliateSearch={setAffiliateSearch}
                     affiliateSaving={affiliateSaving}
                     fetchAffiliates={fetchAffiliates}
                     fetchAffiliateDetail={fetchAffiliateDetail}
                     saveAffiliate={saveAffiliate}
                     deleteAffiliate={deleteAffiliate}
                     addSkema={addSkema}
                     deleteSkema={deleteSkema}
                     addPenjualan={addPenjualan}
                     deletePenjualan={deletePenjualan}
                     proxyImg={proxyImg}
                  />
               )}

               {/* ======================= TRANSAKSI DEALER ======================= */}
               {activeTab === 'dealer' && (
                  <DealerTab
                     dealerSheet={dealerSheet}
                     setDealerSheet={setDealerSheet}
                     dealerLoading={dealerLoading}
                     dealerError={dealerError}
                     dealerSearch={dealerSearch}
                     setDealerSearch={setDealerSearch}
                     dealerSelected={dealerSelected}
                     setDealerSelected={setDealerSelected}
                     dealerSortCol={dealerSortCol}
                     setDealerSortCol={setDealerSortCol}
                     dealerSortDir={dealerSortDir}
                     setDealerSortDir={setDealerSortDir}
                     dealerColFilters={dealerColFilters}
                     setDealerColFilters={setDealerColFilters}
                     dealerUnsyncedCount={dealerUnsyncedCount}
                     setDealerUnsyncedCount={setDealerUnsyncedCount}
                  />
               )}

               {activeTab === 'infrastruktur' && (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (() => {
                  const fmtBytes = (b: number) => b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : (b / 1048576).toFixed(0) + ' MB';
                  const fmtUptime = (s: number) => {
                     const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
                     return d > 0 ? `${d}h ${h}j ${m}m` : h > 0 ? `${h}j ${m}m` : `${m}m`;
                  };
                  const barColor = (pct: number) => pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500';
                  const MetricBar = ({ label, used, total, pct, unitUsed, unitTotal }: { label: string; used: string; total: string; pct: number; unitUsed?: string; unitTotal?: string }) => (
                     <div>
                        <div className="flex justify-between text-sm mb-1">
                           <span className="font-semibold text-gray-700">{label}</span>
                           <span className="text-gray-500">{used}{unitUsed} / {total}{unitTotal} <span className="font-bold text-gray-800">({pct}%)</span></span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-md h-2.5">
                           <div className={`h-2.5 rounded-md transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                        </div>
                     </div>
                  );
                  return (
                     <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                           <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                 <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                              </div>
                              Monitoring Infrastruktur
                           </h2>
                           <div className="flex items-center gap-3">
                              {stbLastUpdated && <span className="text-xs text-gray-400">Update: {stbLastUpdated.toLocaleTimeString('id-ID')}</span>}
                              <button
                                 onClick={() => { setStbMetrics(null); setStbLastUpdated(null); setActiveTab('dashboard'); setTimeout(() => setActiveTab('infrastruktur'), 50); }}
                                 className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-700 transition"
                              >
                                 <svg className="w-4 h-4 inline-block mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>Refresh
                              </button>
                           </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                           <div className="flex items-center gap-3 mb-5">
                              <div className={`w-3 h-3 rounded-md ${stbLoading ? 'bg-yellow-400 animate-pulse' : stbError ? 'bg-red-500' : 'bg-green-500'}`} />
                              <h3 className="text-lg font-bold text-gray-900">STB HG680P — <span className="font-mono text-gray-600">192.168.18.63</span></h3>
                              <span className="ml-auto text-xs text-gray-400">Armbian · ARM64</span>
                           </div>
                           {stbLoading && !stbMetrics && (
                              <div className="flex items-center justify-center py-12 text-gray-400">
                                 <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                 Mengambil data STB...
                              </div>
                           )}
                           {stbError && (
                              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                                 <strong>Gagal terhubung:</strong> {stbError}
                              </div>
                           )}
                           {stbMetrics && (
                              <div className="space-y-5">
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div className="bg-gray-50 rounded-xl p-3">
                                       <div className="text-gray-500 text-xs mb-1">Hostname</div>
                                       <div className="font-bold font-mono">{stbMetrics.hostname}</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                       <div className="text-gray-500 text-xs mb-1">CPU</div>
                                       <div className="font-bold text-xs">{stbMetrics.cpu.model}</div>
                                       <div className="text-gray-500 text-xs">{stbMetrics.cpu.cores} core</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                       <div className="text-gray-500 text-xs mb-1">System Uptime</div>
                                       <div className="font-bold">{fmtUptime(stbMetrics.uptime.system)}</div>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3">
                                       <div className="text-gray-500 text-xs mb-1">App Uptime</div>
                                       <div className="font-bold">{fmtUptime(stbMetrics.uptime.process)}</div>
                                    </div>
                                 </div>
                                 <div className="space-y-3 pt-2">
                                    <MetricBar label="CPU Load" used={stbMetrics.cpu.loadAvg[0].toString()} total={stbMetrics.cpu.cores.toString()} pct={stbMetrics.cpu.usagePercent} unitUsed={` (1m avg)`} unitTotal={` core`} />
                                    <MetricBar label="RAM" used={fmtBytes(stbMetrics.memory.used)} total={fmtBytes(stbMetrics.memory.total)} pct={stbMetrics.memory.usedPercent} />
                                    <MetricBar label="Disk (/)" used={fmtBytes(stbMetrics.disk.used)} total={fmtBytes(stbMetrics.disk.total)} pct={stbMetrics.disk.usedPercent} />
                                 </div>
                                 <div className="pt-1 text-xs text-gray-400 flex gap-4">
                                    <span>Load avg: {stbMetrics.cpu.loadAvg.join(' / ')}</span>
                                    <span>RAM free: {fmtBytes(stbMetrics.memory.free)}</span>
                                    <span>Disk free: {fmtBytes(stbMetrics.disk.free)}</span>
                                 </div>
                              </div>
                           )}
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                           <div className="flex items-center gap-3 mb-3">
                              <div className="w-3 h-3 rounded-md bg-blue-400" />
                              <h3 className="text-lg font-bold text-gray-900">Synology DS223J — <span className="font-mono text-gray-600">192.168.18.169</span></h3>
                           </div>
                           <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                              {[
                                 { label: 'PostgreSQL', detail: 'port 5433', status: 'Aktif' },
                                 { label: 'MinIO', detail: 'port 9010/9011', status: 'Aktif' },
                                 { label: 'Wetty (SSH)', detail: 'port 7681', status: 'Aktif' },
                                 { label: 'Cloudflared', detail: 'tunnel nikon-synology', status: 'HEALTHY' },
                                 { label: 'Cloud Sync', detail: 'Google Drive → /dashboard/backups', status: 'Up to date' },
                              ].map(s => (
                                 <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                                    <div className="font-bold text-gray-800">{s.label}</div>
                                    <div className="text-gray-500 text-xs mt-0.5">{s.detail}</div>
                                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
                                       <div className="w-1.5 h-1.5 bg-green-500 rounded-md" />{s.status}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                           <div className="flex items-center gap-3 mb-3">
                              <div className="w-3 h-3 rounded-md bg-orange-400" />
                              <h3 className="text-lg font-bold text-gray-900">Cloudflare Tunnel</h3>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                              {[
                                 { hostname: 'backup.altanikindo.web.id', target: '192.168.18.63:3000', desc: 'Next.js backup site' },
                                 { hostname: 'terminal.altanikindo.web.id', target: 'localhost:7681', desc: 'Wetty SSH ke STB' },
                              ].map(r => (
                                 <div key={r.hostname} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-md mt-1.5 shrink-0" />
                                    <div>
                                       <div className="font-mono font-bold text-gray-800 text-xs">{r.hostname}</div>
                                       <div className="text-gray-500 text-xs">→ {r.target}</div>
                                       <div className="text-gray-400 text-xs mt-0.5">{r.desc}</div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  );
               })()}

               </main>
            </div>
         </div>

         {/* MODAL QUICK RESI */}
         {resiModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setResiModal(null)}>
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                  <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                     <div>
                        <h2 className="text-base font-bold text-gray-900">📦 Isi Resi Pengiriman</h2>
                        <p className="text-xs text-gray-500 mt-0.5">{resiModal.nomor_seri} · {resiModal.tipe_barang}</p>
                     </div>
                     <button onClick={() => setResiModal(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                     <div>
                        <label className="label-form">Jasa Pengiriman</label>
                        <select
                           value={resiModalForm.nama_jasa_pengiriman}
                           onChange={e => setResiModalForm(p => ({ ...p, nama_jasa_pengiriman: e.target.value }))}
                           className="input-form"
                        >
                           <option value="">-- Pilih jasa kirim --</option>
                           {JASA_PENGIRIMAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                     </div>
                     <div>
                        <label className="label-form">Nomor Resi</label>
                        <input
                           type="text"
                           value={resiModalForm.nomor_resi}
                           onChange={e => setResiModalForm(p => ({ ...p, nomor_resi: e.target.value }))}
                           className="input-form"
                           placeholder="Masukkan nomor resi..."
                           autoFocus
                        />
                     </div>
                  </div>
                  <div className="px-5 pb-5 flex gap-2 justify-end">
                     <button onClick={() => setResiModal(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">Batal</button>
                     <button
                        onClick={handleSaveResiModal}
                        disabled={!resiModalForm.nama_jasa_pengiriman || !resiModalForm.nomor_resi.trim()}
                        className="px-4 py-2 text-sm font-bold bg-[#FFE500] text-black rounded-lg hover:bg-[#E5CE00] transition disabled:opacity-40 disabled:cursor-not-allowed"
                     >Simpan Resi</button>
                  </div>
               </div>
            </div>
         )}

         {/* MODAL UPLOAD RESI CSV */}
         {resiUploadPreview && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setResiUploadPreview(null)}>
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                     <div>
                        <h2 className="text-lg font-bold text-gray-900">Preview Upload Resi</h2>
                        <p className="text-sm text-gray-500 mt-0.5">{resiUploadPreview.length} data akan diupdate</p>
                     </div>
                     <button onClick={() => setResiUploadPreview(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
                  </div>
                  <div className="overflow-auto flex-1 px-6 py-4">
                     <table className="w-full text-xs border-collapse">
                        <thead>
                           <tr className="bg-gray-50 text-gray-600 font-bold">
                              <th className="px-3 py-2 text-left border border-gray-200">#</th>
                              <th className="px-3 py-2 text-left border border-gray-200">No. Seri</th>
                              <th className="px-3 py-2 text-left border border-gray-200">Nama</th>
                              <th className="px-3 py-2 text-left border border-gray-200">Nama Expedisi</th>
                              <th className="px-3 py-2 text-left border border-gray-200">Nomor Resi</th>
                           </tr>
                        </thead>
                        <tbody>
                           {resiUploadPreview.map((row, i) => (
                              <tr key={row.id_claim} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                 <td className="px-3 py-2 border border-gray-200 text-gray-500">{i + 1}</td>
                                 <td className="px-3 py-2 border border-gray-200 font-mono">{row.no_seri || '-'}</td>
                                 <td className="px-3 py-2 border border-gray-200">{row.nama || '-'}</td>
                                 <td className="px-3 py-2 border border-gray-200 font-semibold text-indigo-700">{row.expedisi || <span className="text-gray-400 italic">—</span>}</td>
                                 <td className="px-3 py-2 border border-gray-200 font-mono text-green-700">{row.nomor_resi || <span className="text-gray-400 italic">—</span>}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
                  <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                     <button onClick={() => setResiUploadPreview(null)} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-bold text-sm hover:bg-gray-50 transition">Batal</button>
                     <button onClick={handleConfirmUploadResi} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition shadow-sm">✅ Konfirmasi Update</button>
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'infrastruktur' && (currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin') && (() => {
            const fmtBytes = (b: number) => b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : (b / 1048576).toFixed(0) + ' MB';
            const fmtUptime = (s: number) => {
               const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
               return d > 0 ? `${d}h ${h}j ${m}m` : h > 0 ? `${h}j ${m}m` : `${m}m`;
            };
            const barColor = (pct: number) => pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500';
            const MetricBar = ({ label, used, total, pct, unitUsed, unitTotal }: { label: string; used: string; total: string; pct: number; unitUsed?: string; unitTotal?: string }) => (
               <div>
                  <div className="flex justify-between text-sm mb-1">
                     <span className="font-semibold text-gray-700">{label}</span>
                     <span className="text-gray-500">{used}{unitUsed} / {total}{unitTotal} <span className="font-bold text-gray-800">({pct}%)</span></span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-md h-2.5">
                     <div className={`h-2.5 rounded-md transition-all ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                  </div>
               </div>
            );
            return (
               <div className="space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between">
                     <h2 className="text-2xl font-bold text-gray-900">🖥️ Monitoring Infrastruktur</h2>
                     <div className="flex items-center gap-3">
                        {stbLastUpdated && <span className="text-xs text-gray-400">Update: {stbLastUpdated.toLocaleTimeString('id-ID')}</span>}
                        <button
                           onClick={() => { setStbMetrics(null); setStbLastUpdated(null); setActiveTab('dashboard'); setTimeout(() => setActiveTab('infrastruktur'), 50); }}
                           className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-700 transition"
                        >
                           🔄 Refresh
                        </button>
                     </div>
                  </div>

                  {/* STB Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                     <div className="flex items-center gap-3 mb-5">
                        <div className={`w-3 h-3 rounded-md ${stbLoading ? 'bg-yellow-400 animate-pulse' : stbError ? 'bg-red-500' : 'bg-green-500'}`} />
                        <h3 className="text-lg font-bold text-gray-900">STB HG680P — <span className="font-mono text-gray-600">192.168.18.63</span></h3>
                        <span className="ml-auto text-xs text-gray-400">Armbian · ARM64</span>
                     </div>

                     {stbLoading && !stbMetrics && (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                           <svg className="animate-spin w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                           Mengambil data STB...
                        </div>
                     )}

                     {stbError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                           <strong>Gagal terhubung:</strong> {stbError}
                        </div>
                     )}

                     {stbMetrics && (
                        <div className="space-y-5">
                           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="bg-gray-50 rounded-xl p-3">
                                 <div className="text-gray-500 text-xs mb-1">Hostname</div>
                                 <div className="font-bold font-mono">{stbMetrics.hostname}</div>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                 <div className="text-gray-500 text-xs mb-1">CPU</div>
                                 <div className="font-bold text-xs">{stbMetrics.cpu.model}</div>
                                 <div className="text-gray-500 text-xs">{stbMetrics.cpu.cores} core</div>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                 <div className="text-gray-500 text-xs mb-1">System Uptime</div>
                                 <div className="font-bold">{fmtUptime(stbMetrics.uptime.system)}</div>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-3">
                                 <div className="text-gray-500 text-xs mb-1">App Uptime</div>
                                 <div className="font-bold">{fmtUptime(stbMetrics.uptime.process)}</div>
                              </div>
                           </div>

                           <div className="space-y-3 pt-2">
                              <MetricBar
                                 label="CPU Load"
                                 used={stbMetrics.cpu.loadAvg[0].toString()}
                                 total={stbMetrics.cpu.cores.toString()}
                                 pct={stbMetrics.cpu.usagePercent}
                                 unitUsed={` (1m avg)`}
                                 unitTotal={` core`}
                              />
                              <MetricBar
                                 label="RAM"
                                 used={fmtBytes(stbMetrics.memory.used)}
                                 total={fmtBytes(stbMetrics.memory.total)}
                                 pct={stbMetrics.memory.usedPercent}
                              />
                              <MetricBar
                                 label="Disk (/)"
                                 used={fmtBytes(stbMetrics.disk.used)}
                                 total={fmtBytes(stbMetrics.disk.total)}
                                 pct={stbMetrics.disk.usedPercent}
                              />
                           </div>

                           <div className="pt-1 text-xs text-gray-400 flex gap-4">
                              <span>Load avg: {stbMetrics.cpu.loadAvg.join(' / ')}</span>
                              <span>RAM free: {fmtBytes(stbMetrics.memory.free)}</span>
                              <span>Disk free: {fmtBytes(stbMetrics.disk.free)}</span>
                           </div>
                        </div>
                     )}
                  </div>

                  {/* Synology Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 rounded-md bg-blue-400" />
                        <h3 className="text-lg font-bold text-gray-900">Synology DS223J — <span className="font-mono text-gray-600">192.168.18.169</span></h3>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {[
                           { label: 'PostgreSQL', detail: 'port 5433', status: 'Aktif' },
                           { label: 'MinIO', detail: 'port 9010/9011', status: 'Aktif' },
                           { label: 'Wetty (SSH)', detail: 'port 7681', status: 'Aktif' },
                           { label: 'Cloudflared', detail: 'tunnel nikon-synology', status: 'HEALTHY' },
                           { label: 'Cloud Sync', detail: 'Google Drive → /dashboard/backups', status: 'Up to date' },
                        ].map(s => (
                           <div key={s.label} className="bg-gray-50 rounded-xl p-3">
                              <div className="font-bold text-gray-800">{s.label}</div>
                              <div className="text-gray-500 text-xs mt-0.5">{s.detail}</div>
                              <div className="mt-2 inline-flex items-center gap-1 text-xs text-green-700 font-semibold">
                                 <div className="w-1.5 h-1.5 bg-green-500 rounded-md" />{s.status}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Cloudflare Card */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="w-3 h-3 rounded-md bg-orange-400" />
                        <h3 className="text-lg font-bold text-gray-900">Cloudflare Tunnel</h3>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {[
                           { hostname: 'backup.altanikindo.web.id', target: '192.168.18.63:3000', desc: 'Next.js backup site' },
                           { hostname: 'terminal.altanikindo.web.id', target: 'localhost:7681', desc: 'Wetty SSH ke STB' },
                        ].map(r => (
                           <div key={r.hostname} className="bg-gray-50 rounded-xl p-3 flex items-start gap-3">
                              <div className="w-1.5 h-1.5 bg-orange-400 rounded-md mt-1.5 shrink-0" />
                              <div>
                                 <div className="font-mono font-bold text-gray-800 text-xs">{r.hostname}</div>
                                 <div className="text-gray-500 text-xs">→ {r.target}</div>
                                 <div className="text-gray-400 text-xs mt-0.5">{r.desc}</div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            );
         })()}

         {/* MODALS */}
         {isModalOpen && (() => {
            // Distinct values dari data DB — digabung dengan pinned dari autocomplete_items, tanpa hidden
            const dedupAC = (fieldKey: string, arr: (string | null | undefined)[]) => {
               const pinned = autocompleteItems.filter(i => i.field_key === fieldKey && !i.hidden).map(i => i.value);
               const hiddenSet = new Set(autocompleteItems.filter(i => i.field_key === fieldKey && i.hidden).map(i => i.value));
               const fromDB = arr.filter((v): v is string => {
                  if (typeof v !== 'string' || !v || v === 'BELUM_DIISI') return false;
                  return !hiddenSet.has(v);
               });
               return Array.from(new Set([...pinned, ...fromDB])).sort();
            };
            const dedup = (arr: (string | null | undefined)[]) =>
               Array.from(new Set(arr.filter((v): v is string => Boolean(v) && v !== 'BELUM_DIISI'))).sort();
            const dTipeBarang = dedupAC('tipe_barang', [...claims.map(c => c.tipe_barang), ...warranties.map(w => w.tipe_barang)]);
            const dNamaLengkap = dedup(consumersList.map(k => k.nama_lengkap));
            const dKelurahan = dedup(consumersList.map(k => k.kelurahan));
            const dKecamatan = dedup(consumersList.map(k => k.kecamatan));
            const dKabupaten = dedup(consumersList.map(k => k.kabupaten_kotamadya));
            const dProvinsi = dedup(consumersList.map(k => k.provinsi));
            const dKodepos = dedup(consumersList.map(k => k.kodepos));
            const dNamaPromo = dedupAC('nama_promo', promos.map(p => p.nama_promo));
            const dProdukPromo = dedup(promos.flatMap(p => (p.tipe_produk || []).map(t => t.nama_produk)));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dJudulEvent = dedup(events.map((e: any) => e.event_title || e.title));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dSpeaker = dedupAC('speaker', events.map((e: any) => e.event_speaker));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dGenreSpeaker = dedup(events.map((e: any) => e.event_speaker_genre));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dDepositAmount = dedup(events.map((e: any) => e.deposit_amount));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const dBankInfo = dedup(events.map((e: any) => e.bank_info));
            const dNamaToko = dedupAC('nama_toko', claims.map(c => c.nama_toko));

            // Split-view: edit claim/garansi tampilkan dokumen di kiri, form di kanan
            const toViewUrl = (v: string | File | null | undefined): string | null => {
               if (!v) return null;
               if (v instanceof File) return URL.createObjectURL(v);
               return v;
            };
            const splitGaransiUrl = toViewUrl(activeTab === 'claims' ? claimForm.link_kartu_garansi : warrantyForm.link_kartu_garansi);
            const splitNotaUrl    = toViewUrl(activeTab === 'claims' ? claimForm.link_nota_pembelian : warrantyForm.link_nota_pembelian);
            const isSplitView     = modalAction === 'edit'
               && (activeTab === 'claims' || activeTab === 'warranties')
               && !!(splitGaransiUrl || splitNotaUrl);

            return (
            <div className={`fixed inset-0 z-40 animate-fade-in ${isSplitView ? 'flex bg-zinc-950' : 'bg-black/60 flex items-center justify-center p-4'}`}>
               {/* Global datalists untuk autocomplete dari data DB */}
               <datalist id="dl-tipe-barang">{dTipeBarang.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-nama-lengkap">{dNamaLengkap.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-kelurahan">{dKelurahan.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-kecamatan">{dKecamatan.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-kabupaten">{dKabupaten.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-provinsi">{dProvinsi.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-kodepos">{dKodepos.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-nama-promo">{dNamaPromo.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-produk-promo">{dProdukPromo.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-judul-event">{dJudulEvent.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-speaker">{dSpeaker.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-genre-speaker">{dGenreSpeaker.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-deposit-amount">{dDepositAmount.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-bank-info">{dBankInfo.map(v => <option key={v} value={v} />)}</datalist>
               <datalist id="dl-nama-toko">{dNamaToko.map(v => <option key={v} value={v} />)}</datalist>

               {/* Panel kiri: dokumen (hanya split view) */}
               {isSplitView && (
                  <div className="flex-1 flex flex-col gap-2 p-2 min-w-0 overflow-hidden">
                     {([
                        { label: 'Kartu Garansi', url: splitGaransiUrl, zoom: dualZoomG, setZoom: setDualZoomG, rot: dualRotG, setRot: setDualRotG, trans: dualTransG, setTrans: setDualTransG, panelKey: 'G' as const },
                        { label: 'Nota Pembelian', url: splitNotaUrl,    zoom: dualZoomN, setZoom: setDualZoomN, rot: dualRotN, setRot: setDualRotN, trans: dualTransN, setTrans: setDualTransN, panelKey: 'N' as const },
                     ] as { label: string; url: string | null; zoom: number; setZoom: React.Dispatch<React.SetStateAction<number>>; rot: number; setRot: React.Dispatch<React.SetStateAction<number>>; trans: {x:number;y:number}; setTrans: React.Dispatch<React.SetStateAction<{x:number;y:number}>>; panelKey: 'G'|'N' }[]).map(({ label, url, zoom, setZoom, rot, setRot, trans, setTrans, panelKey }) => (
                        <div key={label} className="flex-1 flex flex-col bg-zinc-900 rounded-xl overflow-hidden min-h-0">
                           <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0">
                              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">{label}</span>
                              <div className="flex items-center gap-1">
                                 <button type="button" onClick={() => { setRot((r: number) => (r - 90 + 360) % 360); setTrans({ x: 0, y: 0 }); }} title="Putar kiri" className="w-6 h-6 bg-zinc-800 hover:bg-blue-700 rounded text-zinc-300 text-sm flex items-center justify-center">↺</button>
                                 <button type="button" onClick={() => { setRot((r: number) => (r + 90) % 360); setTrans({ x: 0, y: 0 }); }} title="Putar kanan" className="w-6 h-6 bg-zinc-800 hover:bg-blue-700 rounded text-zinc-300 text-sm flex items-center justify-center">↻</button>
                                 <button type="button" onClick={() => setZoom((z: number) => Math.max(0.25, z - 0.25))} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold leading-none">−</button>
                                 <span className="w-10 text-center text-xs text-zinc-400">{Math.round(zoom * 100)}%</span>
                                 <button type="button" onClick={() => setZoom((z: number) => Math.min(5, z + 0.25))} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold leading-none">+</button>
                                 <button type="button" onClick={() => { setZoom(() => 1); setRot(() => 0); setTrans({ x: 0, y: 0 }); }} className="px-2 h-6 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 text-[11px]">Reset</button>
                              </div>
                           </div>
                           <div
                              className="flex-1 relative overflow-hidden select-none"
                              style={{ cursor: dualDragRef.current.active && dualDragRef.current.panel === panelKey ? 'grabbing' : 'grab' }}
                              onPointerDown={e => { if (url && !url.toLowerCase().endsWith('.pdf')) { e.currentTarget.setPointerCapture(e.pointerId); dualDragRef.current = { active: true, panel: panelKey, startX: e.clientX, startY: e.clientY, startTX: trans.x, startTY: trans.y }; } }}
                              onPointerMove={e => { const d = dualDragRef.current; if (!d.active || d.panel !== panelKey) return; setTrans({ x: d.startTX + (e.clientX - d.startX), y: d.startTY + (e.clientY - d.startY) }); }}
                              onPointerUp={() => { dualDragRef.current.active = false; }}
                              onPointerLeave={() => { dualDragRef.current.active = false; }}
                              onWheel={e => { e.preventDefault(); setZoom((z: number) => Math.min(5, Math.max(0.25, z + (e.deltaY > 0 ? -0.1 : 0.1)))); }}
                           >
                              {url ? (
                                 url.toLowerCase().endsWith('.pdf') ? (
                                    <iframe src={url} className="w-full h-full border-none rounded" title={label} />
                                 ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                       {/* eslint-disable-next-line @next/next/no-img-element */}
                                       <img
                                          src={isGoogleDriveLink(url) ? driveDocThumb(url) : url}
                                          alt={label}
                                          draggable={false}
                                          style={{
                                             maxWidth: 'none',
                                             maxHeight: 'none',
                                             width: `${zoom * 80}%`,
                                             height: 'auto',
                                             transform: `translate(${trans.x}px, ${trans.y}px) rotate(${rot}deg)`,
                                             transition: dualDragRef.current.active ? 'none' : 'transform 0.15s ease-out',
                                             transformOrigin: 'center center',
                                          }}
                                          className="rounded"
                                       />
                                    </div>
                                 )
                              ) : (
                                 <div className="h-full flex items-center justify-center text-zinc-600 text-sm">Tidak ada file</div>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>
               )}

               {/* Panel kanan: form edit */}
               <div className={`bg-white flex flex-col ${isSplitView ? 'w-[480px] shrink-0 max-h-screen shadow-2xl' : 'rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh]'}`}>
                  <div className="p-5 border-b border-gray-200 flex items-center gap-3">
                     <button
                        onClick={closeModal}
                        aria-label="Tutup modal"
                        title="Tutup (Esc)"
                        className="shrink-0 w-9 h-9 rounded-md bg-gray-100 hover:bg-red-100 text-gray-700 hover:text-red-700 flex items-center justify-center transition-all"
                     >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                     </button>
                     <h2 className="text-lg font-bold text-gray-900 flex-1">
                        {validasiMode && activeTab === 'claims' ? 'Validasi Claim' : `${modalAction === 'create' ? 'Tambah' : modalAction === 'edit' ? 'Edit' : modalAction === 'reset_pw' ? 'Reset Password' : 'Pengembalian'} Data`}
                     </h2>
                     {validasiMode && activeTab === 'claims' && (
                        <button type="submit" form="claim-validasi-form" disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 bg-[#FFE500] hover:bg-[#E5CE00] text-black text-sm font-bold rounded-lg transition shadow-sm">
                           {isSubmitting ? 'Menyimpan...' : 'Simpan Claim'}
                        </button>
                     )}
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto">
                     {/* Karyawan Form */}
                     {activeTab === 'userrole' && (
                        <form onSubmit={modalAction === 'reset_pw' ? handleResetPwAdmin : handleSaveKaryawan}>
                           {/* ... form fields for Karyawan ... */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                 <label htmlFor="karyawan-username" className="label-form">Username</label>
                                 <input id="karyawan-username" type="text" value={karyawanForm.username || ''} onChange={e => setKaryawanForm({ ...karyawanForm, username: e.target.value })} className="input-form" required />
                              </div>
                              <div>
                                 <label htmlFor="karyawan-nama" className="label-form">Nama Karyawan</label>
                                 <input id="karyawan-nama" type="text" value={karyawanForm.nama_karyawan || ''} onChange={e => setKaryawanForm({ ...karyawanForm, nama_karyawan: e.target.value })} className="input-form" required />
                              </div>
                              <div>
                                 <label htmlFor="karyawan-wa" className="label-form">Nomor WhatsApp</label>
                                 <input id="karyawan-wa" type="text" value={karyawanForm.nomor_wa || ''} onChange={e => setKaryawanForm({ ...karyawanForm, nomor_wa: e.target.value })} className="input-form" required />
                              </div>
                              <div>
                                 <label htmlFor="karyawan-password" className="label-form">Password {modalAction === 'create' ? '(Otomatis jika kosong)' : ''}</label>
                                 <input id="karyawan-password" type="text" value={karyawanForm.password || ''} onChange={e => setKaryawanForm({ ...karyawanForm, password: e.target.value })} className="input-form" />
                              </div>
                              <div>
                                 <label htmlFor="karyawan-role" className="label-form">Role</label>
                                 <select id="karyawan-role" value={karyawanForm.role || 'Karyawan'} onChange={e => setKaryawanForm({ ...karyawanForm, role: e.target.value })} className="input-form">
                                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                 </select>
                              </div>
                              <div>
                                 <label htmlFor="karyawan-status" className="label-form">Status</label>
                                 <select id="karyawan-status" value={karyawanForm.status_aktif ? 'true' : 'false'} onChange={e => setKaryawanForm({ ...karyawanForm, status_aktif: e.target.value === 'true' })} className="input-form">
                                    <option value="true">Aktif</option>
                                    <option value="false">Nonaktif</option>
                                 </select>
                              </div>
                           </div>
                           <div className="mt-4">
                              <label className="label-form">Akses Halaman</label>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                 {ALL_TABS_GROUPED.flatMap(g => g.tabs).filter(t => t.id !== 'dashboard' && t.id !== 'userrole').map(tab => (
                                    <label key={tab.id} className="flex items-center gap-2 text-sm">
                                       <input
                                          type="checkbox"
                                          title={`Akses ${tab.label}`}
                                          aria-label={`Akses ${tab.label}`}
                                          checked={(karyawanForm.akses_halaman || []).includes(tab.id)}
                                          onChange={e => {
                                             const currentAkses = karyawanForm.akses_halaman || [];
                                             const newAkses = e.target.checked
                                                ? [...currentAkses, tab.id]
                                                : currentAkses.filter(id => id !== tab.id);
                                             setKaryawanForm({ ...karyawanForm, akses_halaman: newAkses });
                                          }}
                                       />
                                       {tab.label}
                                    </label>
                                 ))}
                              </div>
                           </div>
                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
                           </div>
                        </form>
                     )}
                     {/* ============ SERVICE FORM ============ */}
                     {activeTab === 'services' && (
                        <form onSubmit={handleSaveService} className="space-y-4">
                           <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <p className="text-xs text-gray-700">
                                 💡 Data service ini ditampilkan ke konsumen via chatbot saat mereka pilih menu <strong>5. Service - Cek Status</strong>.
                              </p>
                           </div>

                           {/* Section: Identitas Service */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Identitas Service</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Nomor Tanda Terima *</label>
                                    <input
                                       type="text"
                                       required
                                       value={serviceForm.nomor_tanda_terima || ''}
                                       onChange={e => setServiceForm({ ...serviceForm, nomor_tanda_terima: e.target.value })}
                                       className="input-form font-mono"
                                       placeholder="Contoh: 00123456"
                                    />
                                    <p className="text-[11px] text-gray-800 mt-1 font-medium">Nomor unik yang diberikan ke konsumen saat menyerahkan barang.</p>
                                 </div>
                                 <div>
                                    <label className="label-form">Nomor Seri Barang *</label>
                                    <input
                                       type="text"
                                       required
                                       value={serviceForm.nomor_seri || ''}
                                       onChange={e => setServiceForm({ ...serviceForm, nomor_seri: e.target.value })}
                                       className="input-form"
                                       placeholder="Nomor seri produk Nikon"
                                    />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Status Progres */}
                           <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Status Progres Service</h3>
                              <div>
                                 <label className="label-form">Status Service *</label>
                                 <select
                                    aria-label="Status service"
                                    required
                                    value={serviceForm.status_service || 'Diterima'}
                                    onChange={e => setServiceForm({ ...serviceForm, status_service: e.target.value })}
                                    className="input-form"
                                 >
                                    {STATUS_SERVICE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                 </select>
                                 <p className="text-[11px] text-gray-800 mt-1 font-medium">💬 Pesan status ini akan ditampilkan ke konsumen via chatbot saat cek status.</p>
                              </div>
                           </div>

                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Status Service'}</button>
                           </div>
                        </form>
                     )}

                     {/* ============ EVENT REGISTRATION FORM ============ */}
                     {activeTab === 'eventregistrations' && (
                        <form onSubmit={handleSaveRegistration} className="space-y-4">
                           {(() => {
                              const isDeposit = registrationForm.payment_type === 'deposit';
                              return (
                                 <>
                                    {/* Section: Pilih Event */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Event yang Didaftarkan</h3>
                                       <div className="space-y-3">
                                          <div>
                                             <label className="label-form">Pilih Event *</label>
                                             <select
                                                aria-label="Pilih event"
                                                required
                                                value={registrationForm.event_id || ''}
                                                onChange={e => {
                                                   const selected = events.find(ev => ev.id === e.target.value);
                                                   setRegistrationForm({
                                                      ...registrationForm,
                                                      event_id: e.target.value,
                                                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                      event_name: selected ? ((selected as any).event_title || (selected as any).title || '') : '',
                                                   });
                                                }}
                                                className="input-form"
                                             >
                                                <option value="">-- Pilih event dari daftar --</option>
                                                {events.map(evt => (
                                                   // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                   <option key={evt.id} value={evt.id}>{(evt as any).event_title || (evt as any).title} — {(evt as any).event_date || (evt as any).date}</option>
                                                ))}
                                             </select>
                                          </div>
                                          <div>
                                             <label className="label-form">Nama Event (Manual)</label>
                                             <input
                                                type="text"
                                                value={registrationForm.event_name || ''}
                                                onChange={e => setRegistrationForm({ ...registrationForm, event_name: e.target.value })}
                                                className="input-form"
                                                placeholder="Auto-terisi saat pilih event di atas"
                                             />
                                          </div>
                                       </div>
                                    </div>

                                    {/* Section: Data Peserta */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Data Peserta</h3>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div className="md:col-span-2">
                                             <label className="label-form">Nama Lengkap *</label>
                                             <input type="text" required aria-label="Nama Lengkap" value={registrationForm.nama_lengkap || ''} onChange={e => setRegistrationForm({ ...registrationForm, nama_lengkap: e.target.value })} className="input-form" />
                                          </div>
                                          <div>
                                             <label className="label-form">Nomor WhatsApp *</label>
                                             <input type="text" required aria-label="Nomor WhatsApp" value={registrationForm.nomor_wa || ''} onChange={e => setRegistrationForm({ ...registrationForm, nomor_wa: e.target.value })} className="input-form" placeholder="081234567890" />
                                          </div>
                                          <div>
                                             <label className="label-form">Email</label>
                                             <input type="email" aria-label="Email" value={registrationForm.email || ''} onChange={e => setRegistrationForm({ ...registrationForm, email: e.target.value })} className="input-form" placeholder="nama@email.com" />
                                          </div>
                                          <div>
                                             <label className="label-form">Tipe Kamera</label>
                                             <input type="text" aria-label="Tipe Kamera" value={registrationForm.tipe_kamera || ''} onChange={e => setRegistrationForm({ ...registrationForm, tipe_kamera: e.target.value })} className="input-form" placeholder="Contoh: Nikon Z50 II" />
                                          </div>
                                          <div>
                                             <label className="label-form">Kabupaten / Kota</label>
                                             <input type="text" aria-label="Kabupaten / Kota" value={registrationForm.kabupaten_kotamadya || ''} onChange={e => setRegistrationForm({ ...registrationForm, kabupaten_kotamadya: e.target.value })} className="input-form" />
                                          </div>
                                       </div>
                                    </div>

                                    {/* Section: Pembayaran & Status */}
                                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Pembayaran & Status Pendaftaran</h3>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                             <label className="label-form">Tipe Pembayaran</label>
                                             <select aria-label="Tipe pembayaran" value={registrationForm.payment_type || 'regular'} onChange={e => setRegistrationForm({ ...registrationForm, payment_type: e.target.value as 'regular' | 'deposit' | 'gratis' })} className="input-form">
                                                {PAYMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                             </select>
                                          </div>
                                          <div>
                                             <label className="label-form">Status Pendaftaran *</label>
                                             <select aria-label="Status pendaftaran" required value={registrationForm.status_pendaftaran || 'menunggu_validasi'} onChange={e => setRegistrationForm({ ...registrationForm, status_pendaftaran: e.target.value as 'menunggu_validasi' | 'terdaftar' | 'ditolak' })} className="input-form">
                                                {STATUS_PENDAFTARAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                             </select>
                                          </div>
                                          <div className="md:col-span-2">
                                             <label className="label-form">Bukti Transfer URL</label>
                                             <input type="url" aria-label="Bukti Transfer URL" value={registrationForm.bukti_transfer_url || ''} onChange={e => setRegistrationForm({ ...registrationForm, bukti_transfer_url: e.target.value })} className="input-form" placeholder="https://..." />
                                             {registrationForm.bukti_transfer_url && (
                                                <button type="button" onClick={() => openImageViewer(registrationForm.bukti_transfer_url!)} className="text-xs text-blue-600 font-bold hover:underline mt-1">🔗 Lihat bukti transfer</button>
                                             )}
                                          </div>
                                          {registrationForm.status_pendaftaran === 'ditolak' && (
                                             <div className="md:col-span-2">
                                                <label className="label-form">Alasan Penolakan</label>
                                                <textarea rows={2} value={registrationForm.rejection_reason || ''} onChange={e => setRegistrationForm({ ...registrationForm, rejection_reason: e.target.value })} className="input-form resize-none" placeholder="Jelaskan alasan penolakan untuk dikirim via WA ke peserta" />
                                             </div>
                                          )}
                                          {registrationForm.status_pendaftaran === 'terdaftar' && (
                                             <div className="md:col-span-2">
                                                <label className="label-form">Ticket URL</label>
                                                <input type="url" aria-label="Ticket URL" value={registrationForm.ticket_url || ''} onChange={e => setRegistrationForm({ ...registrationForm, ticket_url: e.target.value })} className="input-form" placeholder="https://... (auto-generate via /api/generate-ticket)" />
                                             </div>
                                          )}
                                       </div>
                                    </div>

                                    {/* Section: Kehadiran */}
                                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Kehadiran di Acara</h3>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                             <label className="label-form">Sudah Hadir?</label>
                                             <select aria-label="Status hadir" value={registrationForm.is_attended ? 'true' : 'false'} onChange={e => setRegistrationForm({ ...registrationForm, is_attended: e.target.value === 'true', attended_at: e.target.value === 'true' && !registrationForm.attended_at ? new Date().toISOString() : registrationForm.attended_at })} className="input-form">
                                                <option value="false">Belum Hadir</option>
                                                <option value="true">Sudah Hadir ✓</option>
                                             </select>
                                          </div>
                                          <div>
                                             <label className="label-form">Dicatat Oleh (Admin)</label>
                                             <input type="text" value={registrationForm.attended_by || ''} onChange={e => setRegistrationForm({ ...registrationForm, attended_by: e.target.value })} className="input-form" placeholder="Nama admin pencatat" />
                                          </div>
                                          {registrationForm.is_attended && registrationForm.attended_at && (
                                             <div className="md:col-span-2">
                                                <p className="text-[11px] text-green-700 font-bold">✓ Tercatat hadir pada: {new Date(registrationForm.attended_at).toLocaleString('id-ID')}</p>
                                             </div>
                                          )}
                                       </div>
                                    </div>

                                    {/* Section: Refund Deposit (hanya kalau deposit) */}
                                    {isDeposit && (
                                       <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Refund Deposit (untuk Tipe Deposit)</h3>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                             <div>
                                                <label className="label-form">Nama Bank</label>
                                                <select aria-label="Nama bank" value={registrationForm.nama_bank || ''} onChange={e => setRegistrationForm({ ...registrationForm, nama_bank: e.target.value || null })} className="input-form">
                                                   <option value="">-- Pilih bank --</option>
                                                   {NAMA_BANK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                             </div>
                                             <div>
                                                <label className="label-form">Nomor Rekening</label>
                                                <input type="text" aria-label="Nomor Rekening" value={registrationForm.no_rekening || ''} onChange={e => setRegistrationForm({ ...registrationForm, no_rekening: e.target.value })} className="input-form" />
                                             </div>
                                             <div className="md:col-span-2">
                                                <label className="label-form">Nama Pemilik Rekening</label>
                                                <input type="text" aria-label="Nama Pemilik Rekening" value={registrationForm.nama_pemilik_rekening || ''} onChange={e => setRegistrationForm({ ...registrationForm, nama_pemilik_rekening: e.target.value })} className="input-form" />
                                             </div>
                                             <div>
                                                <label className="label-form">Status Refund</label>
                                                <select aria-label="Status refund" value={registrationForm.status_pengembalian_deposit || ''} onChange={e => setRegistrationForm({ ...registrationForm, status_pengembalian_deposit: e.target.value || null })} className="input-form">
                                                   <option value="">-- belum diproses --</option>
                                                   {STATUS_REFUND_DEPOSIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                             </div>
                                             <div>
                                                <label className="label-form">URL Bukti Pengembalian</label>
                                                <input type="url" value={registrationForm.bukti_pengembalian_deposit || ''} onChange={e => setRegistrationForm({ ...registrationForm, bukti_pengembalian_deposit: e.target.value })} className="input-form" placeholder="https://..." />
                                             </div>
                                          </div>
                                       </div>
                                    )}

                                    <div className="mt-6 flex justify-end gap-3">
                                       <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                                       <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Pendaftaran'}</button>
                                    </div>
                                 </>
                              );
                           })()}
                        </form>
                     )}

                     {/* ============ BUDGET APPROVAL FORM ============ */}
                     {activeTab === 'budgets' && (
                        <form onSubmit={handleSaveBudget} className="space-y-4">
                           {(() => {
                              const items = budgetForm.items || [];
                              const totalCost = items.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
                              const fmtRp = (n: number) => 'Rp ' + n.toLocaleString('id-ID');
                              const updateItem = (idx: number, patch: Partial<BudgetItem>) => {
                                 const newItems = [...items];
                                 const merged = { ...newItems[idx], ...patch };
                                 if (merged.item_type === 'petty' && 'petty_cash' in patch) {
                                    const v = parseFloat(String(merged.petty_cash || '0').replace(/[^0-9.-]/g, ''));
                                    merged.value = isNaN(v) ? 0 : v;
                                 } else if ('qty' in patch || 'cost_unit' in patch) {
                                    merged.value = (Number(merged.qty) || 0) * (Number(merged.cost_unit) || 0);
                                 }
                                 newItems[idx] = merged;
                                 const newTotal = newItems.reduce((s, it) => s + (Number(it.value) || 0), 0);
                                 setBudgetForm({ ...budgetForm, items: newItems, total_cost: newTotal });
                              };
                              return (
                                 <>
                                    {/* Section: Header Proposal */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Header Proposal</h3>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                             <label className="label-form">Nomor Proposal (auto) *</label>
                                             <div className="flex items-stretch gap-2">
                                                <input
                                                   type="text"
                                                   required
                                                   readOnly
                                                   value={budgetForm.proposal_no || ''}
                                                   className="input-form font-mono bg-gray-100 cursor-not-allowed flex-1"
                                                   aria-label="Nomor proposal"
                                                />
                                                <button
                                                   type="button"
                                                   onClick={() => setBudgetForm({ ...budgetForm, proposal_no: generateProposalNo() })}
                                                   className="shrink-0 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition-all"
                                                   title="Regenerate nomor proposal"
                                                >
                                                   🔄 Regenerate
                                                </button>
                                             </div>
                                             <p className="text-[11px] text-gray-800 mt-1 font-medium">
                                                Auto-generate dengan format: <code className="bg-gray-100 px-1 rounded">MKTG/BA + YYYYMMDDHHmmss</code>
                                             </p>
                                          </div>
                                          <div>
                                             <label className="label-form">Proposed Name *</label>
                                             <input
                                                type="text"
                                                required
                                                value={budgetForm.proposed_name || budgetForm.drafter_name || ''}
                                                onChange={e => setBudgetForm({ ...budgetForm, proposed_name: e.target.value, drafter_name: e.target.value })}
                                                className="input-form"
                                                placeholder="Nama yang mengajukan"
                                             />
                                          </div>
                                          <div className="md:col-span-2">
                                             <label className="label-form">Nama Event *</label>
                                             <input type="text" required value={budgetForm.title || ''} onChange={e => setBudgetForm({ ...budgetForm, title: e.target.value })} className="input-form" placeholder="Contoh: Photo Walk Q3 2026" />
                                          </div>
                                          <div>
                                             <label className="label-form">Tanggal Event</label>
                                             <input type="date" value={budgetForm.event_date || ''} onChange={e => setBudgetForm({ ...budgetForm, event_date: e.target.value })} className="input-form" />
                                          </div>
                                          <div>
                                             <label className="label-form">Jam Acara</label>
                                             <input type="text" value={budgetForm.event_time || ''} onChange={e => setBudgetForm({ ...budgetForm, event_time: e.target.value })} className="input-form" placeholder="Contoh: 09.00 WIB - Selesai" />
                                          </div>
                                          <div>
                                             <label className="label-form">Lokasi Acara</label>
                                             <input type="text" value={budgetForm.event_location || ''} onChange={e => setBudgetForm({ ...budgetForm, event_location: e.target.value })} className="input-form" placeholder="Contoh: Studio TV, ISBI Bandung" />
                                          </div>
                                          <div>
                                             <label className="label-form">Link Grup WhatsApp</label>
                                             <input type="url" value={budgetForm.wa_group_link || ''} onChange={e => setBudgetForm({ ...budgetForm, wa_group_link: e.target.value })} className="input-form" placeholder="https://chat.whatsapp.com/..." />
                                          </div>
                                          <div>
                                             <label className="label-form">Poster / Gambar Event</label>
                                             {budgetForm.event_image && !budgetEventImageFile && (
                                                <div className="mb-2 flex items-center gap-2">
                                                   {/* eslint-disable-next-line @next/next/no-img-element */}
                                                   <img src={driveImgSrc(budgetForm.event_image)} alt="Poster" className="h-14 w-auto rounded border object-contain" />
                                                   <button type="button" onClick={() => setBudgetForm({ ...budgetForm, event_image: '' })} className="text-xs text-red-500 hover:underline">Hapus</button>
                                                </div>
                                             )}
                                             <input type="file" accept="image/*" onChange={e => setBudgetEventImageFile(e.target.files?.[0] || null)} className="input-form text-sm" />
                                          </div>
                                          <div>
                                             <label className="label-form">Periode</label>
                                             <input type="text" value={budgetForm.period || ''} onChange={e => setBudgetForm({ ...budgetForm, period: e.target.value })} className="input-form" placeholder="Contoh: Juli 2026 atau Q3 2026" />
                                          </div>
                                          <div>
                                             <label className="label-form">Sumber Dana</label>
                                             <select aria-label="Sumber dana" value={budgetForm.budget_source || 'Marketing Budget'} onChange={e => setBudgetForm({ ...budgetForm, budget_source: e.target.value })} className="input-form">
                                                {BUDGET_SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                             </select>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Section: Detail Aktivitas */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Detail Aktivitas</h3>
                                       <div className="space-y-3">
                                          <div>
                                             <label className="label-form">Objectives (Tujuan)</label>
                                             <textarea rows={2} value={budgetForm.objectives || ''} onChange={e => setBudgetForm({ ...budgetForm, objectives: e.target.value })} className="input-form resize-none" placeholder="Apa tujuan dari kegiatan/anggaran ini" />
                                          </div>
                                          <div>
                                             <label className="label-form">Detail Activity (Rincian Kegiatan)</label>
                                             <textarea rows={3} value={budgetForm.detail_activity || ''} onChange={e => setBudgetForm({ ...budgetForm, detail_activity: e.target.value })} className="input-form resize-none" placeholder="Jelaskan detail kegiatan: agenda, lokasi, jumlah peserta, dll." />
                                          </div>
                                          <div>
                                             <label className="label-form">Expected Result (Hasil yang Diharapkan)</label>
                                             <textarea rows={2} value={budgetForm.expected_result || ''} onChange={e => setBudgetForm({ ...budgetForm, expected_result: e.target.value })} className="input-form resize-none" placeholder="KPI / hasil yang ingin dicapai" />
                                          </div>
                                       </div>
                                    </div>

                                    {/* Section: EVENT COST */}
                                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                       <div className="flex items-center justify-between mb-3">
                                          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Event Cost</h3>
                                          <span className="text-[10px] text-gray-600 font-medium">{items.filter(it => it.item_type !== 'petty').length} item · auto-calc</span>
                                       </div>
                                       <div className="space-y-3">
                                          {items.map((item, idx) => item.item_type === 'petty' ? null : (
                                             <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                   <span className="text-xs font-bold text-gray-600">Item #{idx + 1}</span>
                                                   <button type="button" onClick={() => {
                                                      const newItems = [...items];
                                                      newItems.splice(idx, 1);
                                                      const newTotal = newItems.reduce((s, it) => s + (Number(it.value) || 0), 0);
                                                      setBudgetForm({ ...budgetForm, items: newItems, total_cost: newTotal });
                                                   }} className="text-red-600 text-xs font-bold hover:underline">✕ Hapus</button>
                                                </div>
                                                <input
                                                   type="text"
                                                   required
                                                   placeholder="Purpose / Keperluan (cth: Sewa venue, Konsumsi)"
                                                   value={item.purpose}
                                                   onChange={e => updateItem(idx, { purpose: e.target.value })}
                                                   className="input-form"
                                                />
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                   <div>
                                                      <label className="text-[10px] font-bold text-gray-900 uppercase block mb-1">Qty</label>
                                                      <input type="number" min={0} step={1} aria-label="Qty" title="Quantity" value={item.qty || ''} onChange={e => updateItem(idx, { qty: parseInt(e.target.value) || 0 })} className="input-form" />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-gray-900 uppercase block mb-1">Cost/Unit</label>
                                                      <input type="number" min={0} step={1000} aria-label="Cost per unit" title="Cost per unit" value={item.cost_unit || ''} onChange={e => updateItem(idx, { cost_unit: parseFloat(e.target.value) || 0 })} className="input-form" />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-gray-900 uppercase block mb-1">Value (auto)</label>
                                                      <div className="px-3 py-2.5 rounded-lg border-2 border-gray-300 bg-gray-100 text-sm font-bold text-gray-900 min-h-11 flex items-center">
                                                         {fmtRp(Number(item.value) || 0)}
                                                      </div>
                                                   </div>
                                                </div>
                                             </div>
                                          ))}
                                          <button
                                             type="button"
                                             onClick={() => {
                                                const newItems = [...items, { purpose: '', qty: 0, cost_unit: 0, value: 0, petty_cash: '', item_type: 'event' as const }];
                                                setBudgetForm({ ...budgetForm, items: newItems });
                                             }}
                                             className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-bold border-2 border-dashed border-yellow-300"
                                          >
                                             + Tambah Item Event Cost
                                          </button>
                                          <div className="flex items-center justify-between text-xs pt-1">
                                             <span className="font-bold text-gray-700">Subtotal Event Cost</span>
                                             <span className="font-mono font-bold text-gray-900">{fmtRp(items.filter(it => it.item_type !== 'petty').reduce((s, it) => s + (Number(it.value) || 0), 0))}</span>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Section: PETTY CASH */}
                                    <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                                       <div className="flex items-center justify-between mb-3">
                                          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Petty Cash</h3>
                                          <span className="text-[10px] text-gray-600 font-medium">{items.filter(it => it.item_type === 'petty').length} item</span>
                                       </div>
                                       <div className="space-y-3">
                                          {items.map((item, idx) => item.item_type !== 'petty' ? null : (
                                             <div key={idx} className="bg-white border border-orange-100 rounded-lg p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                   <span className="text-xs font-bold text-orange-700">Petty Cash #{items.filter((it, i) => it.item_type === 'petty' && i <= idx).length}</span>
                                                   <button type="button" onClick={() => {
                                                      const newItems = [...items];
                                                      newItems.splice(idx, 1);
                                                      const newTotal = newItems.reduce((s, it) => s + (Number(it.value) || 0), 0);
                                                      setBudgetForm({ ...budgetForm, items: newItems, total_cost: newTotal });
                                                   }} className="text-red-600 text-xs font-bold hover:underline">✕ Hapus</button>
                                                </div>
                                                <input
                                                   type="text"
                                                   required
                                                   placeholder="Keterangan / Keperluan petty cash"
                                                   value={item.purpose}
                                                   onChange={e => updateItem(idx, { purpose: e.target.value })}
                                                   className="input-form"
                                                />
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                   <div>
                                                      <label className="text-[10px] font-bold text-gray-900 uppercase block mb-1">Qty</label>
                                                      <input type="number" min={0} step={1} aria-label="Qty" title="Quantity" value={item.qty || ''} onChange={e => updateItem(idx, { qty: parseInt(e.target.value) || 0 })} className="input-form" />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-gray-900 uppercase block mb-1">Cost/Unit</label>
                                                      <input type="number" min={0} step={1000} aria-label="Cost per unit" title="Cost per unit" value={item.cost_unit || ''} onChange={e => updateItem(idx, { cost_unit: parseFloat(e.target.value) || 0 })} className="input-form" />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-orange-800 uppercase block mb-1">Jumlah Petty Cash</label>
                                                      <input
                                                         type="text"
                                                         readOnly
                                                         aria-label="Jumlah petty cash"
                                                         title="Jumlah petty cash (otomatis)"
                                                         value={fmtRp(Number(item.value) || 0)}
                                                         className="input-form border-orange-300 bg-orange-50 cursor-default"
                                                      />
                                                   </div>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] bg-orange-50 rounded px-2 py-1.5">
                                                   <span className="font-bold text-orange-800">Total Petty Cash Item</span>
                                                   <span className="font-mono font-bold text-orange-900">{fmtRp(Number(item.value) || 0)}</span>
                                                </div>
                                             </div>
                                          ))}
                                          <button
                                             type="button"
                                             onClick={() => {
                                                const newItems = [...items, { purpose: '', qty: 1, cost_unit: 0, value: 0, petty_cash: '', item_type: 'petty' as const }];
                                                setBudgetForm({ ...budgetForm, items: newItems });
                                             }}
                                             className="w-full py-2 bg-white hover:bg-orange-50 text-orange-700 rounded-lg text-sm font-bold border-2 border-dashed border-orange-300"
                                          >
                                             + Tambah Item Petty Cash
                                          </button>
                                          <div className="flex items-center justify-between text-xs pt-1">
                                             <span className="font-bold text-orange-700">Subtotal Petty Cash</span>
                                             <span className="font-mono font-bold text-orange-900">{fmtRp(items.filter(it => it.item_type === 'petty').reduce((s, it) => s + (Number(it.value) || 0), 0))}</span>
                                          </div>
                                       </div>
                                    </div>

                                    {/* Grand Total */}
                                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 flex items-center justify-between">
                                       <span className="text-sm font-bold text-gray-700">GRAND TOTAL</span>
                                       <span className="text-xl font-black text-gray-900">{fmtRp(totalCost)}</span>
                                    </div>

                                    {/* Section: Penanggung Jawab Approval (editable nama) */}
                                    <div className="bg-blue-50 rounded-lg p-3 border-2 border-blue-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Penanggung Jawab Approval (Print)</h3>
                                       <p className="text-[11px] text-gray-800 font-medium mb-3">📌 Nama-nama berikut akan muncul di header Print PDF (kotak Approval).</p>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div className="md:col-span-2">
                                             <label className="label-form">Management Approver 1 (Comment)</label>
                                             <input type="text" value={budgetForm.mgt_name_1 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_name_1: e.target.value })} className="input-form" placeholder="Default: Jamal" />
                                          </div>
                                          <div>
                                             <label className="label-form">Management Approver 2 (Comment)</label>
                                             <input type="text" value={budgetForm.mgt_name_2 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_name_2: e.target.value })} className="input-form" placeholder="Default: Eko" />
                                          </div>
                                          <div>
                                             <label className="label-form">Management Approver 3 (Consent)</label>
                                             <input type="text" value={budgetForm.mgt_name_3 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_name_3: e.target.value })} className="input-form" placeholder="Default: Larry" />
                                          </div>
                                          <div className="md:col-span-2">
                                             <label className="label-form">Finance & Accounting Approver</label>
                                             <input type="text" value={budgetForm.finance_name || ''} onChange={e => setBudgetForm({ ...budgetForm, finance_name: e.target.value })} className="input-form" placeholder="Default: Merry" />
                                          </div>
                                       </div>
                                    </div>

                                    {/* Section: Lampiran */}
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Lampiran (Maks 3 file)</h3>
                                       <div className="space-y-3">
                                          {[0, 1, 2].map(slotIdx => {
                                             const url = budgetForm.attachment_urls?.[slotIdx];
                                             return (
                                                <div key={slotIdx} className="bg-white border border-gray-200 rounded-lg p-3">
                                                   <label className="label-form">Lampiran #{slotIdx + 1}</label>
                                                   {typeof url === 'string' && url && (
                                                      <button type="button" onClick={() => openImageViewer(url)} className="block text-xs text-blue-600 font-bold hover:underline mb-2">🔗 Lihat lampiran saat ini</button>
                                                   )}
                                                   <input
                                                      type="file"
                                                      accept="image/*,application/pdf"
                                                      aria-label={`Upload lampiran ${slotIdx + 1}`}
                                                      title={`Upload lampiran ${slotIdx + 1}`}
                                                      onChange={e => {
                                                         const newUrls = [...(budgetForm.attachment_urls || [null, null, null])];
                                                         newUrls[slotIdx] = e.target.files?.[0] || null;
                                                         setBudgetForm({ ...budgetForm, attachment_urls: newUrls });
                                                      }}
                                                      className="input-form"
                                                   />
                                                   {url instanceof File && <p className="text-xs text-green-600 mt-1">File baru: {url.name}</p>}
                                                   {typeof url === 'string' && url && (
                                                      <button type="button" onClick={() => {
                                                         const newUrls = [...(budgetForm.attachment_urls || [null, null, null])];
                                                         newUrls[slotIdx] = null;
                                                         setBudgetForm({ ...budgetForm, attachment_urls: newUrls });
                                                      }} className="text-[11px] text-red-600 font-bold mt-1 hover:underline">Hapus lampiran ini</button>
                                                   )}
                                                </div>
                                             );
                                          })}
                                       </div>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                       <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                                       <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Proposal'}</button>
                                    </div>
                                 </>
                              );
                           })()}
                        </form>
                     )}

                     {/* ============ BOT SETTINGS FORM ============ */}
                     {activeTab === 'botsettings' && (
                        <form onSubmit={handleSaveBotSettings} className="space-y-4">
                           <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <p className="text-xs text-gray-700">
                                 💡 Bot Settings adalah <strong>konfigurasi key-value</strong> yang dibaca oleh chatbot. Misalnya <code className="bg-white px-1 py-0.5 rounded text-[11px]">promo_nikon</code> berisi URL file PDF promo terbaru. Bot akan kirim file/link saat user pilih menu yang relevan.
                              </p>
                           </div>

                           {/* Section: Identifier */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Identifier</h3>
                              <div className="space-y-3">
                                 <div>
                                    <label className="label-form">Nama Pengaturan (Key) *</label>
                                    <input
                                       type="text"
                                       required
                                       disabled={modalAction === 'edit'}
                                       value={botSettingsForm.nama_pengaturan || ''}
                                       onChange={e => setBotSettingsForm({ ...botSettingsForm, nama_pengaturan: e.target.value })}
                                       className="input-form disabled:bg-gray-100 disabled:cursor-not-allowed font-mono"
                                       placeholder="contoh: promo_nikon, dealer_resmi"
                                       pattern="[a-z0-9_]+"
                                       title="Hanya huruf kecil, angka, dan underscore"
                                       list="pengaturan-suggestions"
                                    />
                                    <datalist id="pengaturan-suggestions">
                                       <option value="promo_nikon" />
                                       <option value="dealer_resmi" />
                                       <option value="alamat_service_center" />
                                       <option value="syarat_klaim" />
                                       <option value="cara_pengembalian" />
                                       <option value="jadwal_event" />
                                    </datalist>
                                    <p className="text-[11px] text-gray-800 mt-1 font-medium">
                                       {modalAction === 'edit'
                                          ? '🔒 Key tidak bisa diubah saat edit (mencegah broken reference dari kode bot)'
                                          : '⚠️ Pakai snake_case (huruf kecil + underscore). Harus unik & cocok dengan referensi di kode bot.'}
                                    </p>
                                 </div>

                                 <div>
                                    <label className="label-form">Deskripsi</label>
                                    <input
                                       type="text"
                                       value={botSettingsForm.description || ''}
                                       onChange={e => setBotSettingsForm({ ...botSettingsForm, description: e.target.value })}
                                       className="input-form"
                                       placeholder="Penjelasan singkat untuk admin lain"
                                    />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Konten */}
                           <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Konten / Value</h3>
                              <div>
                                 <label className="label-form">URL File / Link</label>
                                 <input
                                    type="url"
                                    value={botSettingsForm.url_file || ''}
                                    onChange={e => setBotSettingsForm({ ...botSettingsForm, url_file: e.target.value })}
                                    className="input-form"
                                    placeholder="https://drive.google.com/file/d/... atau URL lainnya"
                                 />
                                 <p className="text-[11px] text-gray-800 mt-1 font-medium">
                                    💡 Untuk Google Drive: pastikan file di-set <strong>&quot;Anyone with the link&quot;</strong> agar bisa diakses bot.
                                 </p>
                                 {botSettingsForm.url_file && (
                                    <a
                                       href={botSettingsForm.url_file}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="inline-flex items-center gap-1 text-xs text-blue-600 font-bold hover:underline mt-2"
                                    >
                                       🔗 Buka link di tab baru
                                    </a>
                                 )}
                              </div>
                           </div>

                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Pengaturan'}</button>
                           </div>
                        </form>
                     )}

                     {/* ============ PROMO FORM ============ */}
                     {activeTab === 'promos' && (
                        <form onSubmit={handleSavePromo} className="space-y-4">
                           {/* Section: Info Dasar */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Info Promo</h3>
                              <div className="space-y-3">
                                 <div>
                                    <label className="label-form">Nama Promo *</label>
                                    <input
                                       type="text"
                                       required
                                       value={promoForm.nama_promo || ''}
                                       onChange={e => setPromoForm({ ...promoForm, nama_promo: e.target.value })}
                                       className="input-form"
                                       list="dl-nama-promo"
                                       placeholder="Contoh: Free Battery Nikon EN-EL25a"
                                    />
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                       <label className="label-form">Tanggal Mulai *</label>
                                       <input
                                          type="date"
                                          aria-label="Tanggal mulai promo"
                                          title="Tanggal mulai promo"
                                          required
                                          value={promoForm.tanggal_mulai?.substring(0, 10) || ''}
                                          onChange={e => setPromoForm({ ...promoForm, tanggal_mulai: e.target.value })}
                                          className="input-form"
                                       />
                                    </div>
                                    <div>
                                       <label className="label-form">Tanggal Selesai *</label>
                                       <input
                                          type="date"
                                          aria-label="Tanggal selesai promo"
                                          title="Tanggal selesai promo"
                                          required
                                          value={promoForm.tanggal_selesai?.substring(0, 10) || ''}
                                          onChange={e => setPromoForm({ ...promoForm, tanggal_selesai: e.target.value })}
                                          className="input-form"
                                       />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="label-form">Status Aktif</label>
                                    <div className="flex items-center gap-3 mt-1">
                                       <label className={`flex-1 cursor-pointer rounded-lg border-2 p-3 text-center transition-all ${promoForm.status_aktif ? 'border-green-500 bg-green-50 text-green-800' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}>
                                          <input
                                             type="radio"
                                             name="promo-status"
                                             checked={promoForm.status_aktif === true}
                                             onChange={() => setPromoForm({ ...promoForm, status_aktif: true })}
                                             className="sr-only"
                                          />
                                          <div className="text-lg mb-0.5">✅</div>
                                          <div className="text-xs font-bold">Aktif</div>
                                       </label>
                                       <label className={`flex-1 cursor-pointer rounded-lg border-2 p-3 text-center transition-all ${promoForm.status_aktif === false ? 'border-red-500 bg-red-50 text-red-800' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'}`}>
                                          <input
                                             type="radio"
                                             name="promo-status"
                                             checked={promoForm.status_aktif === false}
                                             onChange={() => setPromoForm({ ...promoForm, status_aktif: false })}
                                             className="sr-only"
                                          />
                                          <div className="text-lg mb-0.5">⏸️</div>
                                          <div className="text-xs font-bold">Nonaktif</div>
                                       </label>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* Section: Produk yang Berlaku */}
                           <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <div className="flex items-center justify-between mb-3">
                                 <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Produk yang Berlaku</h3>
                                 <span className="text-[10px] text-gray-600 font-medium">{(promoForm.tipe_produk || []).length} produk</span>
                              </div>
                              <p className="text-[11px] text-gray-700 mb-3">Daftar tipe produk Nikon yang mendapatkan promo ini.</p>
                              <div className="space-y-2">
                                 {(promoForm.tipe_produk || []).map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                       <span className="text-xs font-bold text-gray-500 w-6">#{idx + 1}</span>
                                       <input
                                          type="text"
                                          required
                                          placeholder="Contoh: Nikon Z50 II Body Only"
                                          value={item.nama_produk}
                                          onChange={e => {
                                             const newProducts = [...(promoForm.tipe_produk || [])];
                                             newProducts[idx] = { nama_produk: e.target.value };
                                             setPromoForm({ ...promoForm, tipe_produk: newProducts });
                                          }}
                                          className="input-form flex-1"
                                          list="dl-produk-promo"
                                       />
                                       <button
                                          type="button"
                                          onClick={() => {
                                             const newProducts = [...(promoForm.tipe_produk || [])];
                                             newProducts.splice(idx, 1);
                                             setPromoForm({ ...promoForm, tipe_produk: newProducts });
                                          }}
                                          className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                                          title="Hapus produk"
                                          aria-label="Hapus produk"
                                       >
                                          ✕
                                       </button>
                                    </div>
                                 ))}
                                 <button
                                    type="button"
                                    onClick={() => {
                                       const newProducts = [...(promoForm.tipe_produk || []), { nama_produk: '' }];
                                       setPromoForm({ ...promoForm, tipe_produk: newProducts });
                                    }}
                                    className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-bold border-2 border-dashed border-blue-300"
                                 >
                                    + Tambah Produk
                                 </button>
                              </div>
                              {(promoForm.tipe_produk || []).length === 0 && (
                                 <p className="text-[11px] text-amber-700 mt-2 font-medium">⚠️ Promo tanpa produk akan dianggap berlaku untuk semua produk.</p>
                              )}
                           </div>

                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Promo'}</button>
                           </div>
                        </form>
                     )}

                     {/* ============ WARRANTY FORM ============ */}
                     {activeTab === 'warranties' && (
                        <form onSubmit={handleSaveWarranty} className="space-y-4">
                           {/* Section: Identitas Pemilik */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Identitas Pemilik</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Nomor WhatsApp Pemilik</label>
                                    <input type="text" aria-label="Nomor WhatsApp Pemilik" value={warrantyForm.nomor_wa || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nomor_wa: e.target.value })} className="input-form" placeholder="62812345678 / 081234567890" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nomor WA Notifikasi Update</label>
                                    <input type="text" aria-label="Nomor WA Notifikasi Update" value={warrantyForm.nomor_wa_update || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nomor_wa_update: e.target.value })} className="input-form" placeholder="Kosongkan = pakai nomor pemilik" />
                                 </div>
                                 <div className="md:col-span-2">
                                    <label className="label-form">Nama Pendaftar</label>
                                    <input type="text" aria-label="Nama Pendaftar" value={warrantyForm.nama_pendaftar || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nama_pendaftar: e.target.value })} className="input-form" />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Data Produk */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Data Produk & Pembelian</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Nomor Seri *</label>
                                    <input type="text" required aria-label="Nomor Seri" value={warrantyForm.nomor_seri || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nomor_seri: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Tipe Barang *</label>
                                    <input type="text" required aria-label="Tipe Barang" value={warrantyForm.tipe_barang || ''} onChange={e => setWarrantyForm({ ...warrantyForm, tipe_barang: e.target.value })} className="input-form" list="dl-tipe-barang" placeholder="Contoh: Nikon Z50 Kit 16-50mm" />
                                 </div>
                                 <div>
                                    <label className="label-form">Tanggal Pembelian</label>
                                    <input type="date" aria-label="Tanggal pembelian" title="Tanggal pembelian" value={warrantyForm.tanggal_pembelian?.substring(0, 10) || ''} onChange={e => setWarrantyForm({ ...warrantyForm, tanggal_pembelian: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nama Toko</label>
                                    <input type="text" aria-label="Nama Toko" value={warrantyForm.nama_toko || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nama_toko: e.target.value })} className="input-form" list="dl-nama-toko" />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Spesifikasi Garansi */}
                           <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Spesifikasi Garansi</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Jenis Garansi *</label>
                                    <select aria-label="Jenis garansi" required value={warrantyForm.jenis_garansi || 'Jasa 30%'} onChange={e => { const j = e.target.value; setWarrantyForm({ ...warrantyForm, jenis_garansi: j, lama_garansi: JENIS_GARANSI_LAMA_MAP[j] ?? warrantyForm.lama_garansi }); }} className="input-form">
                                       {JENIS_GARANSI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Lama Garansi *</label>
                                    <select aria-label="Lama garansi" required value={warrantyForm.lama_garansi || '1 Tahun'} onChange={e => setWarrantyForm({ ...warrantyForm, lama_garansi: e.target.value })} className="input-form">
                                       {LAMA_GARANSI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                              </div>
                           </div>

                           {/* Section: Validasi */}
                           <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Status Validasi</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="md:col-span-2">
                                    <label className="label-form">Status Validasi (Utama) *</label>
                                    <select aria-label="Status validasi" required value={warrantyForm.status_validasi || 'Menunggu'} onChange={e => setWarrantyForm({ ...warrantyForm, status_validasi: e.target.value })} className="input-form">
                                       {STATUS_VALIDASI_GARANSI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Validasi Marketing (MKT)</label>
                                    <select aria-label="Validasi MKT" value={warrantyForm.validasi_by_mkt || ''} onChange={e => setWarrantyForm({ ...warrantyForm, validasi_by_mkt: e.target.value || null })} className="input-form">
                                       <option value="">-- belum diisi --</option>
                                       {STATUS_VALIDASI_GARANSI_OPTIONS.filter(o => o.value !== 'Menunggu').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Validasi Finance (FA)</label>
                                    <select aria-label="Validasi FA" value={warrantyForm.validasi_by_fa || ''} onChange={e => setWarrantyForm({ ...warrantyForm, validasi_by_fa: e.target.value || null })} className="input-form">
                                       <option value="">-- belum diisi --</option>
                                       {STATUS_VALIDASI_GARANSI_OPTIONS.filter(o => o.value !== 'Menunggu').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Catatan MKT</label>
                                    <textarea rows={2} aria-label="Catatan MKT" value={warrantyForm.catatan_mkt || ''} onChange={e => setWarrantyForm({ ...warrantyForm, catatan_mkt: e.target.value })} className="input-form resize-none" />
                                 </div>
                                 <div>
                                    <label className="label-form">Catatan FA</label>
                                    <textarea rows={2} aria-label="Catatan FA" value={warrantyForm.catatan_fa || ''} onChange={e => setWarrantyForm({ ...warrantyForm, catatan_fa: e.target.value })} className="input-form resize-none" />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Relasi Claim */}
                           <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Relasi Claim Promo (Opsional)</h3>
                              <div>
                                 <label className="label-form">ID Claim Terkait</label>
                                 <input type="text" value={warrantyForm.id_claim || ''} onChange={e => setWarrantyForm({ ...warrantyForm, id_claim: e.target.value || null })} className="input-form" placeholder="UUID dari claim_promo (auto saat submit via web /garansi?from_claim=1)" />
                                 <p className="text-[11px] text-gray-800 mt-1 font-medium">💡 Jika diisi, status garansi akan ikut Valid saat claim terkait Valid (di bot cek status).</p>
                              </div>
                           </div>

                           {/* Section: Dokumen */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                 <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Dokumen Pendukung</h3>
                                 {(warrantyForm.link_kartu_garansi || warrantyForm.link_nota_pembelian) && (
                                    <button type="button"
                                       onClick={() => openDualDocViewer(warrantyForm.link_kartu_garansi, warrantyForm.link_nota_pembelian)}
                                       className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                       Lihat Kedua Dokumen
                                    </button>
                                 )}
                              </div>
                              <div className="space-y-3">
                                 <div>
                                    <label className="label-form">Kartu Garansi</label>
                                    {typeof warrantyForm.link_kartu_garansi === 'string' && warrantyForm.link_kartu_garansi && (
                                       <button type="button" onClick={() => openImageViewer(warrantyForm.link_kartu_garansi as string)} className="block text-xs text-blue-600 font-bold hover:underline mb-2">🔗 Lihat dokumen saat ini</button>
                                    )}
                                    <input type="file" accept="image/*,application/pdf" aria-label="Upload kartu garansi" title="Upload kartu garansi" onChange={e => setWarrantyForm({ ...warrantyForm, link_kartu_garansi: e.target.files?.[0] || null })} className="input-form" />
                                    {warrantyForm.link_kartu_garansi instanceof File && (
                                       <p className="text-xs text-green-600 mt-1">File baru: {warrantyForm.link_kartu_garansi.name}</p>
                                    )}
                                    {typeof warrantyForm.link_kartu_garansi === 'string' && warrantyForm.link_kartu_garansi && (
                                       <button type="button" onClick={() => setWarrantyForm({ ...warrantyForm, link_kartu_garansi: null })} className="text-[11px] text-red-600 font-bold mt-1 hover:underline">Hapus dokumen ini</button>
                                    )}
                                 </div>
                                 <div>
                                    <label className="label-form">Nota Pembelian</label>
                                    {typeof warrantyForm.link_nota_pembelian === 'string' && warrantyForm.link_nota_pembelian && (
                                       <button type="button" onClick={() => openImageViewer(warrantyForm.link_nota_pembelian as string)} className="block text-xs text-blue-600 font-bold hover:underline mb-2">🔗 Lihat dokumen saat ini</button>
                                    )}
                                    <input type="file" accept="image/*,application/pdf" aria-label="Upload nota pembelian" title="Upload nota pembelian" onChange={e => setWarrantyForm({ ...warrantyForm, link_nota_pembelian: e.target.files?.[0] || null })} className="input-form" />
                                    {warrantyForm.link_nota_pembelian instanceof File && (
                                       <p className="text-xs text-green-600 mt-1">File baru: {warrantyForm.link_nota_pembelian.name}</p>
                                    )}
                                    {typeof warrantyForm.link_nota_pembelian === 'string' && warrantyForm.link_nota_pembelian && (
                                       <button type="button" onClick={() => setWarrantyForm({ ...warrantyForm, link_nota_pembelian: null })} className="text-[11px] text-red-600 font-bold mt-1 hover:underline">Hapus dokumen ini</button>
                                    )}
                                 </div>
                              </div>
                           </div>

                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Garansi'}</button>
                           </div>
                        </form>
                     )}

                     {/* ============ KONSUMEN FORM ============ */}
                     {activeTab === 'konsumen' && (
                        <form onSubmit={handleSaveKonsumen} className="space-y-4">
                           {/* Section: Identitas */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Identitas</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Nomor WhatsApp *</label>
                                    <input
                                       type="text"
                                       required
                                       disabled={modalAction === 'edit'}
                                       value={konsumenForm.nomor_wa || ''}
                                       onChange={e => setKonsumenForm({ ...konsumenForm, nomor_wa: e.target.value })}
                                       className="input-form disabled:bg-gray-100 disabled:cursor-not-allowed"
                                       placeholder="6281234567890 / 081234567890"
                                    />
                                    {modalAction === 'edit' && (
                                       <p className="text-[10px] text-gray-500 mt-1 italic">Nomor WA adalah primary key, tidak bisa diubah saat edit</p>
                                    )}
                                 </div>
                                 <div>
                                    <label className="label-form">ID Konsumen</label>
                                    <input
                                       type="text"
                                       aria-label="ID Konsumen"
                                       value={konsumenForm.id_konsumen || ''}
                                       onChange={e => setKonsumenForm({ ...konsumenForm, id_konsumen: e.target.value })}
                                       className="input-form"
                                       placeholder="Auto-generate (AN######) jika kosong"
                                    />
                                 </div>
                                 <div className="md:col-span-2">
                                    <label className="label-form">Nama Lengkap *</label>
                                    <input
                                       type="text"
                                       required
                                       aria-label="Nama Lengkap"
                                       value={konsumenForm.nama_lengkap || ''}
                                       onChange={e => setKonsumenForm({ ...konsumenForm, nama_lengkap: e.target.value })}
                                       className="input-form"
                                       list="dl-nama-lengkap"
                                    />
                                 </div>
                                 <div className="md:col-span-2">
                                    <label className="label-form">NIK (Nomor KTP)</label>
                                    <input
                                       type="text"
                                       value={konsumenForm.nik || ''}
                                       onChange={e => setKonsumenForm({ ...konsumenForm, nik: e.target.value })}
                                       className="input-form"
                                       pattern="[0-9]{16}|BELUM_DIISI"
                                       title="16 digit angka atau BELUM_DIISI"
                                       placeholder="16 digit (atau BELUM_DIISI jika belum tahu)"
                                    />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Alamat */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Alamat</h3>
                              <div className="space-y-3">
                                 <div>
                                    <label className="label-form">Alamat Rumah</label>
                                    <textarea
                                       rows={2}
                                       aria-label="Alamat Rumah"
                                       value={konsumenForm.alamat_rumah || ''}
                                       onChange={e => setKonsumenForm({ ...konsumenForm, alamat_rumah: e.target.value })}
                                       className="input-form resize-none"
                                       placeholder="Jalan, nomor rumah, RT/RW"
                                    />
                                 </div>
                                 <AddressFields
                                    values={{
                                       kelurahan: konsumenForm.kelurahan || '',
                                       kecamatan: konsumenForm.kecamatan || '',
                                       kabupaten_kotamadya: konsumenForm.kabupaten_kotamadya || '',
                                       provinsi: konsumenForm.provinsi || '',
                                       kodepos: konsumenForm.kodepos || '',
                                    }}
                                    onChange={partial => setKonsumenForm(prev => ({ ...prev, ...partial }))}
                                 />
                              </div>
                           </div>

                           {/* Section: Status Bot */}
                           <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Status Chatbot</h3>
                              <div>
                                 <label className="label-form">Status Langkah Bot</label>
                                 <select
                                    aria-label="Status langkah bot"
                                    value={konsumenForm.status_langkah || 'START'}
                                    onChange={e => setKonsumenForm({ ...konsumenForm, status_langkah: e.target.value })}
                                    className="input-form"
                                 >
                                    {STATUS_LANGKAH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                 </select>
                                 <p className="text-[11px] text-gray-800 mt-1 font-medium">💡 Reset ke <strong>START</strong> kalau konsumen stuck di tengah flow chatbot.</p>
                              </div>
                           </div>

                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Konsumen'}</button>
                           </div>
                        </form>
                     )}

                     {/* ============ CLAIM FORM ============ */}
                     {activeTab === 'claims' && (
                        <form id="claim-validasi-form" onSubmit={handleSaveClaim} className="space-y-4">
                           {/* Banner info combined form */}
                           {!validasiMode && <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                              <p className="text-xs text-gray-900 font-medium">
                                 💡 Form ini akan otomatis <strong>menambah/update konsumen</strong> di tabel konsumen sekaligus membuat claim baru. Cukup isi nomor WA — kalau sudah ada di sistem, data konsumen akan otomatis terisi.
                              </p>
                           </div>}

                           {/* Section: Identitas Pendaftar */}
                           {!validasiMode && <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Identitas Pendaftar & Penerima</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Nomor WhatsApp Pendaftar *</label>
                                    <input
                                       type="text"
                                       required
                                       value={claimForm.nomor_wa || ''}
                                       onChange={e => setClaimForm({ ...claimForm, nomor_wa: e.target.value })}
                                       onBlur={async e => {
                                          const wa = e.target.value.trim();
                                          if (!wa) return;
                                          const { data: kon } = await supabase.from('konsumen').select('nama_lengkap').eq('nomor_wa', wa).maybeSingle();
                                          if (kon && !claimForm.nama_pendaftar) {
                                             setClaimForm(prev => ({ ...prev, nama_pendaftar: kon.nama_lengkap || '' }));
                                          }
                                       }}
                                       className="input-form"
                                       placeholder="62812345678 / 081234567890 (tab = auto-fill data konsumen)"
                                    />
                                 </div>
                                 <div>
                                    <label className="label-form">Nomor WA Notifikasi Update</label>
                                    <input type="text" value={claimForm.nomor_wa_update || ''} onChange={e => setClaimForm({ ...claimForm, nomor_wa_update: e.target.value })} className="input-form" placeholder="Kosongkan = pakai nomor pendaftar" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nama Pendaftar *</label>
                                    <input type="text" required value={claimForm.nama_pendaftar || ''} onChange={e => setClaimForm({ ...claimForm, nama_pendaftar: e.target.value })} className="input-form" list="dl-nama-lengkap" placeholder="Auto-isi dari data konsumen" />
                                 </div>
                              </div>
                              <div className="mt-3 space-y-2">
                                 <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">📦 Alamat Pengiriman Hadiah</p>
                                 <div>
                                    <label className="label-form">Alamat Jalan / RT / RW</label>
                                    <textarea rows={2} aria-label="Alamat Pengiriman Hadiah" value={claimForm.alamat_pengiriman || ''} onChange={e => setClaimForm({ ...claimForm, alamat_pengiriman: e.target.value })} className="input-form resize-none" placeholder="Jl. Sudirman No. 10 RT 02/03" />
                                 </div>
                                 <AddressFields
                                    values={{
                                       provinsi:            claimForm.provinsi_pengiriman   || '',
                                       kabupaten_kotamadya: claimForm.kabupaten_pengiriman  || '',
                                       kecamatan:           claimForm.kecamatan_pengiriman  || '',
                                       kelurahan:           claimForm.kelurahan_pengiriman  || '',
                                       kodepos:             claimForm.kodepos_pengiriman    || '',
                                    }}
                                    onChange={partial => setClaimForm(prev => ({
                                       ...prev,
                                       ...(partial.provinsi            !== undefined && { provinsi_pengiriman:   partial.provinsi }),
                                       ...(partial.kabupaten_kotamadya !== undefined && { kabupaten_pengiriman:  partial.kabupaten_kotamadya }),
                                       ...(partial.kecamatan           !== undefined && { kecamatan_pengiriman:  partial.kecamatan }),
                                       ...(partial.kelurahan           !== undefined && { kelurahan_pengiriman:  partial.kelurahan }),
                                       ...(partial.kodepos             !== undefined && { kodepos_pengiriman:    partial.kodepos }),
                                    }))}
                                 />
                              </div>
                           </div>}

                           {/* Section: Data Produk */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Data Produk & Pembelian</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Nomor Seri *</label>
                                    <input type="text" required aria-label="Nomor Seri" value={claimForm.nomor_seri || ''} onChange={e => setClaimForm({ ...claimForm, nomor_seri: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Tipe Barang *</label>
                                    <input type="text" required aria-label="Tipe Barang" value={claimForm.tipe_barang || ''} onChange={e => setClaimForm({ ...claimForm, tipe_barang: e.target.value })} className="input-form" list="dl-tipe-barang" placeholder="Contoh: Nikon Z50 Kit 16-50mm" />
                                 </div>
                                 <div>
                                    <label className="label-form">Tanggal Pembelian *</label>
                                    <input type="date" aria-label="Tanggal pembelian" title="Tanggal pembelian" required value={claimForm.tanggal_pembelian?.substring(0, 10) || ''} onChange={e => setClaimForm({ ...claimForm, tanggal_pembelian: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nama Toko</label>
                                    <input type="text" aria-label="Nama Toko" value={claimForm.nama_toko || ''} onChange={e => setClaimForm({ ...claimForm, nama_toko: e.target.value })} className="input-form" list="dl-nama-toko" />
                                 </div>
                                 <div className="md:col-span-2">
                                    <label className="label-form">Jenis Promosi</label>
                                    <select aria-label="Jenis promosi" value={claimForm.jenis_promosi || ''} onChange={e => setClaimForm({ ...claimForm, jenis_promosi: e.target.value })} className="input-form">
                                       <option value="">-- Pilih jenis promosi --</option>
                                       {/* Ambil dari Nama Promo tab Promo (yang aktif) + opsi statik fallback */}
                                       {promos.filter(p => p.status_aktif).map(p => (
                                          <option key={p.id_promo} value={p.nama_promo}>{p.nama_promo}</option>
                                       ))}
                                       <option disabled>──────────</option>
                                       {JENIS_PROMOSI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                              </div>
                           </div>

                           {/* Section: Validasi & Status */}
                           <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Status Validasi</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Validasi Marketing (MKT) *</label>
                                    <select aria-label="Validasi MKT" required value={claimForm.validasi_by_mkt || 'Dalam Proses Verifikasi'} onChange={e => setClaimForm({ ...claimForm, validasi_by_mkt: e.target.value })} className="input-form">
                                       {VALIDASI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Validasi Finance (FA) *</label>
                                    <select aria-label="Validasi FA" required value={claimForm.validasi_by_fa || 'Dalam Proses Verifikasi'} onChange={e => setClaimForm({ ...claimForm, validasi_by_fa: e.target.value })} className="input-form">
                                       {VALIDASI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Catatan MKT</label>
                                    <textarea rows={2} aria-label="Catatan MKT" value={claimForm.catatan_mkt || ''} onChange={e => setClaimForm({ ...claimForm, catatan_mkt: e.target.value })} className="input-form resize-none" />
                                 </div>
                                 <div>
                                    <label className="label-form">Catatan FA</label>
                                    <textarea rows={2} aria-label="Catatan FA" value={claimForm.catatan_fa || ''} onChange={e => setClaimForm({ ...claimForm, catatan_fa: e.target.value })} className="input-form resize-none" />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Pengiriman Hadiah */}
                           {!validasiMode && <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Pengiriman Hadiah</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Jasa Pengiriman</label>
                                    <select aria-label="Jasa pengiriman" value={claimForm.nama_jasa_pengiriman || ''} onChange={e => setClaimForm({ ...claimForm, nama_jasa_pengiriman: e.target.value })} className="input-form">
                                       <option value="">-- Pilih jasa kirim --</option>
                                       {JASA_PENGIRIMAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Nomor Resi</label>
                                    <input type="text" aria-label="Nomor Resi" value={claimForm.nomor_resi || ''} onChange={e => setClaimForm({ ...claimForm, nomor_resi: e.target.value })} className="input-form" />
                                 </div>
                              </div>
                           </div>}

                           {/* Section: Dokumen */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                                 <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Dokumen Pendukung</h3>
                                 {(claimForm.link_kartu_garansi || claimForm.link_nota_pembelian) && (
                                    <button type="button"
                                       onClick={() => openDualDocViewer(claimForm.link_kartu_garansi, claimForm.link_nota_pembelian)}
                                       className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors">
                                       <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                       Lihat Kedua Dokumen
                                    </button>
                                 )}
                              </div>
                              <div className="space-y-3">
                                 <div>
                                    <label className="label-form">Kartu Garansi</label>
                                    {typeof claimForm.link_kartu_garansi === 'string' && claimForm.link_kartu_garansi && (
                                       <button type="button" onClick={() => openImageViewer(claimForm.link_kartu_garansi as string)} className="block text-xs text-blue-600 font-bold hover:underline mb-2">🔗 Lihat dokumen saat ini</button>
                                    )}
                                    <input type="file" accept="image/*,application/pdf" aria-label="Upload kartu garansi" title="Upload kartu garansi" onChange={e => setClaimForm({ ...claimForm, link_kartu_garansi: e.target.files?.[0] || null })} className="input-form" />
                                    {claimForm.link_kartu_garansi instanceof File && (
                                       <p className="text-xs text-green-600 mt-1">File baru: {claimForm.link_kartu_garansi.name}</p>
                                    )}
                                    {typeof claimForm.link_kartu_garansi === 'string' && claimForm.link_kartu_garansi && (
                                       <button type="button" onClick={() => setClaimForm({ ...claimForm, link_kartu_garansi: null })} className="text-[11px] text-red-600 font-bold mt-1 hover:underline">Hapus dokumen ini</button>
                                    )}
                                 </div>
                                 <div>
                                    <label className="label-form">Nota Pembelian</label>
                                    {typeof claimForm.link_nota_pembelian === 'string' && claimForm.link_nota_pembelian && (
                                       <button type="button" onClick={() => openImageViewer(claimForm.link_nota_pembelian as string)} className="block text-xs text-blue-600 font-bold hover:underline mb-2">🔗 Lihat dokumen saat ini</button>
                                    )}
                                    <input type="file" accept="image/*,application/pdf" aria-label="Upload nota pembelian" title="Upload nota pembelian" onChange={e => setClaimForm({ ...claimForm, link_nota_pembelian: e.target.files?.[0] || null })} className="input-form" />
                                    {claimForm.link_nota_pembelian instanceof File && (
                                       <p className="text-xs text-green-600 mt-1">File baru: {claimForm.link_nota_pembelian.name}</p>
                                    )}
                                    {typeof claimForm.link_nota_pembelian === 'string' && claimForm.link_nota_pembelian && (
                                       <button type="button" onClick={() => setClaimForm({ ...claimForm, link_nota_pembelian: null })} className="text-[11px] text-red-600 font-bold mt-1 hover:underline">Hapus dokumen ini</button>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {!validasiMode && (
                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Claim'}</button>
                           </div>
                           )}
                        </form>
                     )}

                     {/* ============ EVENT FORM ============ */}
                     {activeTab === 'events' && (
                        <form onSubmit={handleSaveEvent} className="space-y-4">
                           {(() => {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const ef = eventForm as any;
                              const getVal = (k: string, alt?: string) => ef[k] ?? (alt ? ef[alt] : '') ?? '';
                              const setField = (k: string, v: unknown) => setEventForm({ ...eventForm, [k]: v });
                              return (
                                 <>
                                    <div>
                                       <label className="label-form">Judul Event *</label>
                                       <input type="text" required value={getVal('event_title', 'title')} onChange={e => setField('event_title', e.target.value)} className="input-form" list="dl-judul-event" placeholder="Contoh: Nikon On The Sport" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="label-form">Tanggal *</label>
                                          {(() => {
                                             // Parse "1 Juli 2026" → ISO for date picker, lalu format kembali ke "DD MMM YYYY"
                                             const ID_MONTHS_FULL = ['januari','februari','maret','april','mei','juni','juli','agustus','september','oktober','november','desember'];
                                             const EN_MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                             const currentValue = getVal('event_date', 'date');
                                             // Try parse current value to ISO yyyy-mm-dd
                                             const parseToISO = (str: string) => {
                                                if (!str) return '';
                                                // Coba parse "DD MMM YYYY" (English short)
                                                const enMatch = str.trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
                                                if (enMatch) {
                                                   const monthIdx = EN_MONTHS_SHORT.findIndex(m => m.toLowerCase() === enMatch[2].toLowerCase());
                                                   if (monthIdx >= 0) return `${enMatch[3]}-${String(monthIdx + 1).padStart(2, '0')}-${String(parseInt(enMatch[1])).padStart(2, '0')}`;
                                                }
                                                // Coba parse "D Bulan YYYY" (Indonesian full)
                                                const idMatch = str.trim().toLowerCase().match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
                                                if (idMatch) {
                                                   const monthIdx = ID_MONTHS_FULL.findIndex(m => m === idMatch[2]);
                                                   if (monthIdx >= 0) return `${idMatch[3]}-${String(monthIdx + 1).padStart(2, '0')}-${String(parseInt(idMatch[1])).padStart(2, '0')}`;
                                                }
                                                return '';
                                             };
                                             const isoVal = parseToISO(currentValue);
                                             return (
                                                <>
                                                   <input
                                                      type="date"
                                                      required
                                                      value={isoVal}
                                                      onChange={e => {
                                                         const iso = e.target.value;
                                                         if (!iso) { setField('event_date', ''); return; }
                                                         const [y, m, d] = iso.split('-').map(Number);
                                                         const formatted = `${String(d).padStart(2, '0')} ${EN_MONTHS_SHORT[m - 1]} ${y}`;
                                                         setField('event_date', formatted);
                                                      }}
                                                      className="input-form"
                                                      aria-label="Tanggal event"
                                                   />
                                                   <p className="text-[10px] text-gray-700 mt-1 font-medium">
                                                      Format tersimpan: <code className="bg-gray-100 px-1 rounded font-mono">{currentValue || '01 May 2026'}</code>
                                                   </p>
                                                </>
                                             );
                                          })()}
                                       </div>
                                       <div>
                                          <label className="label-form">Harga *</label>
                                          <input type="text" required aria-label="Harga" value={getVal('event_price', 'price')} onChange={e => setField('event_price', e.target.value)} className="input-form" placeholder="Contoh: Rp 50.000" />
                                       </div>
                                    </div>
                                    {/* Jadwal Tampil & Pendaftaran */}
                                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                                       <p className="text-xs font-bold text-blue-800 uppercase tracking-wide">🗓 Jadwal Tampil &amp; Pendaftaran</p>
                                       <div>
                                          <label className="label-form">Tampil Mulai</label>
                                          <input type="date" aria-label="Tampil Mulai" value={getVal('display_start_date') || ''} onChange={e => setField('display_start_date', e.target.value || null)} className="input-form" />
                                          <p className="form-helper">Kartu event muncul di halaman publik mulai tanggal ini (kosongkan = langsung tampil)</p>
                                       </div>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                             <label className="label-form">Pendaftaran Dibuka</label>
                                             <input type="date" aria-label="Pendaftaran Dibuka" value={getVal('registration_open_date') || ''} onChange={e => setField('registration_open_date', e.target.value || null)} className="input-form" />
                                             <p className="form-helper">Form daftar aktif mulai tanggal ini (boleh berbeda dari Tampil Mulai)</p>
                                          </div>
                                          <div>
                                             <label className="label-form">Pendaftaran Ditutup</label>
                                             <input type="date" aria-label="Pendaftaran Ditutup" value={getVal('registration_close_date') || ''} onChange={e => setField('registration_close_date', e.target.value || null)} className="input-form" />
                                             <p className="form-helper">Pendaftaran ditutup setelah tanggal ini</p>
                                          </div>
                                       </div>
                                    </div>
                                    <div>
                                       <label className="label-form">Deskripsi Event *</label>
                                       <textarea required rows={4} aria-label="Deskripsi Event" value={getVal('event_description', 'detail_acara')} onChange={e => setField('event_description', e.target.value)} className="input-form resize-none" placeholder="Detail acara, agenda, dll." />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="label-form">Kuota Peserta *</label>
                                          <input type="number" required min={0} aria-label="Kuota Peserta" value={getVal('event_partisipant_stock', 'stock')} onChange={e => setField('event_partisipant_stock', parseInt(e.target.value) || 0)} className="input-form" />
                                       </div>
                                       <div>
                                          <label className="label-form">Status</label>
                                          <select aria-label="Status Event" value={getVal('event_status', 'status') || 'In stock'} onChange={e => setField('event_status', e.target.value)} className="input-form">
                                             {EVENT_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                          </select>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="label-form">Speaker</label>
                                          <input type="text" value={getVal('event_speaker')} onChange={e => setField('event_speaker', e.target.value)} className="input-form" list="dl-speaker" placeholder="Nama pembicara" />
                                       </div>
                                       <div>
                                          <label className="label-form">Genre Speaker</label>
                                          <input type="text" value={getVal('event_speaker_genre')} onChange={e => setField('event_speaker_genre', e.target.value)} className="input-form" list="dl-genre-speaker" placeholder="Wildlife, Landscape, dll." />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="label-form">Tipe Pembayaran</label>
                                          <select aria-label="Tipe Pembayaran" value={getVal('event_payment_tipe') || 'regular'} onChange={e => setField('event_payment_tipe', e.target.value)} className="input-form">
                                             {PAYMENT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                          </select>
                                       </div>
                                       <div>
                                          <label className="label-form">Jumlah Deposit (jika deposit)</label>
                                          <input type="text" value={getVal('deposit_amount')} onChange={e => setField('deposit_amount', e.target.value)} className="input-form" list="dl-deposit-amount" placeholder="Contoh: 50000" />
                                       </div>
                                    </div>
                                    <div>
                                       <label className="label-form">Info Rekening Pembayaran</label>
                                       <input type="text" value={getVal('bank_info')} onChange={e => setField('bank_info', e.target.value)} className="input-form" list="dl-bank-info" placeholder="Contoh: BCA 123456789 a.n. Nikon Indonesia" />
                                    </div>
                                    <div>
                                       <label className="label-form">Jam Acara</label>
                                       <input type="text" value={getVal('event_time')} onChange={e => setField('event_time', e.target.value)} className="input-form" placeholder="Contoh: 09.00 WIB - Selesai" />
                                    </div>
                                    <div>
                                       <label className="label-form">Lokasi Acara</label>
                                       <input type="text" value={getVal('event_location')} onChange={e => setField('event_location', e.target.value)} className="input-form" placeholder="Contoh: Studio TV, ISBI Bandung" />
                                    </div>
                                    <div>
                                       <label className="label-form">Link Grup WhatsApp</label>
                                       <input type="url" value={getVal('wa_group_link')} onChange={e => setField('wa_group_link', e.target.value)} className="input-form" placeholder="https://chat.whatsapp.com/..." />
                                    </div>
                                    <div>
                                       <label className="label-form">Poster Event {getVal('event_image', 'image') ? '(Upload ulang akan mengganti)' : ''}</label>
                                       {getVal('event_image', 'image') && !eventImageFile && (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={driveImgSrc(getVal('event_image', 'image'))} alt="Poster saat ini" className="w-32 h-44 object-cover rounded-lg border border-gray-200 mb-2" />
                                       )}
                                       <input
                                          type="file"
                                          accept="image/*"
                                          aria-label="Upload poster event"
                                          title="Upload poster event"
                                          onChange={e => setEventImageFile(e.target.files?.[0] || null)}
                                          className="input-form"
                                       />
                                       {eventImageFile && <p className="text-xs text-green-600 mt-1">File baru: {eventImageFile.name}</p>}
                                    </div>
                                    <div className="mt-6 flex justify-end gap-3">
                                       <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                                       <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Event'}</button>
                                    </div>
                                 </>
                              );
                           })()}
                        </form>
                     )}

                     {/* ============ LENDING RETURN FORM ============ */}
                     {activeTab === 'lending' && modalAction === 'return' && (
                        <div className="space-y-4">
                           {/* Info Peminjam (read-only) */}
                           <div className="bg-gray-900 text-white rounded-lg p-4">
                              <div className="flex items-center justify-between gap-3">
                                 <div>
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Peminjam</p>
                                    <h3 className="text-base font-bold mt-0.5">{lendingForm.nama_peminjam || '-'}</h3>
                                    <p className="text-xs text-gray-300 mt-0.5">{lendingForm.nomor_wa_peminjam || '-'}</p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Tgl Pinjam</p>
                                    <p className="text-xs text-white font-bold mt-0.5">{lendingForm.tanggal_peminjaman ? new Date(lendingForm.tanggal_peminjaman).toLocaleDateString('id-ID') : '-'}</p>
                                    {lendingForm.tanggal_estimasi_pengembalian && (
                                       <>
                                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mt-2">Estimasi</p>
                                          <p className="text-xs text-amber-300 font-bold mt-0.5">{new Date(lendingForm.tanggal_estimasi_pengembalian).toLocaleDateString('id-ID')}</p>
                                       </>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {/* Banner instruksi */}
                           <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                              <p className="text-xs text-gray-900 font-medium">
                                 💡 Centang barang yang dikembalikan + isi <strong>catatan kondisi</strong> (mis. &quot;Mulus&quot;, &quot;Lensa baret kecil&quot;). Jika semua barang dikembalikan, peminjaman akan otomatis ditutup (status: <code className="bg-white px-1 rounded">selesai</code>) dan notifikasi WA otomatis terkirim ke peminjam.
                              </p>
                           </div>

                           {/* List Items */}
                           <div className="space-y-3">
                              {(lendingForm.items_dipinjam || []).map((item, idx) => {
                                 const sudahKembali = item.status_pengembalian === 'dikembalikan';
                                 return (
                                    <div key={idx} className={`rounded-lg border-2 p-4 transition-all ${sudahKembali ? 'bg-green-50 border-green-400' : 'bg-white border-gray-300'}`}>
                                       <div className="flex items-start gap-3">
                                          <label className="flex items-center justify-center w-6 h-6 mt-0.5 cursor-pointer shrink-0">
                                             <input
                                                type="checkbox"
                                                checked={sudahKembali}
                                                onChange={e => {
                                                   const newItems = [...(lendingForm.items_dipinjam || [])];
                                                   newItems[idx] = {
                                                      ...newItems[idx],
                                                      status_pengembalian: e.target.checked ? 'dikembalikan' : 'dipinjam',
                                                   };
                                                   setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                                }}
                                                className="w-5 h-5 accent-green-600 cursor-pointer"
                                                aria-label={`Mark ${item.nama_barang} sebagai dikembalikan`}
                                             />
                                          </label>
                                          <div className="flex-1 min-w-0">
                                             <div className="flex items-center justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                   <p className={`font-bold text-sm ${sudahKembali ? 'line-through text-gray-700' : 'text-gray-900'}`}>{item.nama_barang}</p>
                                                   <p className="text-xs text-gray-800 font-mono mt-0.5">SN: {item.nomor_seri}</p>
                                                   {item.catatan && (
                                                      <p className="text-[11px] text-gray-700 italic mt-1">Catatan pinjam: {item.catatan}</p>
                                                   )}
                                                </div>
                                                {sudahKembali && (
                                                   <span className="px-2 py-1 rounded-md bg-green-600 text-white text-[10px] font-bold uppercase shrink-0">✓ Dikembalikan</span>
                                                )}
                                             </div>
                                             {/* Accessories checklist */}
                                             {(() => {
                                                const accs = (['accs1','accs2','accs3','accs4','accs5','accs6','accs7'] as const).map(k => item[k]).filter(Boolean) as string[];
                                                if (!accs.length) return null;
                                                return (
                                                   <div className={`mt-2 rounded-md border px-3 py-2 space-y-1.5 ${sudahKembali ? 'border-green-200 bg-green-50/60' : 'border-gray-200 bg-gray-50'}`}>
                                                      <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Aksesori</p>
                                                      {accs.map((a, ai) => {
                                                         const checked = accsReturnChecked[idx]?.[a] ?? false;
                                                         return (
                                                            <label key={ai} className="flex items-center gap-2 cursor-pointer">
                                                               <input
                                                                  type="checkbox"
                                                                  checked={checked}
                                                                  onChange={e => setAccsReturnChecked(prev => ({
                                                                     ...prev,
                                                                     [idx]: { ...(prev[idx] || {}), [a]: e.target.checked },
                                                                  }))}
                                                                  className="w-4 h-4 accent-green-600 cursor-pointer shrink-0"
                                                                  aria-label={`Aksesori ${a} dikembalikan`}
                                                               />
                                                               <span className={`text-xs font-medium ${checked ? 'line-through text-gray-400' : 'text-gray-800'}`}>{a}</span>
                                                               {checked && <span className="text-[9px] text-green-600 font-bold">✓</span>}
                                                            </label>
                                                         );
                                                      })}
                                                   </div>
                                                );
                                             })()}
                                             {sudahKembali && (
                                                <div className="mt-3">
                                                   <label className="block text-[10px] font-bold text-gray-900 uppercase tracking-wider mb-1">Catatan Kondisi saat Kembali</label>
                                                   <input
                                                      type="text"
                                                      value={item.catatan_pengembalian || ''}
                                                      onChange={e => {
                                                         const newItems = [...(lendingForm.items_dipinjam || [])];
                                                         newItems[idx] = { ...newItems[idx], catatan_pengembalian: e.target.value };
                                                         setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                                      }}
                                                      placeholder="Contoh: Mulus / Lensa baret kecil / Body OK"
                                                      className="w-full px-3 py-2 rounded-lg border-2 border-green-300 bg-white text-sm text-gray-900 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500"
                                                      aria-label="Catatan kondisi pengembalian"
                                                   />
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>

                           {/* Summary status */}
                           {(() => {
                              const total = lendingForm.items_dipinjam?.length || 0;
                              const returned = lendingForm.items_dipinjam?.filter(i => i.status_pengembalian === 'dikembalikan').length || 0;
                              const semua = total > 0 && total === returned;
                              return (
                                 <div className={`rounded-lg p-3 text-center border-2 ${semua ? 'bg-green-100 border-green-400' : 'bg-amber-50 border-amber-300'}`}>
                                    <p className="text-sm font-bold text-gray-900">
                                       {returned} dari {total} barang dikembalikan
                                       {semua && <span className="ml-2 text-green-800">→ Peminjaman akan ditutup</span>}
                                       {!semua && total > returned && returned > 0 && <span className="ml-2 text-amber-800">→ Peminjaman tetap aktif</span>}
                                    </p>
                                 </div>
                              );
                           })()}

                           {/* FOTO BUKTI PENGEMBALIAN */}
                           <div className="space-y-2">
                              <label className="block text-sm font-bold text-gray-700">📷 Foto Bukti Pengembalian (maks 10)</label>
                              {/* Existing photos */}
                              {Array.isArray(lendingForm.foto_pengembalian) && (lendingForm.foto_pengembalian as string[]).length > 0 && (
                                 <div className="flex flex-wrap gap-2">
                                    {(lendingForm.foto_pengembalian as string[]).map((url, fi) => {
                                       const src = proxyImg(url) || url;
                                       return (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img key={fi} src={src} alt={`pengembalian ${fi + 1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                                       );
                                    })}
                                 </div>
                              )}
                              {lendingFotoPengembalianFiles.length > 0 && (
                                 <div className="flex flex-wrap gap-2">
                                    {lendingFotoPengembalianFiles.map((f, fi) => (
                                       <div key={fi} className="relative">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-green-300" />
                                          <button type="button" onClick={() => setLendingFotoPengembalianFiles(prev => prev.filter((_, j) => j !== fi))}
                                             className="absolute -top-1 -right-1 bg-red-500 text-white rounded-md w-4 h-4 text-[10px] flex items-center justify-center leading-none">×</button>
                                       </div>
                                    ))}
                                 </div>
                              )}
                              <input type="file" accept="image/*" multiple
                                 disabled={lendingFotoPengembalianFiles.length + (Array.isArray(lendingForm.foto_pengembalian) ? (lendingForm.foto_pengembalian as string[]).length : 0) >= 10}
                                 onChange={e => {
                                    const existing = Array.isArray(lendingForm.foto_pengembalian) ? (lendingForm.foto_pengembalian as string[]).length : 0;
                                    const remaining = 10 - existing - lendingFotoPengembalianFiles.length;
                                    const files = Array.from(e.target.files || []).slice(0, remaining);
                                    setLendingFotoPengembalianFiles(prev => [...prev, ...files]);
                                    e.target.value = '';
                                 }}
                                 className="text-sm text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-green-400 file:text-black file:text-xs file:font-bold file:cursor-pointer"
                                 aria-label="Upload foto bukti pengembalian" />
                              <p className="text-[11px] text-gray-500">{lendingFotoPengembalianFiles.length + (Array.isArray(lendingForm.foto_pengembalian) ? (lendingForm.foto_pengembalian as string[]).length : 0)}/10 foto</p>
                           </div>

                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button
                                 type="button"
                                 onClick={() => handleReturnItems(lendingForm as PeminjamanBarang, accsReturnChecked)}
                                 disabled={isSubmitting}
                                 className="btn-primary"
                              >
                                 {isSubmitting ? 'Memproses...' : '✓ Konfirmasi Pengembalian'}
                              </button>
                           </div>
                        </div>
                     )}

                     {/* ============ LENDING FORM (Create & Edit) ============ */}
                     {activeTab === 'lending' && modalAction !== 'return' && (
                        <form onSubmit={handleSaveLending} className="space-y-4">
                           {/* Identitas Peminjam */}
                           <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-3">
                              <div className="flex items-center justify-between">
                                 <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Identitas Peminjam</span>
                                 <button
                                    type="button"
                                    onClick={() => { setContactPickerSearch(''); setShowContactPicker(true); }}
                                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition"
                                 >
                                    👤 Pilih dari Kontak
                                 </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                 <div>
                                    <label className="label-form">Nama Peminjam *</label>
                                    <input type="text" required aria-label="Nama Peminjam" value={lendingForm.nama_peminjam || ''} onChange={e => setLendingForm({ ...lendingForm, nama_peminjam: e.target.value })} className="input-form" placeholder="Ketik nama atau pilih dari kontak" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nomor WhatsApp *</label>
                                    <input type="text" required aria-label="Nomor WhatsApp Peminjam" value={lendingForm.nomor_wa_peminjam || ''} onChange={e => setLendingForm({ ...lendingForm, nomor_wa_peminjam: e.target.value })} className="input-form" placeholder="08xxx / 628xxx / +628xxx / +61xxx" />
                                 </div>
                              </div>
                           </div>

                           {/* ── Contact Picker Modal ── */}
                           {showContactPicker && (
                              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowContactPicker(false); setShowAddContactForm(false); setAddContactForm({ nama: '', nomor_wa: '' }); setAddContactError(''); }}>
                                 <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                                    <div className="p-4 border-b border-gray-200">
                                       <div className="flex items-center justify-between mb-2">
                                          <h3 className="font-bold text-gray-900 text-sm">{showAddContactForm ? 'Tambah Kontak Baru' : 'Pilih Kontak'}</h3>
                                          {!showAddContactForm && (
                                             <button
                                                type="button"
                                                onClick={() => { setShowAddContactForm(true); setAddContactForm({ nama: contactPickerSearch, nomor_wa: '' }); setAddContactError(''); }}
                                                className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-2.5 py-1 rounded-lg transition"
                                             >
                                                + Kontak Baru
                                             </button>
                                          )}
                                       </div>
                                       {!showAddContactForm && (
                                          <input
                                             type="text"
                                             autoFocus
                                             value={contactPickerSearch}
                                             onChange={e => setContactPickerSearch(e.target.value)}
                                             placeholder="🔍 Cari nama atau nomor WA..."
                                             className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
                                          />
                                       )}
                                    </div>

                                    {showAddContactForm ? (
                                       <div className="p-4 space-y-3 flex-1">
                                          {addContactError && (
                                             <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">{addContactError}</div>
                                          )}
                                          <div>
                                             <label className="block text-xs font-bold text-gray-700 mb-1">Nama Lengkap *</label>
                                             <input
                                                type="text"
                                                autoFocus
                                                value={addContactForm.nama}
                                                onChange={e => setAddContactForm(p => ({ ...p, nama: e.target.value }))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                                                placeholder="Nama lengkap kontak"
                                             />
                                          </div>
                                          <div>
                                             <label className="block text-xs font-bold text-gray-700 mb-1">Nomor WhatsApp *</label>
                                             <input
                                                type="text"
                                                value={addContactForm.nomor_wa}
                                                onChange={e => setAddContactForm(p => ({ ...p, nomor_wa: e.target.value }))}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-green-500"
                                                placeholder="08xxx / 628xxx"
                                             />
                                          </div>
                                          <div className="flex gap-2 pt-1">
                                             <button
                                                type="button"
                                                onClick={() => { setShowAddContactForm(false); setAddContactError(''); }}
                                                className="flex-1 py-2 text-sm text-gray-600 font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition"
                                             >
                                                Batal
                                             </button>
                                             <button
                                                type="button"
                                                disabled={addContactLoading || !addContactForm.nama.trim() || !addContactForm.nomor_wa.trim()}
                                                onClick={async () => {
                                                   setAddContactError('');
                                                   setAddContactLoading(true);
                                                   try {
                                                      const wa = normalizeWaNumber(addContactForm.nomor_wa.trim());
                                                      const existing = consumersList.find(c => c.nomor_wa === wa);
                                                      if (!existing) {
                                                         const { error } = await sbWrite({
                                                            action: 'insert',
                                                            table: 'konsumen',
                                                            data: {
                                                               nomor_wa: wa,
                                                               nama_lengkap: addContactForm.nama.trim(),
                                                               status_langkah: 'START',
                                                               nik: 'BELUM_DIISI',
                                                               alamat_rumah: 'BELUM_DIISI',
                                                               kelurahan: 'BELUM_DIISI',
                                                               kecamatan: 'BELUM_DIISI',
                                                               kabupaten_kotamadya: 'BELUM_DIISI',
                                                               provinsi: 'BELUM_DIISI',
                                                               kodepos: 'BELUM_DIISI',
                                                            },
                                                         });
                                                         if (error) { setAddContactError(error.message || 'Gagal menyimpan kontak'); return; }
                                                         await fetchTable<KonsumenData>('konsumen', setConsumersList);
                                                      }
                                                      setLendingForm(prev => ({ ...prev, nama_peminjam: addContactForm.nama.trim(), nomor_wa_peminjam: wa }));
                                                      setShowContactPicker(false);
                                                      setShowAddContactForm(false);
                                                      setAddContactForm({ nama: '', nomor_wa: '' });
                                                   } catch (err) {
                                                      setAddContactError(err instanceof Error ? err.message : 'Terjadi kesalahan');
                                                   } finally {
                                                      setAddContactLoading(false);
                                                   }
                                                }}
                                                className="flex-1 py-2 text-sm text-white font-bold rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-60 transition"
                                             >
                                                {addContactLoading ? 'Menyimpan...' : 'Simpan & Pilih'}
                                             </button>
                                          </div>
                                       </div>
                                    ) : (
                                       <div className="overflow-y-auto flex-1">
                                          {(() => {
                                             const q = contactPickerSearch.toLowerCase();
                                             const filtered = consumersList.filter(c =>
                                                (c.nama_lengkap || '').toLowerCase().includes(q) ||
                                                (c.nomor_wa || '').toLowerCase().includes(q)
                                             ).slice(0, 50);
                                             if (filtered.length === 0) return (
                                                <div className="text-center py-8 space-y-3">
                                                   <p className="text-sm text-gray-400">Kontak tidak ditemukan</p>
                                                   <button
                                                      type="button"
                                                      onClick={() => { setShowAddContactForm(true); setAddContactForm({ nama: contactPickerSearch, nomor_wa: '' }); setAddContactError(''); }}
                                                      className="text-sm font-bold text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2 rounded-lg transition"
                                                   >
                                                      + Tambah Kontak Baru
                                                   </button>
                                                </div>
                                             );
                                             return filtered.map(c => (
                                                <button
                                                   key={c.nomor_wa}
                                                   type="button"
                                                   className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 transition"
                                                   onClick={() => {
                                                      setLendingForm(prev => ({
                                                         ...prev,
                                                         nama_peminjam: c.nama_lengkap,
                                                         nomor_wa_peminjam: c.nomor_wa,
                                                      }));
                                                      setShowContactPicker(false);
                                                   }}
                                                >
                                                   <p className="font-semibold text-gray-900 text-sm">{c.nama_lengkap}</p>
                                                   <p className="text-xs text-gray-500 font-mono mt-0.5">{c.nomor_wa}</p>
                                                </button>
                                             ));
                                          })()}
                                       </div>
                                    )}

                                    {!showAddContactForm && (
                                       <div className="p-3 border-t border-gray-100">
                                          <button type="button" onClick={() => setShowContactPicker(false)} className="w-full text-sm text-gray-500 font-bold py-2 rounded-lg hover:bg-gray-100 transition">Tutup</button>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )}
                           <div>
                              <label className="label-form">Estimasi Tanggal Pengembalian</label>
                              <input
                                 type="date"
                                 aria-label="Estimasi tanggal pengembalian"
                                 title="Estimasi tanggal pengembalian"
                                 value={lendingForm.tanggal_estimasi_pengembalian ? lendingForm.tanggal_estimasi_pengembalian.substring(0, 10) : ''}
                                 onChange={e => setLendingForm({ ...lendingForm, tanggal_estimasi_pengembalian: e.target.value ? new Date(e.target.value).toISOString() : null })}
                                 className="input-form"
                              />
                              <p className="text-[11px] text-gray-800 mt-1 font-medium">📅 Reminder WhatsApp akan otomatis dikirim ke peminjam <strong>3 hari sebelum</strong> tanggal ini.</p>
                              {lendingForm.reminder_sent_at && (
                                 <p className="text-[11px] text-green-700 font-bold mt-1">✓ Reminder sudah terkirim pada {new Date(lendingForm.reminder_sent_at).toLocaleString('id-ID')}</p>
                              )}
                           </div>
                           <div>
                              <label className="label-form">KTP Peminjam (Foto)</label>
                              {typeof lendingForm.link_ktp_peminjam === 'string' && lendingForm.link_ktp_peminjam && (
                                 // eslint-disable-next-line @next/next/no-img-element
                                 <img src={proxyImg(lendingForm.link_ktp_peminjam) || lendingForm.link_ktp_peminjam} alt="KTP saat ini" className="w-32 h-20 object-cover rounded-lg border border-gray-200 mb-2" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              )}
                              <input
                                 type="file"
                                 accept="image/*"
                                 aria-label="Upload foto KTP"
                                 title="Upload foto KTP"
                                 onChange={e => setLendingForm({ ...lendingForm, link_ktp_peminjam: e.target.files?.[0] || null })}
                                 className="input-form"
                              />
                              {lendingForm.link_ktp_peminjam instanceof File && (
                                 <p className="text-xs text-green-600 mt-1">File baru: {lendingForm.link_ktp_peminjam.name}</p>
                              )}
                           </div>
                           <datalist id="dl-asset-sn">
                              {/* from barang_aset */}
                              {assets.map(a => a.no_seri_aset ? <option key={a.id} value={a.no_seri_aset}>{a.nama_barang_aset}</option> : null)}
                              {/* from past lending records */}
                              {Array.from(new Set(lendingRecords.flatMap(l => l.items_dipinjam.map(i => i.nomor_seri)).filter(Boolean))).filter(sn => !assets.some(a => a.no_seri_aset === sn)).map((sn, i) => (
                                 <option key={`l-sn-${i}`} value={sn} />
                              ))}
                           </datalist>
                           <datalist id="dl-lending-nama">
                              {Array.from(new Set([
                                 ...assets.map(a => a.nama_barang_aset),
                                 ...lendingRecords.flatMap(l => l.items_dipinjam.map(i => i.nama_barang)),
                              ].filter(Boolean))).map((v, i) => <option key={i} value={v} />)}
                           </datalist>
                           <datalist id="dl-asset-accs">
                              {Array.from(new Set([
                                 ...assets.flatMap(a => [a.accs1,a.accs2,a.accs3,a.accs4,a.accs5,a.accs6,a.accs7]),
                                 ...lendingRecords.flatMap(l => l.items_dipinjam.flatMap(i => [i.accs1,i.accs2,i.accs3,i.accs4,i.accs5,i.accs6,i.accs7])),
                              ].filter(Boolean) as string[])).map((v, i) => (
                                 <option key={i} value={v} />
                              ))}
                           </datalist>
                           <div>
                              <label className="label-form">Barang yang Dipinjam *</label>
                              <div className="space-y-3">
                                 {(lendingForm.items_dipinjam || []).map((item, idx) => (
                                    <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                                       <div className="flex items-center justify-between">
                                          <span className="text-xs font-bold text-gray-600">Barang #{idx + 1}</span>
                                          {(lendingForm.items_dipinjam?.length || 0) > 1 && (
                                             <button type="button" onClick={() => {
                                                const newItems = [...(lendingForm.items_dipinjam || [])];
                                                newItems.splice(idx, 1);
                                                setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                             }} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                          )}
                                       </div>
                                       {/* Nomor Seri with autocomplete from barang_aset */}
                                       <input type="text" required list="dl-asset-sn" aria-label="Nomor Seri Barang" placeholder="Nomor Seri (ketik untuk autocomplete)" value={item.nomor_seri} onChange={e => {
                                          const val = e.target.value;
                                          const found = assets.find(a => a.no_seri_aset === val);
                                          const newItems = [...(lendingForm.items_dipinjam || [])];
                                          newItems[idx] = {
                                             ...newItems[idx],
                                             nomor_seri: val,
                                             ...(found ? {
                                                nama_barang: found.nama_barang_aset,
                                                accs1: found.accs1 || '',
                                                accs2: found.accs2 || '',
                                                accs3: found.accs3 || '',
                                                accs4: found.accs4 || '',
                                                accs5: found.accs5 || '',
                                                accs6: found.accs6 || '',
                                                accs7: found.accs7 || '',
                                             } : {}),
                                          };
                                          setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                       }} className="input-form" />
                                       <input type="text" required list="dl-lending-nama" aria-label="Nama Barang" placeholder="Nama Barang (otomatis dari No. Seri)" value={item.nama_barang} onChange={e => {
                                          const newItems = [...(lendingForm.items_dipinjam || [])];
                                          newItems[idx] = { ...newItems[idx], nama_barang: e.target.value };
                                          setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                       }} className="input-form" />
                                       {/* Accessories 1–7 */}
                                       <div className="grid grid-cols-1 gap-2">
                                          {(['accs1','accs2','accs3','accs4','accs5','accs6','accs7'] as const).map((accsKey, i) => (
                                             <input key={accsKey} type="text" list="dl-asset-accs" aria-label={`Aksesoris ${i+1}`} placeholder={`Aksesoris ${i+1} (opsional)`} value={item[accsKey] || ''} onChange={e => {
                                                const newItems = [...(lendingForm.items_dipinjam || [])];
                                                newItems[idx] = { ...newItems[idx], [accsKey]: e.target.value };
                                                setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                             }} className="input-form text-sm" />
                                          ))}
                                       </div>
                                       <input type="text" aria-label="Catatan Barang" placeholder="Catatan (opsional)" value={item.catatan || ''} onChange={e => {
                                          const newItems = [...(lendingForm.items_dipinjam || [])];
                                          newItems[idx] = { ...newItems[idx], catatan: e.target.value };
                                          setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                       }} className="input-form" />
                                    </div>
                                 ))}
                                 <button type="button" onClick={() => {
                                    const newItems = [...(lendingForm.items_dipinjam || []), { nama_barang: '', nomor_seri: '', catatan: '', catatan_pengembalian: '', status_pengembalian: 'dipinjam' as const }];
                                    setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                 }} className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold border-2 border-dashed border-gray-300">+ Tambah Barang</button>
                              </div>
                           </div>
                           {/* FOTO BUKTI PENERIMAAN */}
                           <div>
                              <label className="label-form">Foto Bukti Penerimaan Barang (maks 10)</label>
                              {/* Existing photos */}
                              {Array.isArray(lendingForm.foto_penerimaan) && lendingForm.foto_penerimaan.length > 0 && (
                                 <div className="flex flex-wrap gap-2 mb-2">
                                    {(lendingForm.foto_penerimaan as string[]).map((url, fi) => {
                                       const src = proxyImg(url) || url;
                                       return (
                                          <div key={fi} className="relative">
                                             {/* eslint-disable-next-line @next/next/no-img-element */}
                                             <img src={src} alt={`bukti ${fi + 1}`} className="w-16 h-16 object-cover rounded-lg border border-gray-200" />
                                             <button type="button" onClick={() => setLendingForm(prev => ({ ...prev, foto_penerimaan: (prev.foto_penerimaan as string[]).filter((_, j) => j !== fi) }))}
                                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-md w-4 h-4 text-[10px] flex items-center justify-center leading-none">×</button>
                                          </div>
                                       );
                                    })}
                                 </div>
                              )}
                              {/* New files preview */}
                              {lendingFotoPenerimaanFiles.length > 0 && (
                                 <div className="flex flex-wrap gap-2 mb-2">
                                    {lendingFotoPenerimaanFiles.map((f, fi) => (
                                       <div key={fi} className="relative">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border-2 border-blue-300" />
                                          <button type="button" onClick={() => setLendingFotoPenerimaanFiles(prev => prev.filter((_, j) => j !== fi))}
                                             className="absolute -top-1 -right-1 bg-red-500 text-white rounded-md w-4 h-4 text-[10px] flex items-center justify-center leading-none">×</button>
                                       </div>
                                    ))}
                                 </div>
                              )}
                              <input type="file" accept="image/*" multiple
                                 disabled={(Array.isArray(lendingForm.foto_penerimaan) ? lendingForm.foto_penerimaan.length : 0) + lendingFotoPenerimaanFiles.length >= 10}
                                 onChange={e => {
                                    const existing = Array.isArray(lendingForm.foto_penerimaan) ? lendingForm.foto_penerimaan.length : 0;
                                    const remaining = 10 - existing - lendingFotoPenerimaanFiles.length;
                                    const files = Array.from(e.target.files || []).slice(0, remaining);
                                    setLendingFotoPenerimaanFiles(prev => [...prev, ...files]);
                                    e.target.value = '';
                                 }}
                                 className="input-form text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-yellow-400 file:text-black file:text-xs file:font-bold file:cursor-pointer"
                                 aria-label="Upload foto bukti penerimaan" />
                              <p className="text-[11px] text-gray-500 mt-1">{(Array.isArray(lendingForm.foto_penerimaan) ? lendingForm.foto_penerimaan.length : 0) + lendingFotoPenerimaanFiles.length}/10 foto</p>
                           </div>
                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Peminjaman'}</button>
                           </div>
                        </form>
                     )}

                     {/* ============ FORM TAB LAIN: placeholder info (jika ada tab baru) ============ */}
                     {/* ============ ASSET FORM ============ */}
                     {activeTab === 'assets' && (
                        <form onSubmit={handleSaveAsset} className="space-y-4">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                 <label className="label-form">Nama Barang *</label>
                                 <input type="text" required aria-label="Nama Barang" value={assetForm.nama_barang_aset || ''} onChange={e => setAssetForm({ ...assetForm, nama_barang_aset: e.target.value })} className="input-form" placeholder="Contoh: Nikon Z50 II Body Only" />
                              </div>
                              <div>
                                 <label className="label-form">No. Seri</label>
                                 <input type="text" aria-label="No Seri Aset" value={assetForm.no_seri_aset || ''} onChange={e => setAssetForm({ ...assetForm, no_seri_aset: e.target.value })} className="input-form" placeholder="Nomor seri barang" />
                              </div>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {(['accs1','accs2','accs3','accs4','accs5','accs6','accs7'] as const).map((k, i) => (
                                 <div key={k}>
                                    <label className="label-form">Aksesoris {i + 1}</label>
                                    <input type="text" aria-label={`Aksesoris ${i+1}`} value={assetForm[k] || ''} onChange={e => setAssetForm({ ...assetForm, [k]: e.target.value })} className="input-form" placeholder={`Aksesoris ${i + 1} (opsional)`} />
                                 </div>
                              ))}
                           </div>
                           <div>
                              <label className="label-form">Catatan</label>
                              <input type="text" aria-label="Catatan" value={assetForm.catatan || ''} onChange={e => setAssetForm({ ...assetForm, catatan: e.target.value })} className="input-form" placeholder="Catatan tambahan (opsional)" />
                           </div>
                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
                           </div>
                        </form>
                     )}

                     {!['userrole', 'events', 'lending', 'claims', 'konsumen', 'warranties', 'promos', 'botsettings', 'budgets', 'eventregistrations', 'services', 'assets', 'eventreport'].includes(activeTab) && (
                        <div className="text-center py-12">
                           <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/></svg>
                           </div>
                           <p className="text-gray-700 font-semibold mb-1">Form untuk tab ini belum tersedia</p>
                           <p className="text-sm text-gray-600 mb-4">Hubungi developer untuk implementasi form Create/Edit tab <span className="font-bold">{activeTab}</span>.</p>
                           <button onClick={closeModal} className="btn-secondary">Tutup</button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
            );
         })()}

         {/* IMAGE VIEWER */}
         {/* Dual Document Viewer */}
         {isDualDocOpen && (
            <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setIsDualDocOpen(false)}>
               <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0 bg-zinc-950" onClick={e => e.stopPropagation()}>
                  <span className="text-sm font-bold text-white">Dokumen Pendukung</span>
                  <div className="flex items-center gap-3">
                     <span className="text-xs text-zinc-500 hidden sm:block">Scroll roda mouse untuk zoom</span>
                     <button onClick={() => setIsDualDocOpen(false)} className="text-white/60 hover:text-white text-2xl font-bold leading-none px-1">✕</button>
                  </div>
               </div>
               <div className="flex flex-1 gap-2 p-2 overflow-hidden" onClick={e => e.stopPropagation()}>
                  {([
                     { label: 'Kartu Garansi', url: dualDocUrls.garansi, zoom: dualZoomG, setZoom: setDualZoomG, rot: dualRotG, setRot: setDualRotG, trans: dualTransG, setTrans: setDualTransG, panelKey: 'G' as const },
                     { label: 'Nota Pembelian', url: dualDocUrls.nota,    zoom: dualZoomN, setZoom: setDualZoomN, rot: dualRotN, setRot: setDualRotN, trans: dualTransN, setTrans: setDualTransN, panelKey: 'N' as const },
                  ]).map(({ label, url, zoom, setZoom, rot, setRot, trans, setTrans, panelKey }) => (
                     <div key={label} className="flex-1 flex flex-col bg-zinc-900 rounded-lg overflow-hidden min-w-0">
                        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0 gap-2">
                           <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">{label}</span>
                           <div className="flex items-center gap-1">
                              <button onClick={() => { setRot((r: number) => (r - 90 + 360) % 360); setTrans({ x: 0, y: 0 }); }} title="Putar kiri" className="w-7 h-7 bg-zinc-800 hover:bg-blue-700 rounded text-zinc-300 text-sm flex items-center justify-center">↺</button>
                              <button onClick={() => { setRot((r: number) => (r + 90) % 360); setTrans({ x: 0, y: 0 }); }} title="Putar kanan" className="w-7 h-7 bg-zinc-800 hover:bg-blue-700 rounded text-zinc-300 text-sm flex items-center justify-center">↻</button>
                              <button onClick={() => setZoom((z: number) => Math.max(0.25, z - 0.25))} className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold text-base leading-none">−</button>
                              <span className="w-12 text-center text-xs text-zinc-400">{Math.round(zoom * 100)}%</span>
                              <button onClick={() => setZoom((z: number) => Math.min(5, z + 0.25))} className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 rounded text-white font-bold text-base leading-none">+</button>
                              <button onClick={() => { setZoom(() => 1); setRot(() => 0); setTrans({ x: 0, y: 0 }); }} className="px-2 h-7 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 text-xs">Reset</button>
                           </div>
                        </div>
                        <div
                           className="flex-1 relative overflow-hidden select-none"
                           style={{ cursor: dualDragRef.current.active && dualDragRef.current.panel === panelKey ? 'grabbing' : 'grab' }}
                           onPointerDown={e => { if (url && !url.toLowerCase().endsWith('.pdf')) { e.currentTarget.setPointerCapture(e.pointerId); dualDragRef.current = { active: true, panel: panelKey, startX: e.clientX, startY: e.clientY, startTX: trans.x, startTY: trans.y }; } }}
                           onPointerMove={e => { const d = dualDragRef.current; if (!d.active || d.panel !== panelKey) return; const nx = d.startTX + (e.clientX - d.startX); const ny = d.startTY + (e.clientY - d.startY); setTrans({ x: nx, y: ny }); }}
                           onPointerUp={() => { dualDragRef.current.active = false; }}
                           onPointerLeave={() => { dualDragRef.current.active = false; }}
                           onWheel={e => { e.preventDefault(); setZoom((z: number) => Math.min(5, Math.max(0.25, z + (e.deltaY > 0 ? -0.1 : 0.1)))); }}
                        >
                           {url ? (
                              url.toLowerCase().endsWith('.pdf') ? (
                                 <iframe src={url} className="w-full h-full border-none rounded" title={label} />
                              ) : (
                                 <div className="absolute inset-0 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                       src={isGoogleDriveLink(url) ? driveDocThumb(url) : url}
                                       alt={label}
                                       draggable={false}
                                       style={{
                                          maxWidth: 'none',
                                          maxHeight: 'none',
                                          width: `${zoom * 80}%`,
                                          height: 'auto',
                                          transform: `translate(${trans.x}px, ${trans.y}px) rotate(${rot}deg)`,
                                          transition: dualDragRef.current.active ? 'none' : 'transform 0.15s ease-out',
                                          transformOrigin: 'center center',
                                       }}
                                       className="rounded"
                                    />
                                 </div>
                              )
                           ) : (
                              <div className="h-full flex items-center justify-center text-zinc-600 text-sm">Tidak ada file</div>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {isImageViewerOpen && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
               <div className="fixed top-4 right-4 z-[60] flex items-center gap-2">
                  <button onClick={() => setImageRotation(r => (r - 90 + 360) % 360)} aria-label="Putar kiri" title="Putar kiri" className="w-11 h-11 bg-white rounded-md shadow-xl flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-200">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9l4-4M4 9H8" /></svg>
                  </button>
                  <button onClick={() => setImageRotation(r => (r + 90) % 360)} aria-label="Putar kanan" title="Putar kanan" className="w-11 h-11 bg-white rounded-md shadow-xl flex items-center justify-center text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-gray-200">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 4v5h-.582M4.062 11A8.001 8.001 0 0119.418 9m0 0H15m-11 11v-5h.581m0 0a8.003 8.003 0 0015.357-2M4.581 15H9" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 9l-4-4M20 9h-4" /></svg>
                  </button>
                  <button onClick={closeImageViewer} aria-label="Tutup" className="w-11 h-11 bg-white rounded-md shadow-xl flex items-center justify-center text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all border border-gray-200">
                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               <div className="absolute inset-0 flex items-center justify-center overflow-hidden" onWheel={handleWheel} onMouseMove={handleMouseMove} onMouseDown={handleMouseDown}>
                  {currentImageUrl.toLowerCase().endsWith('.pdf') || currentImageUrl.startsWith('data:application/pdf') ? (
                     <iframe src={currentImageUrl} className="w-full h-full border-none" title="PDF Viewer" />
                     ) : (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img
                        src={currentImageUrl}
                        alt="Viewer"
                        className="max-w-full max-h-full object-contain cursor-grab"
                        style={{ transform: `rotate(${imageRotation}deg) scale(${imageScale}) translate(${imageTranslate.x}px, ${imageTranslate.y}px)`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }}
                     />
                  )}
               </div>
            </div>
         )}

         {/* NEW CHAT MODAL */}
         {isNewChatModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                  <div className="p-5 border-b border-gray-200">
                     <h2 className="text-lg font-bold text-gray-900">Kirim Pesan Baru</h2>
                  </div>
                  <form onSubmit={handleSendNewChat} className="p-6 space-y-4">
                     <div>
                        <label className="label-form">Nomor WhatsApp Tujuan</label>
                        <input type="text" aria-label="Nomor WhatsApp Tujuan" value={newChatWa} onChange={e => setNewChatWa(e.target.value)} className="input-form" placeholder="Contoh: 628123456789" required />
                     </div>
                     <div>
                        <label className="label-form">Isi Pesan</label>
                        <textarea aria-label="Isi Pesan" value={newChatMsg} onChange={e => setNewChatMsg(e.target.value)} className="input-form" rows={4} required />
                     </div>
                     <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setIsNewChatModalOpen(false)} className="btn-secondary">Batal</button>
                        <button type="submit" className="btn-primary">Kirim</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* SCANNER MODAL */}
         {isScannerOpen && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
                     <div>
                        <h2 className="text-base font-bold text-gray-900">📷 Scanner QR Code</h2>
                        <p className="text-xs text-gray-500 mt-0.5">Buka kamera HP/laptop untuk scan QR pada tiket peserta.</p>
                     </div>
                     <button onClick={() => setIsScannerOpen(false)} aria-label="Tutup" className="p-1.5 rounded-md hover:bg-gray-100 transition">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                     </button>
                  </div>

                  {/* Viewport kamera */}
                  <div id="reader" className="w-full bg-black" style={{ minHeight: 300 }}></div>

                  {/* Status & tombol kamera */}
                  <div className="p-4 space-y-3">
                     {scannerStatus === 'detecting' && (
                        <div className="flex items-center justify-center gap-2 py-2 text-sm text-gray-500">
                           <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                           Mendeteksi kamera...
                        </div>
                     )}
                     {scannerStatus === 'error' && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 text-center">
                           <p className="font-semibold mb-1">⚠️ Kamera tidak dapat dibuka</p>
                           <p className="text-xs">{scannerError}</p>
                           <p className="text-xs mt-1 text-gray-500">Pastikan izin kamera sudah diberikan dan akses via HTTPS.</p>
                        </div>
                     )}
                     {scannerStatus === 'ready' && (
                        <div className="space-y-2">
                           <p className="text-xs font-semibold text-gray-600 text-center">Pilih kamera:</p>
                           <div className="flex flex-col gap-2">
                              {scannerCameras.map(cam => {
                                 const isBack = /back|rear|environment/i.test(cam.label);
                                 const isFront = /front|user|face/i.test(cam.label);
                                 const label = isBack ? '📷 Kamera Belakang' : isFront ? '🤳 Kamera Depan' : `📷 ${cam.label || 'Kamera ' + (scannerCameras.indexOf(cam) + 1)}`;
                                 return (
                                    <button key={cam.id} onClick={() => startScanCamera(cam.id)}
                                       className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                                       {label} — Mulai Scan
                                    </button>
                                 );
                              })}
                           </div>
                        </div>
                     )}
                     {scannerStatus === 'scanning' && (
                        <div className="text-center text-sm text-gray-600 py-1">
                           <p className="font-semibold text-green-700">✓ Kamera aktif — arahkan ke QR Code</p>
                           <button onClick={() => { scannerRef.current?.stop().catch(() => {}); scannerRef.current = null; setScannerStatus('ready'); }}
                              className="mt-2 text-xs text-gray-400 underline">Ganti kamera</button>
                        </div>
                     )}
                     <button onClick={() => setIsScannerOpen(false)}
                        className="w-full border border-gray-200 text-gray-600 font-semibold py-2 rounded-xl text-sm hover:bg-gray-50 transition">
                        ✕ Tutup Scanner
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* PROPOSAL PDF PREVIEW MODAL */}
         {printData && (() => {
            const fmtNum = (n: number) => n.toLocaleString('id-ID');
            const items = printData.items || [];
            const isPettyCashItem = (it: typeof items[0]) => {
               if (it.item_type === 'petty') return true;
               if (it.item_type === 'event') return false;
               // backward compat: data lama tanpa item_type
               const v = parseFloat(String(it.petty_cash || '').replace(/[^0-9.-]/g, ''));
               return !isNaN(v) && v > 0;
            };
            const eventCostItems = items.filter(it => !isPettyCashItem(it));
            const pettyCashItems = items.filter(it => isPettyCashItem(it));
            const subtotalEventCost = eventCostItems.reduce((s, it) => s + (Number(it.value) || 0), 0);
            const subtotalPettyCash = pettyCashItems.reduce((s, it) => s + (Number(it.value) || 0), 0);
            const grandTotal = subtotalEventCost + subtotalPettyCash;
            const MGT_NAMES = {
               col1: printData.mgt_name_1 || 'Jamal',
               col2: printData.mgt_name_2 || 'Eko',
               col3: printData.mgt_name_3 || 'Larry',
            };
            const FINANCE_NAME = printData.finance_name || 'Merry';
            const sectionLabel = printData.budget_source?.toUpperCase() || 'MARKETING BUDGET';
            const drafterDisplay = printData.proposed_name || printData.drafter_name || 'Firza';
            const attachments = (printData.attachment_urls || []).filter((u): u is string => typeof u === 'string' && Boolean(u)).slice(0, 3);

            const docEl = (
               <div className="p-8 print:p-6">
                           {/* HEADER */}
                           <div className="flex items-start justify-between mb-5">
                              <div className="flex items-center gap-4">
                                 <div className="border-2 border-black w-16 h-16 flex items-center justify-center text-center">
                                    <div>
                                       <p className="text-[9px] font-black leading-none">ALTA</p>
                                       <p className="text-[9px] font-black leading-none">NIKINDO</p>
                                    </div>
                                 </div>
                                 <div>
                                    <h1 className="text-3xl font-black tracking-tight">BUDGET APPROVAL</h1>
                                    <p className="text-[10px] tracking-wider text-gray-800">(SALES / MARKETING / SERVICE)</p>
                                 </div>
                              </div>
                              <table className="border-collapse text-[10px]">
                                 <tbody>
                                    <tr>
                                       <td className="border border-black px-3 py-1 font-bold bg-gray-100">Section:</td>
                                       <td className="border border-black px-3 py-1 font-bold">{sectionLabel}</td>
                                    </tr>
                                    <tr>
                                       <td className="border border-black px-3 py-1 font-bold bg-gray-100">Page(s):</td>
                                       <td className="border border-black px-3 py-1 font-bold">1</td>
                                    </tr>
                                 </tbody>
                              </table>
                           </div>

                           {/* APPROVAL ROW: 3 boxes — nama di-push ke bawah (mendekat ke garis) supaya ada ruang tanda tangan di atas */}
                           <div className="grid grid-cols-12 gap-2 mb-5">
                              {/* PROPOSED / PREPARED BY */}
                              <div className="col-span-3 border border-black flex flex-col">
                                 <div className="border-b border-black bg-gray-100 px-2 py-1.5 text-center">
                                    <p className="text-[10px] font-bold tracking-wider">PROPOSED / PREPARED BY</p>
                                 </div>
                                 <div className="px-2 pt-12 pb-1 text-center min-h-22.5 flex flex-col justify-end">
                                    <p className="text-base font-bold">{drafterDisplay}</p>
                                 </div>
                                 <div className="grid grid-cols-2 border-t border-black text-[9px]">
                                    <div className="border-r border-black px-2 py-2">
                                       <p className="font-bold tracking-wider">SIGN</p>
                                    </div>
                                    <div className="px-2 py-2">
                                       <p className="font-bold tracking-wider">DATE:</p>
                                    </div>
                                 </div>
                              </div>

                              {/* MANAGEMENT APPROVAL — 3 columns */}
                              <div className="col-span-6 border border-black flex flex-col">
                                 <div className="border-b border-black bg-gray-100 px-2 py-1.5 text-center">
                                    <p className="text-[10px] font-bold tracking-wider">MANAGEMENT APPROVAL</p>
                                 </div>
                                 <div className="grid grid-cols-3 min-h-22.5">
                                    <div className="border-r border-black px-2 pt-12 pb-1 text-center flex flex-col justify-end">
                                       <p className="text-sm font-bold">{MGT_NAMES.col1}</p>
                                    </div>
                                    <div className="border-r border-black px-2 pt-12 pb-1 text-center flex flex-col justify-end">
                                       <p className="text-sm font-bold">{MGT_NAMES.col2}</p>
                                    </div>
                                    <div className="px-2 pt-12 pb-1 text-center flex flex-col justify-end">
                                       <p className="text-sm font-bold">{MGT_NAMES.col3}</p>
                                    </div>
                                 </div>
                                 <div className="grid grid-cols-3 border-t border-black text-[9px]">
                                    <div className="border-r border-black px-2 py-2">
                                       <p className="font-bold tracking-wider">COMMENT</p>
                                       <p className="text-right text-[8px] mt-3">Date:</p>
                                    </div>
                                    <div className="border-r border-black px-2 py-2">
                                       <p className="font-bold tracking-wider">COMMENT</p>
                                       <p className="text-right text-[8px] mt-3">Date:</p>
                                    </div>
                                    <div className="px-2 py-2">
                                       <p className="font-bold tracking-wider">CONSENT</p>
                                       <p className="text-right text-[8px] mt-3">Date:</p>
                                    </div>
                                 </div>
                              </div>

                              {/* FINANCE & ACCOUNTING */}
                              <div className="col-span-3 border border-black flex flex-col">
                                 <div className="border-b border-black bg-gray-100 px-2 py-1.5 text-center">
                                    <p className="text-[10px] font-bold tracking-wider">FINANCE & ACCOUNTING</p>
                                 </div>
                                 <div className="px-2 pt-12 pb-1 text-center min-h-22.5 flex flex-col justify-end">
                                    <p className="text-base font-bold">{FINANCE_NAME}</p>
                                 </div>
                                 <div className="grid grid-cols-2 border-t border-black text-[9px]">
                                    <div className="border-r border-black px-2 py-2">
                                       <p className="font-bold tracking-wider">CONSENT</p>
                                    </div>
                                    <div className="px-2 py-2 text-right">
                                       <p className="font-bold tracking-wider">DATE:</p>
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* DETAIL TABLE */}
                           <table className="w-full border-collapse border border-black text-[11px] mb-4">
                              <tbody>
                                 <tr>
                                    <td className="border border-black px-3 py-2 bg-gray-50 font-bold align-top w-40">Title</td>
                                    <td className="border border-black px-3 py-2 font-bold uppercase">{printData.title || '-'}</td>
                                 </tr>
                                 <tr>
                                    <td className="border border-black px-3 py-2 bg-gray-50 font-bold align-top">Proposal No.</td>
                                    <td className="border border-black px-3 py-2 font-bold">{printData.proposal_no || '-'}</td>
                                 </tr>
                                 <tr>
                                    <td className="border border-black px-3 py-2 bg-gray-50 font-bold align-top">Period</td>
                                    <td className="border border-black px-3 py-2 font-bold">{printData.period || '-'}</td>
                                 </tr>
                                 <tr>
                                    <td className="border border-black px-3 py-2 bg-gray-50 font-bold align-top">Objectives</td>
                                    <td className="border border-black px-3 py-2 whitespace-pre-wrap leading-relaxed">{printData.objectives || '-'}</td>
                                 </tr>
                                 <tr>
                                    <td className="border border-black px-3 py-2 bg-gray-50 font-bold align-top">Detail of Activity</td>
                                    <td className="border border-black px-3 py-2 whitespace-pre-wrap leading-relaxed">{printData.detail_activity || '-'}</td>
                                 </tr>
                                 <tr>
                                    <td className="border border-black px-3 py-2 bg-gray-50 font-bold align-top">Expected Result</td>
                                    <td className="border border-black px-3 py-2 whitespace-pre-wrap leading-relaxed">{printData.expected_result || '-'}</td>
                                 </tr>
                              </tbody>
                           </table>

                           {/* EVENT COST TABLE */}
                           {(() => {
                              const renderItemsTable = (label: string, rows: typeof items, subtotalVal: number, isGrandTotal?: boolean) => (
                                 <div className="mt-5">
                                    <p className="font-black text-[11px] uppercase tracking-wider mb-1">{label}</p>
                                    <table className="w-full border-collapse border border-black text-[11px]">
                                       <thead>
                                          <tr className="bg-gray-100">
                                             <th className="border border-black px-2 py-2 w-10 text-center font-bold">NO</th>
                                             <th className="border border-black px-2 py-2 text-center font-bold">PURPOSE / ITEM DESCRIPTION</th>
                                             <th className="border border-black px-2 py-2 w-16 text-center font-bold">QTY</th>
                                             <th className="border border-black px-2 py-2 w-32 text-center font-bold">COST / UNIT</th>
                                             <th className="border border-black px-2 py-2 w-36 text-center font-bold">TOTAL VALUE</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {rows.length === 0 ? (
                                             <tr>
                                                <td colSpan={5} className="border border-black px-2 py-4 text-center text-gray-400 italic text-[10px]">Tidak ada item.</td>
                                             </tr>
                                          ) : rows.map((it, idx) => (
                                             <tr key={idx}>
                                                <td className="border border-black px-2 py-1.5 text-center">{idx + 1}</td>
                                                <td className="border border-black px-2 py-1.5">{it.purpose || '-'}</td>
                                                <td className="border border-black px-2 py-1.5 text-center">{it.qty || 0}</td>
                                                <td className="border border-black px-2 py-1.5 text-right font-mono">{fmtNum(Number(it.cost_unit) || 0)}</td>
                                                <td className="border border-black px-2 py-1.5 text-right font-bold font-mono">{fmtNum(Number(it.value) || 0)}</td>
                                             </tr>
                                          ))}
                                          <tr>
                                             <td colSpan={3}></td>
                                             <td className="border border-black px-2 py-2.5 text-right font-black text-[11px] bg-black text-white tracking-wider">TOTAL</td>
                                             <td className="border border-black px-2 py-2.5 text-right font-black font-mono text-[11px] bg-black text-white">Rp {fmtNum(isGrandTotal ? grandTotal : subtotalVal)}</td>
                                          </tr>
                                       </tbody>
                                    </table>
                                 </div>
                              );
                              return (
                                 <>
                                    {renderItemsTable('EVENT COST', eventCostItems, subtotalEventCost, pettyCashItems.length === 0)}
                                    {pettyCashItems.length > 0 && renderItemsTable('PETTY CASH', pettyCashItems, subtotalPettyCash, false)}
                                 </>
                              );
                           })()}

                           {/* ATTACHMENTS — INLINE di bawah Grand Total, page-break natural kalau overflow */}
                           {attachments.length > 0 && (
                              <div className="mt-6 attachments-section">
                                 <div className="border-t-2 border-dashed border-gray-500 mb-4"></div>
                                 <h3 className="font-bold text-base mb-3 tracking-wider">LAMPIRAN (ATTACHMENTS):</h3>
                                 {(() => {
                                    const visibleAttachments = attachments.slice(0, 3);
                                    return (
                                       <div className="flex flex-wrap gap-3">
                                          {visibleAttachments.map((url, idx) => (
                                             <div key={idx} className="border border-gray-300 p-1.5 flex-none" style={{ width: 'calc(50% - 6px)', height: '210px' }}>
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                   src={isGoogleDriveLink(url) ? toDriveProxy(url) : url}
                                                   alt={`Lampiran ${idx + 1}`}
                                                   style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                   onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                             </div>
                                          ))}
                                       </div>
                                    );
                                 })()}
                              </div>
                           )}

                           <div className="text-[9px] text-gray-600 mt-4 flex justify-between">
                              <span>https://altanikindo.com</span>
                              <span>Dokumen Budget Approval</span>
                           </div>
                        </div>
            );

            return (
               <>
                  {/* PREVIEW MODAL — ditampilkan sebelum download */}
                  {!printDownloading && (
                     <div className="fixed inset-0 bg-black/60 z-[60] overflow-y-auto">
                        <div className="min-h-full flex flex-col items-center py-8 px-4">
                           <div className="w-full max-w-4xl">
                              {/* Modal header sticky */}
                              <div className="sticky top-0 z-10 bg-white border-b shadow-sm px-3 py-2.5flex items-center justify-between rounded-t-xl">
                                 <div className="min-w-0 mr-4">
                                    <p className="font-mono text-[10px] text-gray-500 tracking-wider">{printData.proposal_no}</p>
                                    <h2 className="font-bold text-sm text-slate-800 truncate">{printData.title}</h2>
                                 </div>
                                 <div className="flex gap-2 shrink-0">
                                    <button
                                       onClick={handleDownloadPDF}
                                       className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-5 py-2 rounded-lg transition"
                                    >
                                       ⬇ Download PDF
                                    </button>
                                    <button
                                       onClick={() => setPrintData(null)}
                                       className="border border-gray-300 hover:bg-gray-100 text-sm font-bold px-4 py-2 rounded-lg transition"
                                    >
                                       ✕ Tutup
                                    </button>
                                 </div>
                              </div>
                              {/* Document preview */}
                              <div className="bg-white rounded-b-xl shadow-2xl font-sans text-black text-[11px] overflow-hidden">
                                 {docEl}
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* PRINT TEMPLATE — hanya aktif saat window.print() dipanggil */}
                  {printDownloading && (
                     <div className="hidden print:block font-sans text-black bg-white text-[11px]">
                        {docEl}
                     </div>
                  )}

                  {/* Print CSS */}
                  <style jsx global>{`
                     @media print {
                        @page { size: A4; margin: 0; }
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        thead { display: table-row-group; }
                        tbody tr { page-break-inside: avoid; }
                        .attachments-section { page-break-inside: avoid; }
                     }
                  `}</style>
               </>
            );
         })()}

      {/* MODAL GANTI PASSWORD */}
      {isChangePwOpen && (
         <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border-t-4 border-[#FFE500]">
               <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                     <div className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                     </div>
                     Ganti Password
                  </h2>
                  <button onClick={() => setIsChangePwOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none">✕</button>
               </div>
               <form onSubmit={handleChangePassword} className="px-6 py-5 space-y-4">
                  {changePwError && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm px-3 py-2 rounded">{changePwError}</div>}
                  {changePwSuccess && <div className="bg-green-50 border-l-4 border-green-500 text-green-700 text-sm px-3 py-2 rounded">{changePwSuccess}</div>}
                  <div>
                     <label className="label-form">Password Saat Ini</label>
                     <input type="password" required value={changePwForm.current} onChange={e => setChangePwForm(f => ({ ...f, current: e.target.value }))} className="input-form" placeholder="Masukkan password lama" autoComplete="current-password" />
                  </div>
                  <div>
                     <label className="label-form">Password Baru</label>
                     <input type="password" required minLength={6} value={changePwForm.newPw} onChange={e => setChangePwForm(f => ({ ...f, newPw: e.target.value }))} className="input-form" placeholder="Minimal 6 karakter" autoComplete="new-password" />
                  </div>
                  <div>
                     <label className="label-form">Konfirmasi Password Baru</label>
                     <input type="password" required minLength={6} value={changePwForm.confirm} onChange={e => setChangePwForm(f => ({ ...f, confirm: e.target.value }))} className="input-form" placeholder="Ulangi password baru" autoComplete="new-password" />
                  </div>
                  <button type="submit" className="btn-primary w-full mt-2">Simpan Password Baru</button>
               </form>
            </div>
         </div>
      )}
      {waPasswordMsg && (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500]" onClick={() => { setWaPasswordMsg(null); setWaPasswordMsgCopied(false); }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
               <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                     <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                     </div>
                     <div>
                        <p className="font-bold text-gray-900 text-sm">Pesan untuk Karyawan</p>
                        <p className="text-xs text-gray-500">Salin dan kirim via WA pribadi Anda</p>
                     </div>
                  </div>
                  <button onClick={() => { setWaPasswordMsg(null); setWaPasswordMsgCopied(false); }} className="text-gray-400 hover:text-gray-600 text-xl font-bold leading-none">✕</button>
               </div>
               <div className="px-5 py-4 space-y-3">
                  <textarea
                     readOnly
                     className="w-full h-44 text-sm border border-gray-200 rounded-xl p-3 bg-gray-50 resize-none focus:outline-none font-mono leading-relaxed"
                     value={`Halo ${waPasswordMsg.nama},\n\nPassword akun Nikon Dashboard Anda telah diperbarui oleh Admin.\n\nUsername: ${waPasswordMsg.username}\nPassword: ${waPasswordMsg.password}\n\nSegera ganti password setelah berhasil masuk.\n\naltanikindo.com`}
                  />
                  <button
                     onClick={() => {
                        navigator.clipboard.writeText(`Halo ${waPasswordMsg.nama},\n\nPassword akun Nikon Dashboard Anda telah diperbarui oleh Admin.\n\nUsername: ${waPasswordMsg.username}\nPassword: ${waPasswordMsg.password}\n\nSegera ganti password setelah berhasil masuk.\n\naltanikindo.com`);
                        setWaPasswordMsgCopied(true);
                        setTimeout(() => setWaPasswordMsgCopied(false), 3000);
                     }}
                     className={`w-full py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${waPasswordMsgCopied ? 'bg-green-500 text-white' : 'bg-[#FFE500] hover:bg-[#E5CE00] text-black'}`}
                  >
                     {waPasswordMsgCopied ? (
                        <><svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg> Tersalin!</>
                     ) : (
                        <><svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/><path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/></svg> Salin Pesan</>
                     )}
                  </button>
               </div>
            </div>
         </div>
      )}
      {/* ============ MODAL VIEW KONSUMEN ============ */}
      {viewingKonsumen && (() => {
         const vk = viewingKonsumen;
         const vkClaims = claims.filter((c: ClaimPromo) => c.nomor_wa === vk.nomor_wa);
         const vkWarranties = warranties.filter((w: Garansi) => w.nomor_wa === vk.nomor_wa);
         const alamatLengkap = [vk.alamat_rumah, vk.kelurahan, vk.kecamatan, vk.kabupaten_kotamadya, vk.provinsi, vk.kodepos].filter(v => v && v !== 'BELUM_DIISI').join(', ');
         const initials = (name: string) => (name || '?').split(/\s+/).map(w => w[0] || '').filter(Boolean).slice(0, 2).join('').toUpperCase();
         const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-amber-500', 'bg-cyan-500', 'bg-rose-500', 'bg-indigo-500'];
         const colorFor = (s: string) => colors[s.charCodeAt(0) % colors.length] || 'bg-gray-500';
         return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setViewingKonsumen(null)}>
               <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                  {/* Header */}
                  <div className={`${colorFor(vk.nama_lengkap || '?')} p-5 text-white`}>
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/30 backdrop-blur text-white font-bold text-xl flex items-center justify-center shrink-0">{initials(vk.nama_lengkap || '?')}</div>
                        <div className="flex-1 min-w-0">
                           <h2 className="text-xl font-black truncate">{vk.nama_lengkap || '-'}</h2>
                           <p className="text-sm font-mono opacity-90">{vk.id_konsumen || '—'}</p>
                        </div>
                        <button onClick={() => setViewingKonsumen(null)} className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold text-lg transition shrink-0">✕</button>
                     </div>
                  </div>

                  {/* Body */}
                  <div className="overflow-y-auto flex-1 p-5 space-y-5">

                     {/* Identitas */}
                     <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3">Identitas</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">WhatsApp</p>
                              <p className="font-mono text-sm font-bold text-gray-900">{vk.nomor_wa}</p>
                           </div>
                           <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">NIK</p>
                              <p className="font-mono text-sm font-bold text-gray-900">{vk.nik && vk.nik !== 'BELUM_DIISI' ? vk.nik : <span className="text-gray-400 italic font-sans font-normal">Belum diisi</span>}</p>
                           </div>
                           <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 sm:col-span-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Alamat</p>
                              <p className="text-sm text-gray-900 leading-relaxed">{alamatLengkap || <span className="text-gray-400 italic">Belum diisi</span>}</p>
                              {vk.kodepos && <p className="text-xs text-gray-500 mt-1">Kodepos: {vk.kodepos}</p>}
                           </div>
                           <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Status Chatbot</p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-100 text-yellow-800 text-xs font-bold">{vk.status_langkah || 'START'}</span>
                              <p className="text-[10px] text-gray-500 mt-1.5 leading-relaxed">
                                 {(vk.status_langkah || 'START') === 'START' && 'Konsumen berada di menu utama — belum memulai alur apapun.'}
                                 {vk.status_langkah === 'TALKING_TO_CS' && 'Konsumen sedang aktif bicara dengan CS. Bot tidak membalas hingga CS selesai.'}
                                 {vk.status_langkah === 'MENUNGGU_UPLOAD_WEB' && 'Konsumen sudah memilih Claim Promo dan menunggu mengisi form di website.'}
                                 {vk.status_langkah === 'MENUNGGU_UPLOAD_GARANSI_WEB' && 'Konsumen sudah memilih Daftar Garansi dan menunggu mengisi form di website.'}
                                 {vk.status_langkah === 'TANYA_UPDATE_WA' && 'Bot sedang menanyakan apakah konsumen mau memperbarui nomor WA.'}
                                 {vk.status_langkah === 'TANYA_UPDATE_WA_INPUT' && 'Bot menunggu konsumen mengetikkan nomor WA baru.'}
                                 {vk.status_langkah === 'OFFER_GARANSI_AFTER_CLAIM' && 'Bot menawarkan daftar garansi setelah claim berhasil dikirim.'}
                                 {vk.status_langkah === 'MENUNGGU_SERI_CLAIM' && 'Bot menunggu konsumen mengetikkan nomor seri untuk cek status claim.'}
                                 {vk.status_langkah === 'MENUNGGU_SERI_GARANSI' && 'Bot menunggu konsumen mengetikkan nomor seri untuk cek status garansi.'}
                                 {vk.status_langkah === 'MENUNGGU_RESI_SERVICE' && 'Bot menunggu konsumen mengetikkan nomor resi untuk cek status service.'}
                              </p>
                           </div>
                           <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Terdaftar</p>
                              <p className="text-sm text-gray-900">{vk.created_at ? new Date(vk.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }) : '-'}</p>
                           </div>
                        </div>
                     </section>

                     {/* Claim Promo */}
                     <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                           Claim Promo
                           <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-green-100 text-green-800 text-[10px] font-bold">{vkClaims.length}</span>
                        </h3>
                        {vkClaims.length === 0 ? (
                           <p className="text-sm text-gray-400 italic py-2">Belum ada claim promo.</p>
                        ) : (
                           <div className="space-y-2">
                              {vkClaims.map((c: ClaimPromo) => (
                                 <div key={c.id_claim} onClick={() => { setViewingKonsumen(null); openModal('edit', 'claim', c); }} className="bg-white border border-gray-200 rounded-xl p-3 text-xs cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all group">
                                    <div className="flex items-start justify-between gap-2">
                                       <div className="flex-1 min-w-0">
                                          <p className="font-bold text-gray-900 truncate">{c.tipe_barang} <span className="text-gray-500 font-mono font-normal">SN: {c.nomor_seri}</span></p>
                                          <p className="text-gray-600 mt-0.5">{c.jenis_promosi || '-'} · {c.nama_toko || '-'}</p>
                                          <p className="text-gray-500 mt-0.5">Tgl beli: {c.tanggal_pembelian || '-'}</p>
                                       </div>
                                       <div className="shrink-0 text-right flex flex-col items-end gap-1">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${c.validasi_by_fa === 'Valid' ? 'bg-green-100 text-green-800' : c.validasi_by_fa === 'Ditolak' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{c.validasi_by_fa || 'Menunggu'}</span>
                                          {c.nomor_resi && <p className="text-gray-500 font-mono">{c.nomor_resi}</p>}
                                          <span className="text-[10px] text-blue-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">✏️ Edit →</span>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </section>

                     {/* Garansi */}
                     <section>
                        <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                           Garansi
                           <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">{vkWarranties.length}</span>
                        </h3>
                        {vkWarranties.length === 0 ? (
                           <p className="text-sm text-gray-400 italic py-2">Belum ada data garansi.</p>
                        ) : (
                           <div className="space-y-2">
                              {vkWarranties.map((w: Garansi) => (
                                 <div key={w.id_garansi} onClick={() => { setViewingKonsumen(null); openModal('edit', 'warranty', w); }} className="bg-white border border-gray-200 rounded-xl p-3 text-xs cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-all group">
                                    <div className="flex items-start justify-between gap-2">
                                       <div className="flex-1 min-w-0">
                                          <p className="font-bold text-gray-900 truncate">{w.tipe_barang} <span className="text-gray-500 font-mono font-normal">SN: {w.nomor_seri}</span></p>
                                          <p className="text-gray-600 mt-0.5">{w.jenis_garansi} · {w.lama_garansi}</p>
                                          {w.nama_toko && <p className="text-gray-500 mt-0.5">Toko: {w.nama_toko}</p>}
                                          {w.tanggal_pembelian && <p className="text-gray-500">Tgl beli: {w.tanggal_pembelian}</p>}
                                       </div>
                                       <div className="shrink-0 flex flex-col items-end gap-1">
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${w.status_validasi === 'Valid' ? 'bg-green-100 text-green-800' : w.status_validasi === 'Ditolak' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{w.status_validasi}</span>
                                          <span className="text-[10px] text-blue-500 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">✏️ Edit →</span>
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}
                     </section>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-gray-100 p-4 flex justify-end gap-3">
                     <button onClick={() => { setViewingKonsumen(null); openModal('edit', 'konsumen', vk); }} className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 transition">Edit Data</button>
                     <button onClick={() => setViewingKonsumen(null)} className="px-4 py-2 rounded-xl text-sm font-bold bg-[#FFE500] hover:bg-[#E5CE00] text-black transition">Tutup</button>
                  </div>
               </div>
            </div>
         );
      })()}
      </>
   );
}
