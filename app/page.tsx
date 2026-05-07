'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { whatsappMessages } from './whatsappMessages';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-to-prevent-error'; // Akan diisi via .env.local
const supabase = createClient(supabaseUrl, supabaseKey);

// Konversi URL Google Drive lama (uc?id=X&export=view) ke format baru yg bisa di-embed
function gdriveUrl(url: string | null | undefined): string {
   if (!url) return '';
   const m = url.match(/(?:drive\.google\.com\/uc\?id=|drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=|drive\.google\.com\/thumbnail\?id=|lh3\.googleusercontent\.com\/d\/)([a-zA-Z0-9_-]+)/);
   if (m && m[1]) return `https://lh3.googleusercontent.com/d/${m[1]}=w2000`;
   return url;
}

const ID_MONTHS: Record<string, number> = {
   januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
   juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
};
function parseIdDate(str: string): Date | null {
   if (!str) return null;
   const p = str.trim().toLowerCase().split(/\s+/);
   if (p.length < 3) return null;
   const d = parseInt(p[0]), m = ID_MONTHS[p[1]], y = parseInt(p[2]);
   if (isNaN(d) || m === undefined || isNaN(y)) return null;
   return new Date(y, m, d + 1);
}
// "12 Agustus 2026" → "2026-08-12" untuk <input type="date">
const ID_MONTHS_PAD: Record<string, string> = { januari:'01', februari:'02', maret:'03', april:'04', mei:'05', juni:'06', juli:'07', agustus:'08', september:'09', oktober:'10', november:'11', desember:'12' };
const ID_MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function idDateToIso(s: string | null | undefined): string {
   if (!s) return '';
   if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
   const p = s.trim().toLowerCase().split(/\s+/);
   if (p.length < 3) return '';
   const d = p[0].padStart(2, '0'), m = ID_MONTHS_PAD[p[1]], y = p[2];
   if (!m) return '';
   return `${y}-${m}-${d}`;
}
// "2026-08-12" → "12 Agustus 2026"
function isoToIdDate(iso: string): string {
   if (!iso) return '';
   const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
   if (!m) return iso;
   return `${parseInt(m[3])} ${ID_MONTH_NAMES[parseInt(m[2]) - 1]} ${m[1]}`;
}
function getEventClosedStatus(evt: { event_status: string; event_partisipant_stock: number; event_date: string }, regCount: number): { closed: boolean; reason: string } {
   const status = (evt.event_status || '').toLowerCase();
   if (status === 'close' || status === 'closed') return { closed: true, reason: 'Ditutup Admin' };
   if (status === 'sold out' || status === 'sold_out' || status === 'soldout') return { closed: true, reason: 'Sold Out' };
   if (evt.event_partisipant_stock > 0 && regCount >= evt.event_partisipant_stock) return { closed: true, reason: 'Kuota Penuh' };
   const evtDate = parseIdDate(evt.event_date);
   if (evtDate && evtDate < new Date()) return { closed: true, reason: 'Acara Selesai' };
   return { closed: false, reason: 'Aktif' };
}

// --- TYPES ---
interface Karyawan { id_karyawan?: string; username: string; password?: string; nama_karyawan: string; role: string; status_aktif: boolean; akses_halaman: string[]; created_at?: string; nomor_wa?: string; }
interface KonsumenData { nomor_wa: string; id_konsumen: string; nama_lengkap: string; status_langkah: string; alamat_rumah: string; created_at: string; nik?: string; kelurahan?: string; kecamatan?: string; kabupaten_kotamadya?: string; provinsi?: string; kodepos?: string; }
interface RiwayatPesan { id_pesan?: string; nomor_wa: string; nama_profil_wa: string; arah_pesan: 'IN' | 'OUT'; isi_pesan: string; waktu_pesan: string; bicara_dengan_cs?: boolean; created_at?: string; }
interface ClaimPromo { id_claim?: string; nomor_wa: string; nomor_seri: string; tipe_barang: string; tanggal_pembelian: string; nama_toko?: string; jenis_promosi?: string; validasi_by_mkt: string; validasi_by_fa: string; catatan_mkt?: string; catatan_fa?: string; nama_jasa_pengiriman?: string; nomor_resi?: string; link_kartu_garansi?: string | File | null; link_nota_pembelian?: string | File | null; created_at?: string; }
interface Garansi { id_garansi?: string; nomor_seri: string; tipe_barang: string; status_validasi: string; jenis_garansi: string; lama_garansi: string; link_kartu_garansi?: string | File | null; link_nota_pembelian?: string | File | null; created_at?: string; }
interface Promosi { id_promo?: string; nama_promo: string; tipe_produk: { nama_produk: string }[]; tanggal_mulai: string; tanggal_selesai: string; status_aktif: boolean; created_at?: string; }
interface PengaturanBot { id?: number; nama_pengaturan: string; url_file?: string; description?: string; created_at?: string; updated_at?: string; }
interface StatusService { id_service?: string; nomor_tanda_terima: string; nomor_seri: string; status_service: string; created_at?: string; }
interface BudgetItem { purpose: string; qty: number; cost_unit: number; value: number; petty_cash?: string; }
interface BudgetApproval { id_budget?: string; proposal_no: string; title: string; period: string; objectives: string; detail_activity: string; expected_result: string; total_cost: number; budget_source: string; drafter_name: string; mgt_comment_1?: string; mgt_comment_2?: string; mgt_consent?: string; finance_consent?: string; items: BudgetItem[]; created_at?: string; attachment_urls?: (string | File | null)[]; }
interface DataLog { id?: string; created_at?: string; user_name: string; action: string; table_name: string; record_id: string; old_values: any; new_values: any; }
interface EventData { id?: string; event_title: string; event_date: string; event_price: string; event_image?: string; event_partisipant_stock: number; event_status: string; event_description?: string; event_speaker?: string; event_speaker_genre?: string; event_payment_tipe?: string; event_upload_payment_screenshot?: string; deposit_amount?: string; proposal_event_id?: string; bank_info?: string; created_at?: string; }
interface EventRegistration { id?: string; nama_lengkap: string; nomor_wa: string; kabupaten_kotamadya?: string; tipe_kamera?: string; event_name: string; event_id?: string; bukti_transfer_url?: string; status_pendaftaran: string; payment_type?: string; ticket_url?: string; status_pengembalian_deposit?: string; bukti_pengembalian_deposit?: string; rejection_reason?: string; is_attended?: boolean; created_at?: string; }

interface PeminjamanItem {
   nama_barang: string;
   nomor_seri: string;
   catatan?: string;
   catatan_pengembalian?: string; // New field for return notes
   catatan_admin?: string; // Admin note during return
   status_pengembalian: 'dipinjam' | 'dikembalikan';
}
interface PeminjamanBarang {
   id_peminjaman?: string;
   nomor_wa_peminjam: string;
   nama_peminjam: string;
   link_ktp_peminjam?: string | File | null;
   items_dipinjam: PeminjamanItem[];
   tanggal_peminjaman?: string;
   tanggal_pengembalian?: string | null;
   status_peminjaman: 'aktif' | 'selesai';
   status_wa?: string;
   created_at?: string;
   updated_at?: string;
}

// --- API PENGIRIMAN AMAN VIA SUPABASE EDGE FUNCTION ---
const sendWhatsAppMessageViaFonnte = async (targetWa: string, message: string) => {
   try {
      const { error } = await supabase.functions.invoke('send-wa', {
         body: { target: targetWa, message: message }
      });
      if (error) throw error;
   } catch (error) {
      console.error("Gagal mengirim via Edge Function:", error);
   }
};

// --- HELPER FUNCTION TO SAVE MESSAGES TO DATABASE ---
const saveMessageToDatabase = async (
   nomor_wa: string,
   nama_profil_wa: string,
   arah_pesan: 'IN' | 'OUT',
   isi_pesan: string,
   bicara_dengan_cs: boolean = false
) => {
   try {
      const { error } = await supabase.from('riwayat_pesan').insert([{
         nomor_wa,
         nama_profil_wa,
         arah_pesan,
         isi_pesan,
         waktu_pesan: new Date().toISOString(),
         bicara_dengan_cs,
         created_at: new Date().toISOString()
      }]);
      if (error) console.error('[SAVE_MESSAGE] Error saving message:', error);
   } catch (error) {
      console.error('[SAVE_MESSAGE] Unexpected error:', error);
   }
};

export default function NikonDashboard() {
   // LOGIN & FORGOT PASSWORD STATES
   const [isLoggedIn, setIsLoggedIn] = useState(false);
   const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);
   const [loginForm, setLoginForm] = useState({ username: '', password: '' });
   const [loginError, setLoginError] = useState('');
   const [isForgotPw, setIsForgotPw] = useState(false);
   const [forgotPwUsername, setForgotPwUsername] = useState('');
   const [forgotPwMessage, setForgotPwMessage] = useState('');

   // DATA STATES
   const [messages, setMessages] = useState<RiwayatPesan[]>([]);
   const [claims, setClaims] = useState<ClaimPromo[]>([]);
   const [warranties, setWarranties] = useState<Garansi[]>([]);
   const [promos, setPromos] = useState<Promosi[]>([]);
   const [services, setServices] = useState<StatusService[]>([]);
   const [budgets, setBudgets] = useState<BudgetApproval[]>([]);
   const [karyawans, setKaryawans] = useState<Karyawan[]>([]);
   const [consumers, setConsumers] = useState<Record<string, string>>({});
   const [botSettings, setBotSettings] = useState<PengaturanBot[]>([]);
   const [logs, setLogs] = useState<DataLog[]>([]);
   const [lendingRecords, setLendingRecords] = useState<PeminjamanBarang[]>([]);
   const [consumersList, setConsumersList] = useState<KonsumenData[]>([]);
   const [events, setEvents] = useState<EventData[]>([]);
   const [searchEvent, setSearchEvent] = useState('');
   const [sortConfigEvents, setSortConfigEvents] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({ column: '', direction: null });
   const [eventRegistrationsCount, setEventRegistrationsCount] = useState<Record<string, number>>({});
   const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
   const [searchRegistration, setSearchRegistration] = useState('');

   // SEARCH STATES
   const [searchKonsumen, setSearchKonsumen] = useState('');
   const [searchChat, setSearchChat] = useState('');
   const [searchPromo, setSearchPromo] = useState('');
   const [searchClaim, setSearchClaim] = useState('');
   const [filterStatusWarna, setFilterStatusWarna] = useState<string>('Semua');
   const [printedClaimIds, setPrintedClaimIds] = useState<Set<string>>(() => {
      if (typeof window !== 'undefined') {
         try {
            const saved = localStorage.getItem('printedClaimIds');
            if (saved) return new Set(JSON.parse(saved));
         } catch {}
      }
      return new Set();
   });

   useEffect(() => {
      localStorage.setItem('printedClaimIds', JSON.stringify([...printedClaimIds]));
   }, [printedClaimIds]);

   const getClaimStatusColor = (c: ClaimPromo) => {
      const mkt = (c.validasi_by_mkt || '').trim().toLowerCase();
      const fa = (c.validasi_by_fa || '').trim().toLowerCase();
      const isPending = (v: string) => v === 'dalam proses verifikasi' || v === 'dalam proses validasi' || v === '';
      if (mkt === 'double input') return 'Merah';
      if (mkt === 'tidak valid') return 'Merah';
      if (isPending(mkt)) return 'Putih';
      if (c.nomor_resi && c.nomor_resi.trim() !== '' && c.nomor_resi.trim().toUpperCase() !== 'BELUM_DIISI') return 'Hijau';
      if (mkt === 'valid' && fa === 'valid') return 'Pink';
      if (mkt === 'valid' && isPending(fa)) return 'Biru';
      if (mkt === 'hold' && fa !== 'valid') return 'Orange';
      return 'Putih';
   };

   const getBadgeStyle = (color: string) => {
      switch(color) {
         case 'Hijau': return 'bg-green-100 text-green-800 border border-green-200';
         case 'Pink': return 'bg-pink-100 text-pink-800 border border-pink-200';
         case 'Biru': return 'bg-blue-100 text-blue-800 border border-blue-200';
         case 'Orange': return 'bg-orange-100 text-orange-800 border border-orange-200';
         case 'Merah': return 'bg-red-100 text-red-800 border border-red-200';
         case 'Putih': default: return 'bg-white text-slate-800 border border-gray-300';
      }
   };

   const getBadgeLabel = (color: string) => {
      switch(color) {
         case 'Hijau': return 'Selesai';
         case 'Pink': return 'Tunggu Resi';
         case 'Biru': return 'Tunggu FA Cek';
         case 'Orange': return 'Hold';
         case 'Merah': return 'Tidak Valid';
         case 'Putih': default: return 'Belum Di Cek';
      }
   };

   const [searchGaransi, setSearchGaransi] = useState('');
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
   const [linksMenuOpen, setLinksMenuOpen] = useState(false);
   const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
   const [readStatus, setReadStatus] = useState<Record<string, string>>({});
   const [loading, setLoading] = useState(true);
   const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string }>({ connected: false, message: 'Menghubungkan...' });
   const [activeTab, setActiveTab] = useState('dashboard');
   const [returnTab, setReturnTab] = useState<string | null>(null);
   const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: new Date().toISOString().split('T')[0] });
   const [msgTimeFilter, setMsgTimeFilter] = useState<'day' | 'week' | 'month'>('day');

   // MODAL STATES
   const [isModalOpen, setIsModalOpen] = useState(false); // State to control modal visibility
   const [modalAction, setModalAction] = useState<'create' | 'edit' | 'reset_pw' | 'return'>('create'); // Type of action for the modal
   const [editingId, setEditingId] = useState<string | null>(null);
   const [selectedWa, setSelectedWa] = useState<string | null>(null);
   const [replyText, setReplyText] = useState('');
   const [replyToMessage, setReplyToMessage] = useState<RiwayatPesan | null>(null);
   const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
   const [isScannerOpen, setIsScannerOpen] = useState(false);
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
   const [botSettingsForm, setBotSettingsForm] = useState<Partial<PengaturanBot>>({});
   const [eventForm, setEventForm] = useState<Partial<EventData>>({});
   const [eventImageFile, setEventImageFile] = useState<File | null>(null);
   const [eventPaymentScreenshotFile, setEventPaymentScreenshotFile] = useState<File | null>(null);
   const [registrationForm, setRegistrationForm] = useState<Partial<EventRegistration>>({});

   // IMPORT CSV STATES
   const [importTarget, setImportTarget] = useState<'claim_promo' | 'garansi' | 'konsumen' | 'status_service'>('claim_promo');

   // SPECIAL STATES
   const [printData, setPrintData] = useState<BudgetApproval | null>(null);
   const [printImageSize, setPrintImageSize] = useState(400);
   const [isSubmitting, setIsSubmitting] = useState(false);

   // IMAGE VIEWER STATES

   const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
   const [currentImageUrl, setCurrentImageUrl] = useState('');
   const [imageScale, setImageScale] = useState(1);
   const [imageTranslate, setImageTranslate] = useState({ x: 0, y: 0 });
   const [isDragging, setIsDragging] = useState(false);
   const [startDragPosition, setStartDragPosition] = useState({ x: 0, y: 0 });

   // --- SORTING LOGIC ---
   const handleSort = (sortConfig: SortConfig, setSortConfig: React.Dispatch<React.SetStateAction<SortConfig>>, column: string) => {
      let direction: SortDirection = 'asc';
      if (sortConfig.column === column && sortConfig.direction === 'asc') {
         direction = 'desc';
      }
      setSortConfig({ column, direction });
   };

   const getSortFunction = (sortConfig: SortConfig, consumersMap: Record<string, string> | null = null) => {
      return (a: any, b: any) => {
         if (!sortConfig.column || !sortConfig.direction) {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            if (!isNaN(dateA) && !isNaN(dateB)) {
               return dateB - dateA;
            }
            return 0;
         }

         let aValue: any;
         let bValue: any;

         // Special handling for 'nama_konsumen' as it can come from KonsumenData or be looked up in consumersMap
         if (sortConfig.column === 'nama_konsumen') {
            aValue = a.nama_lengkap || (consumersMap ? consumersMap[a.nomor_wa] : a.nomor_wa);
            bValue = b.nama_lengkap || (consumersMap ? consumersMap[b.nomor_wa] : b.nomor_wa);
         } else {
            aValue = a[sortConfig.column];
            bValue = b[sortConfig.column];
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
   };
   const dynamicOptions = useMemo(() => {
      const allTipeBarang = [
         ...claims.map(c => c.tipe_barang),
         ...warranties.map(w => w.tipe_barang),
         ...(promos.flatMap(p => p.tipe_produk?.map(tp => tp.nama_produk) || [])),
         ...lendingRecords.flatMap(l => (l.items_dipinjam || []).map(item => item.nama_barang))
      ].filter(Boolean);

      const allNamaToko = claims.map(c => c.nama_toko).filter(Boolean);
      const allJenisPromo = promos.map(p => p.nama_promo).filter(Boolean);
      const allJasaKirim = claims.map(c => c.nama_jasa_pengiriman).filter(Boolean);
      const allStatusService = services.map(s => s.status_service).filter(Boolean);
      const allRoles = karyawans.map(k => k.role).filter(Boolean);
      const allBudgetSource = budgets.map(b => b.budget_source).filter(Boolean);
      const allCatatanPeminjaman = lendingRecords.flatMap(l => (l.items_dipinjam || []).map(item => item.catatan)).filter(Boolean);
      const allCatatanPengembalian = lendingRecords.flatMap(l => (l.items_dipinjam || []).map(item => item.catatan_pengembalian)).filter(Boolean);

      return {
         tipeBarang: Array.from(new Set(allTipeBarang)),
         namaToko: Array.from(new Set(allNamaToko)),
         jenisPromo: Array.from(new Set(allJenisPromo)),
         jasaKirim: Array.from(new Set(allJasaKirim)),
         statusService: Array.from(new Set(allStatusService)),
         roles: Array.from(new Set(allRoles)),
         budgetSource: Array.from(new Set(allBudgetSource)),
         catatanPeminjaman: Array.from(new Set(allCatatanPeminjaman)),
         catatanPengembalian: Array.from(new Set(allCatatanPengembalian)),
      };
   }, [claims, warranties, promos, services, karyawans, budgets, lendingRecords]); // Menambahkan lendingRecords ke dependensi

   const isGoogleDriveLink = (url: string): boolean => {
      if (typeof url !== 'string') return false;
      return /(?:drive\.google\.com|docs\.google\.com|sheets\.google\.com|slides\.google\.com|forms\.google\.com)/.test(url);
   };

   const openImageViewer = (urlOrFile: string | File) => {
      // Jika url adalah link Google Drive, buka di tab baru
      if (typeof urlOrFile === 'string' && isGoogleDriveLink(urlOrFile)) {
         window.open(urlOrFile, '_blank', 'noopener,noreferrer');
         return;
      }

      if (urlOrFile instanceof File) {
         setCurrentImageUrl(URL.createObjectURL(urlOrFile));
      } else {
         setCurrentImageUrl(urlOrFile);
      }
      setIsImageViewerOpen(true);
      setImageScale(1); // Reset zoom
      setImageTranslate({ x: 0, y: 0 }); // Reset position
      // Reset dragging state to ensure fresh start
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
   const uploadFileToStorage = async (file: File, prefix: string, serial: string) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prefix', prefix);
      formData.append('serial', serial);

      const response = await fetch('/api/upload-google-drive', {
         method: 'POST',
         body: formData,
      });

      if (!response.ok) {
         const error = await response.json();
         throw new Error(error.error || 'Upload failed');
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

   // --- MULTIMEDIA HELPERS ---
   const isImageUrl = (text: string) => {
      if (!text) return false;
      const urlPattern = /https?:\/\/[^\s]+?\.(jpg|jpeg|png|gif|webp|bmp)/i;
      return urlPattern.test(text);
   };

   // REFS
   const fileInputRef = useRef<HTMLInputElement>(null);
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const chatContainerRef = useRef<HTMLDivElement>(null);

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
      const savedSession = localStorage.getItem('nikon_karyawan');
      if (savedSession) {
         setCurrentUser(JSON.parse(savedSession));
         setIsLoggedIn(true);
      } else {
         setLoading(false);
      }
      const savedReadStatus = localStorage.getItem('nikon_chat_read_status');
      if (savedReadStatus) {
         setReadStatus(JSON.parse(savedReadStatus));
      }
   }, []);

   useEffect(() => {
      if (selectedWa && messages.length > 0) {
         const contactMessages = messages.filter(m => m.nomor_wa === selectedWa);
         if (contactMessages.length > 0) {
            const latestTime = contactMessages[0].waktu_pesan || contactMessages[0].created_at;
            if (latestTime) {
               setReadStatus(prev => {
                  const currentSaved = prev[selectedWa];
                  // Update only if we have a newer message
                  if (!currentSaved || new Date(latestTime) > new Date(currentSaved)) {
                     const updated = { ...prev, [selectedWa]: latestTime as string };
                     localStorage.setItem('nikon_chat_read_status', JSON.stringify(updated));
                     return updated;
                  }
                  return prev;
               });
            }
         }
      }
   }, [selectedWa, messages]);

   useEffect(() => {
      if (!isLoggedIn) return;
      setLoading(true);
      fetchConsumers();
      fetchMessages();
      fetchClaims();
      fetchWarranties();
      fetchPromos();
      fetchServices();
      fetchBudgets();
      fetchLendingRecords();
      fetchBotSettings();
      if (currentUser?.role === 'Admin') fetchKaryawans();
      fetchEvents();
      fetchEventRegistrations();

      // Cek koneksi Supabase
      const checkConnection = async () => {
         try {
            if (!supabaseKey || supabaseKey === 'dummy-key-to-prevent-error') {
               setDbStatus({ connected: false, message: 'Kunci API tidak dikonfigurasi. Setup .env.local' });
               return;
            }
            const { error, status } = await supabase.from('karyawan').select('count', { count: 'exact', head: true });
            if (error) {
               const errorMsg = error?.message || error?.code || 'Unknown error';
               console.warn("[DB CONNECTION] Error checking connection:", errorMsg);
               setDbStatus({ connected: false, message: `Gagal: ${errorMsg}` });
               return;
            }
            setDbStatus({ connected: true, message: 'Online' });
         } catch (err: any) {
            const errorMsg = err?.message || String(err) || 'Unknown error';
            console.error("[DB CONNECTION] Unexpected error:", errorMsg);
            setDbStatus({ connected: false, message: `Koneksi gagal: ${errorMsg}` });
         }
      };
      checkConnection();

      const subscription = supabase.channel('messages-channel')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_pesan' }, (payload) => {
            if (payload.eventType === 'INSERT') setMessages(prev => [payload.new as RiwayatPesan, ...prev]);
         }).subscribe();

      return () => { subscription.unsubscribe(); };
   }, [isLoggedIn, dateRange]);

   const handlePrintDocument = () => {
      if (printData) {
         const originalTitle = document.title;
         document.title = `${printData.proposal_no}-${printData.title}`;
         window.print();
         document.title = originalTitle;
      } else {
         window.print();
      }
   };

   const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   };

   useEffect(() => {
      if (selectedWa) setTimeout(() => { scrollToBottom(); }, 300);
   }, [selectedWa]);

   // --- LOGIN & LUPA PASSWORD LOGIC ---
   const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      const { data } = await supabase.from('karyawan').select('*').eq('username', loginForm.username).eq('password', loginForm.password).single();
      if (data) {
         if (data.status_aktif === false) return setLoginError('Akun dinonaktifkan. Silakan hubungi Admin.');
         setCurrentUser(data);
         setIsLoggedIn(true);
         localStorage.setItem('nikon_karyawan', JSON.stringify(data));
      } else {
         setLoginError('Username atau Password salah!');
      }
   };

   const handleForgotPwSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setForgotPwMessage('');
      setIsSubmitting(true);
      try {
         const { data } = await supabase.from('karyawan').select('*').eq('nomor_wa', forgotPwUsername).single();
         if (data) {
            const tempPw = Math.random().toString(36).substring(2, 10);
            await supabase.from('karyawan').update({ password: tempPw }).eq('id_karyawan', data.id_karyawan);

            const msg = whatsappMessages.forgotPassword(data.nama_karyawan, tempPw);
            await sendWhatsAppMessageViaFonnte(data.nomor_wa!, msg);

            setForgotPwMessage('Password baru telah dikirim ke WhatsApp Anda!');
         } else {
            setForgotPwMessage('Nomor WhatsApp tidak terdaftar!');
         }
      } catch (err) {
         setForgotPwMessage('Gagal memproses reset password.');
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleLogout = () => {
      localStorage.removeItem('nikon_karyawan');
      setIsLoggedIn(false);
      setCurrentUser(null);
   };

   // --- FETCH DATA ---
   const fetchConsumers = async () => {
      try {
         const map: Record<string, string> = {};
         const { data: konsumenData, error: kErr } = await supabase.from('konsumen').select('*').order('created_at', { ascending: false });
         if (kErr) console.error("Error fetch konsumen:", kErr.message);
         if (konsumenData) {
            setConsumersList(konsumenData);
            konsumenData.forEach(k => { if (k.nama_lengkap) map[k.nomor_wa] = k.nama_lengkap; });
         }
         const { data: riwayatData, error: rErr } = await supabase.from('riwayat_pesan').select('nomor_wa, nama_profil_wa').neq('nama_profil_wa', 'Sistem Bot').order('created_at', { ascending: false });
         if (rErr) console.error("Error fetch riwayat:", rErr.message);
         riwayatData?.forEach(r => { if (r.nomor_wa && !map[r.nomor_wa]) map[r.nomor_wa] = r.nama_profil_wa; });
         setConsumers(map);
      } catch (err) {
         console.error("fetchConsumers error:", err);
      }
   };

   const fetchMessages = async () => {
      try {
         const { data, error } = await supabase.from('riwayat_pesan').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false });
         if (error) console.error("fetchMessages error:", error.message);
         setMessages(data || []);
      } catch (err) {
         console.error("fetchMessages error:", err);
         setMessages([]);
      }
   };
   const fetchTable = async <T,>(table: string, setter: (d: T[]) => void, options?: { dateFilter?: boolean; ascending?: boolean }) => {
      try {
         let query = supabase.from(table).select('*');
         if (options?.dateFilter) {
            query = query.gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`);
         }
         query = query.order('created_at', { ascending: options?.ascending ?? false });
         const { data, error } = await query;
         if (error) console.error(`fetch ${table}:`, error.message);
         setter((data || []) as T[]);
      } catch (err) {
         console.error(`fetch ${table}:`, err);
         setter([]);
      }
   };

   const fetchClaims = () => fetchTable<ClaimPromo>('claim_promo', setClaims, { dateFilter: true });
   const fetchWarranties = () => fetchTable<Garansi>('garansi', setWarranties, { dateFilter: true });
   const fetchPromos = () => fetchTable<Promosi>('promosi', setPromos);
   const fetchServices = () => fetchTable<StatusService>('status_service', setServices);
   const fetchBudgets = async () => { await fetchTable<BudgetApproval>('budget_approval', setBudgets); setLoading(false); };
   const fetchLendingRecords = () => fetchTable<PeminjamanBarang>('peminjaman_barang', setLendingRecords);
   
   useEffect(() => {
      if (isScannerOpen) {
         const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
         scanner.render(
            async (decodedText) => {
               scanner.clear();
               setIsScannerOpen(false);
               await handleMarkAttendance(decodedText);
            },
            (error) => { /* ignore */ }
         );
         return () => { scanner.clear(); };
      }
   }, [isScannerOpen]);

   const handleMarkAttendance = async (id: string) => {
      try {
         const { error } = await supabase.from('event_registrations').update({ is_attended: true }).eq('id', id);
         if (error) throw error;
         alert('✅ Kehadiran Berhasil Dikonfirmasi!');
         fetchEventRegistrations();
      } catch (err: any) {
         alert('Gagal konfirmasi kehadiran: ' + err.message);
      }
   };

   const fetchBotSettings = async () => { const { data } = await supabase.from('pengaturan_bot').select('*'); setBotSettings(data || []); };
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
   
   const fetchEventRegistrations = async () => { const { data } = await supabase.from('event_registrations').select('*').order('created_at', { ascending: false }); setEventRegistrations(data || []); };
   const fetchEvents = async () => { 
      const { data } = await supabase.from('events').select('*').order('created_at', { ascending: false }); 
      setEvents(data || []); 
      try {
         const { data: regData } = await supabase.from('event_registrations').select('event_name');
         if (regData) {
            const counts: Record<string, number> = {};
            regData.forEach((r: any) => {
               counts[r.event_name] = (counts[r.event_name] || 0) + 1;
            });
            setEventRegistrationsCount(counts);
         }
      } catch (e) {}
   };


   // --- EXPORT CSV LOGIC ---
   const handleExportCSVClaim = () => {
      // Hanya keluarkan data yang statusnya belum selesai (bukan Hijau) dan bukan Tidak Valid (Merah)
      const unfinishedClaims = claims.filter(c => {
         const color = getClaimStatusColor(c);
         return color !== 'Hijau' && color !== 'Merah';
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
            const lines = text.split('\n');

            // Membersihkan header dari keterangan tambahan '(kosongkan jika data baru)'
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').split(' ')[0]);

            const result = [];

            for (let i = 1; i < lines.length; i++) {
               if (!lines[i].trim()) continue;
               const obj: any = {};
               const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

               headers.forEach((header, j) => {
                  let val: any = currentline[j] ? currentline[j].trim().replace(/^"|"$/g, '') : null;
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

            const { error } = await supabase.from(importTarget).upsert(result);
            if (error) throw error;

            alert(`Data CSV berhasil di-update ke tabel ${importTarget}!`);
            window.location.reload();
         } catch (error: any) {
            alert('Gagal import CSV: Pastikan format sesuai template. Pesan Error: ' + error.message);
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
      return `MKTG/BA${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
   };

   const openModal = (action: 'create' | 'edit' | 'reset_pw' | 'return', type: 'claim' | 'warranty' | 'promo' | 'service' | 'budget' | 'karyawan' | 'lending' | 'konsumen' | 'botsettings' | 'event' | 'eventregistration', item?: any) => {
      setModalAction(action);
      if (type === 'claim') {
         setClaimForm(item || { validasi_by_mkt: 'Dalam Proses Verifikasi', validasi_by_fa: 'Dalam Proses Verifikasi' });
         setEditingId(item?.id_claim || null);
      }
      else if (type === 'warranty') {
         setWarrantyForm(item || { status_validasi: 'Menunggu', jenis_garansi: 'Jasa 30%', lama_garansi: '1 Tahun' });
         setEditingId(item?.id_garansi || null);
      }
      else if (type === 'promo') {
         setPromoForm(item || { status_aktif: true, tipe_produk: [] });
         setEditingId(item?.id_promo || null);
      }
      else if (type === 'service') {
         setServiceForm(item || {});
         setEditingId(item?.id_service || null);
      }
      else if (type === 'budget') {
         setBudgetForm(item || { proposal_no: generateProposalNo(), total_cost: 0, items: [], drafter_name: currentUser?.nama_karyawan, budget_source: 'Marketing Budget', attachment_urls: [null, null, null] });
         setEditingId(item?.id_budget || null);
      }
      else if (type === 'lending') {
         setLendingForm(item ? { ...item, items_dipinjam: item.items_dipinjam || [] } : { items_dipinjam: [{ nama_barang: '', nomor_seri: '', catatan: '', catatan_pengembalian: '', status_pengembalian: 'dipinjam' }], status_peminjaman: 'aktif' });
         setEditingId(item?.id_peminjaman || null);
      }
      else if (type === 'botsettings') {
         setBotSettingsForm(item || {});
         setEditingId(item?.id || null);
      }
      else if (type === 'konsumen') {
         setKonsumenForm(item || { status_langkah: 'START', nik: 'BELUM_DIISI', alamat_rumah: 'BELUM_DIISI', kelurahan: 'BELUM_DIISI', kecamatan: 'BELUM_DIISI', kabupaten_kotamadya: 'BELUM_DIISI', provinsi: 'BELUM_DIISI', kodepos: 'BELUM_DIISI' });
         setEditingId(item?.nomor_wa || null);
      }
      else if (type === 'karyawan') {
         if (action === 'reset_pw') {
            setKaryawanForm({
               id_karyawan: item.id_karyawan,
               username: item.username,
               nama_karyawan: item.nama_karyawan,
               nomor_wa: item.nomor_wa,
               password: ''
            });
         } else {
            setKaryawanForm(item || { role: 'Karyawan', status_aktif: true, akses_halaman: ['messages'] });
         }
         setEditingId(item?.id_karyawan || null);
      }
      else if (type === 'event') {
         setEventForm(item || { event_status: 'In stock', event_partisipant_stock: 0, event_payment_tipe: 'regular' });
         setEditingId(item?.id || null);
         setEventImageFile(null);
         setEventPaymentScreenshotFile(null);
      }
      else if (type === 'eventregistration') {
         setRegistrationForm(item || { status: 'Pending Payment' });
         setEditingId(item?.id || null);
      }
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setClaimForm({});
      setWarrantyForm({});
      setPromoForm({ tipe_produk: [] });
      setServiceForm({});
      setBudgetForm({ items: [] });
      setKonsumenForm({});
      setKaryawanForm({});
      setLendingForm({ items_dipinjam: [], status_peminjaman: 'aktif' });
      setBotSettingsForm({});
      setEventForm({ event_status: 'In stock', event_partisipant_stock: 0, event_payment_tipe: 'regular' });
      setRegistrationForm({ status_pendaftaran: 'menunggu_validasi' });
      setEventImageFile(null);
      setEventPaymentScreenshotFile(null);
      setEditingId(null);
      if (returnTab) {
         setActiveTab(returnTab);
         setReturnTab(null);
      }
   };

   // --- CRUD HANDLERS ---
   const handleSaveKonsumen = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         if (modalAction === 'create') {
            await supabase.from('konsumen').insert([konsumenForm]);
         } else {
            await supabase.from('konsumen').update(konsumenForm).eq('nomor_wa', editingId);
         }
         fetchConsumers();
         closeModal();
      } catch (err: any) {
         alert('Gagal simpan konsumen: ' + err.message);
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleSaveClaim = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         // 1. Ambil data asli sebelum diupdate untuk cek file yang perlu dihapus
         let original: any = null;
         if (modalAction === 'edit' && editingId) {
            const { data } = await supabase.from('claim_promo').select('link_kartu_garansi, link_nota_pembelian').eq('id_claim', editingId).single();
            original = data;
         }

         let notaUrl = claimForm.link_nota_pembelian;
         let garansiUrl = claimForm.link_kartu_garansi;

         // 2. Upload file baru jika ada (tipe File)
         if (claimForm.link_nota_pembelian instanceof File) {
            notaUrl = await uploadFileToStorage(claimForm.link_nota_pembelian, 'NotaDashboard', claimForm.nomor_seri || 'UNKN');
            if (original?.link_nota_pembelian) await deleteFileFromStorage(original.link_nota_pembelian);
         } else if (claimForm.link_nota_pembelian === null && original?.link_nota_pembelian) {
            await deleteFileFromStorage(original.link_nota_pembelian);
         }

         if (claimForm.link_kartu_garansi instanceof File) {
            garansiUrl = await uploadFileToStorage(claimForm.link_kartu_garansi, 'GaransiDashboard', claimForm.nomor_seri || 'UNKN');
            if (original?.link_kartu_garansi) await deleteFileFromStorage(original.link_kartu_garansi);
         } else if (claimForm.link_kartu_garansi === null && original?.link_kartu_garansi) {
            await deleteFileFromStorage(original.link_kartu_garansi);
         }

         const dataToSave = {
            ...claimForm,
            nama_toko: claimForm.nama_toko || '',
            jenis_promosi: claimForm.jenis_promosi || '',
            nama_jasa_pengiriman: claimForm.nama_jasa_pengiriman || '',
            nomor_resi: claimForm.nomor_resi || '',
            catatan_mkt: claimForm.catatan_mkt || '',
            catatan_fa: claimForm.catatan_fa || '',
            link_kartu_garansi: garansiUrl ?? '',
            link_nota_pembelian: notaUrl ?? '',
         };

         if (modalAction === 'create') {
            const { error: insertError } = await supabase.from('claim_promo').insert([{ ...dataToSave, created_at: new Date().toISOString() }]);
            if (insertError) throw new Error(insertError.message);
         } else {
            const { error: updateError } = await supabase.from('claim_promo').update(dataToSave).eq('id_claim', editingId);
            if (updateError) throw new Error(updateError.message);
         }

         if (dataToSave.validasi_by_mkt === 'Valid' && dataToSave.nomor_seri) {
            await supabase.from('garansi').update({ status_validasi: 'Valid' }).eq('nomor_seri', dataToSave.nomor_seri);
            fetchWarranties();
         }

         fetchClaims();
         closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleSaveWarranty = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         let original: any = null;
         if (modalAction === 'edit' && editingId) {
            const { data } = await supabase.from('garansi').select('link_kartu_garansi, link_nota_pembelian').eq('id_garansi', editingId).single();
            original = data;
         }

         let notaUrl = warrantyForm.link_nota_pembelian;
         let garansiUrl = warrantyForm.link_kartu_garansi;

         if (warrantyForm.link_nota_pembelian instanceof File) {
            notaUrl = await uploadFileToStorage(warrantyForm.link_nota_pembelian, 'NotaDashboard', warrantyForm.nomor_seri || 'UNKN');
            if (original?.link_nota_pembelian) await deleteFileFromStorage(original.link_nota_pembelian);
         } else if (warrantyForm.link_nota_pembelian === null && original?.link_nota_pembelian) {
            await deleteFileFromStorage(original.link_nota_pembelian);
         }

         if (warrantyForm.link_kartu_garansi instanceof File) {
            garansiUrl = await uploadFileToStorage(warrantyForm.link_kartu_garansi, 'GaransiDashboard', warrantyForm.nomor_seri || 'UNKN');
            if (original?.link_kartu_garansi) await deleteFileFromStorage(original.link_kartu_garansi);
         } else if (warrantyForm.link_kartu_garansi === null && original?.link_kartu_garansi) {
            await deleteFileFromStorage(original.link_kartu_garansi);
         }

         const dataToSave = {
            ...warrantyForm,
            link_kartu_garansi: garansiUrl,
            link_nota_pembelian: notaUrl,
         };

         if (modalAction === 'create') await supabase.from('garansi').insert([dataToSave]);
         else await supabase.from('garansi').update(dataToSave).eq('id_garansi', editingId);

         fetchWarranties(); closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleSavePromo = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         if (modalAction === 'create') await supabase.from('promosi').insert([promoForm]);
         else await supabase.from('promosi').update(promoForm).eq('id_promo', editingId);
         fetchPromos(); closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleSaveService = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         if (modalAction === 'create') await supabase.from('status_service').insert([serviceForm]);
         else await supabase.from('status_service').update(serviceForm).eq('id_service', editingId);
         fetchServices(); closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleSaveBudget = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         const { data: original } = await supabase.from('budget_approval').select('attachment_urls').eq('id_budget', editingId).single();
         const finalUrls = [...(budgetForm.attachment_urls || [])];

         for (let i = 0; i < finalUrls.length; i++) {
            const item = finalUrls[i];
            if (item instanceof File) {
               const uploadedUrl = await uploadFileToStorage(item, 'BudgetApproval', budgetForm.proposal_no || 'UNKN');
               // Hapus yang lama jika ada
               if (original?.attachment_urls?.[i]) await deleteFileFromStorage(original.attachment_urls[i]);
               finalUrls[i] = uploadedUrl;
            } else if (item === null && original?.attachment_urls?.[i]) {
               await deleteFileFromStorage(original.attachment_urls[i]);
            }
         }

         const dataToSave = { ...budgetForm, attachment_urls: finalUrls };
         if (modalAction === 'create') await supabase.from('budget_approval').insert([dataToSave]);
         else await supabase.from('budget_approval').update(dataToSave).eq('id_budget', editingId);

         fetchBudgets(); closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleSaveKaryawan = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         const tempPw = Math.random().toString(36).substring(2, 10);
         const passwordToUse = karyawanForm.password || tempPw;

         if (modalAction === 'create') {
            if (!karyawanForm.nomor_wa) throw new Error("Nomor WhatsApp wajib diisi!");
            await supabase.from('karyawan').insert([{ ...karyawanForm, password: passwordToUse }]);

            const msg = whatsappMessages.newKaryawan(karyawanForm.nama_karyawan!, karyawanForm.username!, passwordToUse);
            await sendWhatsAppMessageViaFonnte(karyawanForm.nomor_wa, msg);
         } else {
            const updateData = { ...karyawanForm };
            if (!updateData.password) delete updateData.password;
            await supabase.from('karyawan').update(updateData).eq('id_karyawan', editingId);

            if (updateData.password && karyawanForm.nomor_wa) {
               const msg = whatsappMessages.updatePasswordAdmin(karyawanForm.nama_karyawan!, updateData.password);
               await sendWhatsAppMessageViaFonnte(karyawanForm.nomor_wa, msg);
            }
         }
         fetchKaryawans(); closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleResetPwAdmin = async (e: React.FormEvent) => {
      e.preventDefault(); setIsSubmitting(true);
      try {
         if (!karyawanForm.password) throw new Error("Password baru wajib diisi!");
         await supabase.from('karyawan').update({ password: karyawanForm.password }).eq('id_karyawan', editingId);

         if (karyawanForm.nomor_wa) {
            const msg = whatsappMessages.resetPasswordAdmin(karyawanForm.nama_karyawan!, karyawanForm.password!);
            await sendWhatsAppMessageViaFonnte(karyawanForm.nomor_wa, msg);
         }

         alert(`Password untuk ${karyawanForm.username} berhasil di-reset dan dikirim via WA!`);
         fetchKaryawans(); closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleSaveLending = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         // 1. Pastikan konsumen ada atau buat baru
         let { data: existingConsumer, error: consumerError } = await supabase.from('konsumen').select('nomor_wa').eq('nomor_wa', lendingForm.nomor_wa_peminjam!).single();
         if (consumerError && consumerError.code === 'PGRST116') { // Not found
            await supabase.from('konsumen').insert({
               nomor_wa: lendingForm.nomor_wa_peminjam!,
               nama_lengkap: lendingForm.nama_peminjam!,
               status_langkah: 'START',
               alamat_rumah: 'BELUM_DIISI', kelurahan: 'BELUM_DIISI', kecamatan: 'BELUM_DIISI',
               kabupaten_kotamadya: 'BELUM_DIISI', provinsi: 'BELUM_DIISI', kodepos: 'BELUM_DIISI'
            });
         } else if (consumerError) {
            throw consumerError;
         }

         // 2. Upload KTP file if exists
         let ktpUrl = lendingForm.link_ktp_peminjam;
         if (lendingForm.link_ktp_peminjam instanceof File) {
            // Upload file baru
            ktpUrl = await uploadFileToStorage(lendingForm.link_ktp_peminjam, 'KTP_Peminjam', lendingForm.nomor_wa_peminjam!);
            // Hapus file lama jika ada dan ini adalah mode edit
            if (modalAction === 'edit' && editingId) {
               const { data: originalLending } = await supabase.from('peminjaman_barang').select('link_ktp_peminjam').eq('id_peminjaman', editingId).single();
               if (originalLending?.link_ktp_peminjam) await deleteFileFromStorage(originalLending.link_ktp_peminjam);
            }
         } else if (modalAction === 'edit' && editingId && lendingForm.link_ktp_peminjam === null) {
            // Jika link_ktp_peminjam diatur null, hapus file lama dari storage
            const { data: originalLending } = await supabase.from('peminjaman_barang').select('link_ktp_peminjam').eq('id_peminjaman', editingId).single();
            if (originalLending?.link_ktp_peminjam) await deleteFileFromStorage(originalLending.link_ktp_peminjam);
         }

         const dataToSave: Partial<PeminjamanBarang> = { ...lendingForm, link_ktp_peminjam: ktpUrl };
         if (modalAction === 'create') {
            dataToSave.tanggal_peminjaman = new Date().toISOString();
            dataToSave.status_peminjaman = 'aktif';
         }
         if (modalAction === 'create') await supabase.from('peminjaman_barang').insert([dataToSave]);
         else await supabase.from('peminjaman_barang').update(dataToSave).eq('id_peminjaman', editingId);

         // 3. Send WhatsApp message
         let message = whatsappMessages.lendingInitHeader(lendingForm.nama_peminjam!);
         lendingForm.items_dipinjam?.forEach((item, idx) => {
            message += whatsappMessages.lendingInitItem(idx, item.nama_barang, item.nomor_seri, item.catatan || '');
         });
         // The initial message for lending doesn't need return notes.
         message += whatsappMessages.lendingInitFooter();
         await sendWhatsAppMessageViaFonnte(lendingForm.nomor_wa_peminjam!, message);

         fetchLendingRecords();
         closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   
   
   const handleSaveRegistration = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         const payload = { ...registrationForm };
         if (modalAction === 'create') {
            const { error } = await supabase.from('event_registrations').insert([payload]);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('event_registrations').update(payload).eq('id', editingId);
            if (error) throw error;
         }
         fetchEventRegistrations();
         fetchEvents();
         closeModal();
      } catch (err: any) { alert(err.message); }
   };

   const handleSaveEvent = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
         const payload = { ...eventForm };
         const titleSlug = eventForm.event_title?.replace(/\s+/g, '_') || 'event';
         if (eventImageFile) {
            const imageUrl = await uploadFileToStorage(eventImageFile, 'EventPoster', titleSlug);
            payload.event_image = imageUrl;
         }
         if (eventPaymentScreenshotFile) {
            const paymentUrl = await uploadFileToStorage(eventPaymentScreenshotFile, 'EventPaymentInfo', titleSlug);
            payload.event_upload_payment_screenshot = paymentUrl;
         }
         if (modalAction === 'create') {
            const { error } = await supabase.from('events').insert([payload]);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('events').update(payload).eq('id', editingId);
            if (error) throw error;
         }
         fetchEvents();
         closeModal();
      } catch (err: any) { alert(err.message); }
   };

   const handleSaveBotSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         if (modalAction === 'create') {
            await supabase.from('pengaturan_bot').insert([botSettingsForm]);
         } else {
            await supabase.from('pengaturan_bot').update(botSettingsForm).eq('id', editingId);
         }
         fetchBotSettings();
         closeModal();
      } catch (err: any) { alert('Gagal menyimpan pengaturan bot: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleDelete = async (type: 'claim' | 'warranty' | 'promo' | 'service' | 'budget' | 'karyawan' | 'lending' | 'konsumen' | 'botsettings' | 'events' | 'eventregistration', id: string) => {
      if (!window.confirm('Yakin menghapus data?')) return;
      if (type === 'claim') { await supabase.from('claim_promo').delete().eq('id_claim', id); fetchClaims(); }
      else if (type === 'warranty') { await supabase.from('garansi').delete().eq('id_garansi', id); fetchWarranties(); }
      else if (type === 'konsumen') { await supabase.from('konsumen').delete().eq('nomor_wa', id); fetchConsumers(); }
      else if (type === 'promo') { await supabase.from('promosi').delete().eq('id_promo', id); fetchPromos(); }
      else if (type === 'service') { await supabase.from('status_service').delete().eq('id_service', id); fetchServices(); }
      else if (type === 'karyawan') { await supabase.from('karyawan').delete().eq('id_karyawan', id); fetchKaryawans(); }
      else if (type === 'botsettings') { await supabase.from('pengaturan_bot').delete().eq('id', id); fetchBotSettings(); } else if (type === 'events') { await supabase.from('events').delete().eq('id', id); fetchEvents(); }
      else if (type === 'eventregistration') { await supabase.from('event_registrations').delete().eq('id', id); fetchEventRegistrations(); fetchEvents(); }
      else if (type === 'lending') {
         await supabase.from('peminjaman_barang').delete().eq('id_peminjaman', id);
         // TODO: Delete KTP file from storage if it exists
         fetchLendingRecords();
      }
      else { await supabase.from('budget_approval').delete().eq('id_budget', id); fetchBudgets(); }
   };

   const handleSendReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedWa || !replyText.trim()) return;
      let fullMessage = replyText.trim();
      if (replyToMessage) {
         const quotedText = replyToMessage.isi_pesan.length > 80 ? replyToMessage.isi_pesan.substring(0, 80) + '...' : replyToMessage.isi_pesan;
         const quotedName = replyToMessage.arah_pesan === 'OUT' ? 'Anda' : getRealProfileName(replyToMessage.nomor_wa);
         fullMessage = `> _${quotedName}: ${quotedText}_\n\n${replyText.trim()}`;
      }
      await sendWhatsAppMessageViaFonnte(selectedWa, fullMessage);
      await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', selectedWa);
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: selectedWa, nama_profil_wa: getRealProfileName(selectedWa), arah_pesan: 'OUT', isi_pesan: fullMessage, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      setReplyText('');
      setReplyToMessage(null);
      fetchMessages();
      scrollToBottom();
   };

   const handleSendNewChat = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newChatWa || !newChatMsg.trim()) return;
      await sendWhatsAppMessageViaFonnte(newChatWa, newChatMsg.trim());
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: newChatWa, nama_profil_wa: getRealProfileName(newChatWa), arah_pesan: 'OUT', isi_pesan: newChatMsg.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      setIsNewChatModalOpen(false);
      setNewChatWa('');
      setNewChatMsg('');
      setSelectedWa(newChatWa);
      scrollToBottom();
   };

   const handleKirimStatusClaim = async (c: ClaimPromo) => {

      if (!window.confirm('Kirim status claim ke WA konsumen?')) return;
      const msg = whatsappMessages.statusClaim(c.nomor_seri, c.tipe_barang, c.validasi_by_mkt, c.validasi_by_fa, c.nama_jasa_pengiriman || '-', c.nomor_resi || '-', c.catatan_mkt || '');
      await sendWhatsAppMessageViaFonnte(c.nomor_wa, msg);
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: c.nomor_wa, nama_profil_wa: getRealProfileName(c.nomor_wa), arah_pesan: 'OUT', isi_pesan: msg, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      alert('Pesan status berhasil dikirim!');
      fetchMessages();
   };

   const handleKirimStatusGaransi = async (w: Garansi) => {
      const linked = claims.find(c => c.nomor_seri === w.nomor_seri);
      if (!linked || !linked.nomor_wa) return alert('Gagal: Tidak dapat menemukan Nomor WA (Barang ini tidak ada di tabel Claim Promo).');
      if (!window.confirm('Kirim status garansi ke WA konsumen?')) return;
      const msg = whatsappMessages.statusGaransi(w.nomor_seri, w.tipe_barang, w.jenis_garansi, w.lama_garansi, calculateSisaGaransi(linked.tanggal_pembelian, w.lama_garansi));
      await sendWhatsAppMessageViaFonnte(linked.nomor_wa, msg);
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: linked.nomor_wa, nama_profil_wa: getRealProfileName(linked.nomor_wa), arah_pesan: 'OUT', isi_pesan: msg, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      alert('Pesan status berhasil dikirim!');
      fetchMessages();
   };

   const handleSendEventSuccessWA = async (reg: EventRegistration) => {
      if (!window.confirm(`Kirim notifikasi konfirmasi pembayaran ke ${reg.nama_lengkap}?`)) return;

      const message = `Halo *${reg.nama_lengkap}*,\n\nPembayaran Anda untuk event *${reg.event_name}* telah kami validasi. ✅\n\nSilakan simpan pesan ini sebagai bukti pendaftaran resmi. Sampai jumpa di lokasi acara!\n\nSalam,\nNikon Indonesia`;

      try {
         await sendWhatsAppMessageViaFonnte(reg.nomor_wa, message);
         await supabase.from('riwayat_pesan').insert([{
            nomor_wa: reg.nomor_wa,
            nama_profil_wa: reg.nama_lengkap,
            arah_pesan: 'OUT',
            isi_pesan: message,
            waktu_pesan: new Date().toISOString(),
            bicara_dengan_cs: false
         }]);
         alert('Notifikasi berhasil dikirim!');
         fetchMessages();
      } catch (err: any) {
         alert('Gagal mengirim pesan: ' + err.message);
      }
   };

   const handleSelesaiCS = async (nomor_wa: string) => {
      try {
         await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', nomor_wa);
         await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomor_wa);
         fetchMessages();
      } catch (error: any) {
         console.error('Gagal update CS:', error.message);
      }
   };

   const handleReturnItems = async (lending: PeminjamanBarang) => {
      if (!window.confirm('Yakin mengembalikan barang yang dipilih?')) return;
      setIsSubmitting(true);
      try {
         const allItemsReturned = lending.items_dipinjam.every(item => item.status_pengembalian === 'dikembalikan');
         const newStatusPeminjaman = allItemsReturned ? 'selesai' : 'aktif';

         await supabase.from('peminjaman_barang').update({
            items_dipinjam: lending.items_dipinjam,
            tanggal_pengembalian: allItemsReturned ? new Date().toISOString() : null,
            status_peminjaman: newStatusPeminjaman,
         }).eq('id_peminjaman', lending.id_peminjaman);

         // Send WhatsApp message for returned items
         const returnedItems = lending.items_dipinjam.filter(item => item.status_pengembalian === 'dikembalikan');
         if (returnedItems.length > 0) {
            let message = whatsappMessages.lendingReturnHeader(lending.nama_peminjam);
            returnedItems.forEach((item, idx) => {
               message += whatsappMessages.lendingReturnItem(idx, item.nama_barang, item.nomor_seri, item.catatan_pengembalian || '');
            });
            message += whatsappMessages.lendingReturnFooter();
            await sendWhatsAppMessageViaFonnte(lending.nomor_wa_peminjam, message);
         }

         fetchLendingRecords();
         closeModal();
      } catch (err: any) { alert('Gagal mengembalikan barang: ' + err.message); }
      finally { setIsSubmitting(false); }
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
      } catch (err: any) { alert('Gagal membersihkan sesi: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const calculateSisaGaransi = (tgl: string | undefined, lama: string) => {
      if (!tgl || !lama || lama === 'Tidak Garansi') return 'Tidak Garansi';
      const beli = new Date(tgl);
      beli.setFullYear(beli.getFullYear() + (lama === '1 Tahun' ? 1 : 2));
      const diff = beli.getTime() - new Date().getTime();
      return diff < 0 ? 'Garansi Habis' : `${Math.ceil(diff / (1000 * 60 * 60 * 24))} Hari`;
   };

   const getRealProfileName = (nomorWa: string | null) => {
      if (!nomorWa) return 'Pelanggan';
      // Prioritas 1: Nama dari data konsumen (database)
      if (consumers[nomorWa]) return consumers[nomorWa];
      // Prioritas 2: Nama profil WhatsApp dari riwayat pesan terbaru (Abaikan "Sistem Bot")
      const latestMsgWithProfile = messages.find(m => m.nomor_wa === nomorWa && m.nama_profil_wa && m.nama_profil_wa !== m.nomor_wa && m.nama_profil_wa !== "Sistem Bot");
      return latestMsgWithProfile?.nama_profil_wa || nomorWa;
   };

   const getNamaPromo = (tipeBarang: string) => {
      if (!tipeBarang) return '-';
      const matchedPromo = promos.find(p => p.tipe_produk && p.tipe_produk.some(prod => tipeBarang.toLowerCase().includes(prod.nama_produk.toLowerCase()) || prod.nama_produk.toLowerCase().includes(tipeBarang.toLowerCase())));
      return matchedPromo ? matchedPromo.nama_promo : '-';
   };

   // --- PRINT LABEL PENGIRIMAN (HTML5 CANVAS) ---
   const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';
      words.forEach(word => {
         const testLine = currentLine ? `${currentLine} ${word}` : word;
         const metrics = ctx.measureText(testLine);
         if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
         } else {
            currentLine = testLine;
         }
      });
      if (currentLine) lines.push(currentLine);
      return lines;
   };

   const handlePrintLabelPengiriman = (c: ClaimPromo, rowNumber?: number) => {
      const consumer = consumersList.find(k => k.nomor_wa === c.nomor_wa);
      const canvas = document.createElement('canvas');
      canvas.width = 850;
      canvas.height = 320;
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
      ctx.font = '16px Arial';
      ctx.fillText('Kepada :', 40, 80);
      const nama = (consumer?.nama_lengkap || consumers[c.nomor_wa] || c.nomor_wa).toUpperCase();
      ctx.fillText(`${nama} (${c.nomor_wa})`, 160, 80);
      const alamat = consumer?.alamat_rumah !== 'BELUM_DIISI' ? consumer?.alamat_rumah : '-';
      const alamatLines = wrapText(ctx, (alamat || '-').toUpperCase(), 650);
      let currentY = 110;
      alamatLines.forEach((line, index) => {
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
      ctx.fillText('From :', 40, 230);
      ctx.fillText('Alta Nikindo', 160, 230);
      ctx.fillText('Komp. Mangga Dua Square Blok H No.1-2, Jakarta - 14430', 160, 260);
      ctx.fillText('Whatsapp : 08111877781', 160, 290);
      ctx.textAlign = 'right';
      const sn = c.nomor_seri || '-';
      const promoName = c.jenis_promosi || getNamaPromo(c.tipe_barang);
      ctx.fillText(`${sn} - ${promoName}`, canvas.width - 30, 290);
      const imgURL = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = imgURL;
      const sanitizedNama = nama.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedSeri = (c.nomor_seri || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${sanitizedNama}_${sanitizedSeri}_Label.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
   };

   const uniqueContacts = useMemo(() => {
      return Array.from(messages.reduce((map, msg) => {
         if (msg.nomor_wa) {
            if (!map.has(msg.nomor_wa)) map.set(msg.nomor_wa, { ...msg });
            else if (msg.bicara_dengan_cs) map.get(msg.nomor_wa)!.bicara_dengan_cs = true;
         }
         return map;
      }, new Map()).values()) as RiwayatPesan[];
   }, [messages]);

   const { messageStats, currentTotalConsumers } = useMemo(() => {
      const grouped = new Map<string, Set<string>>();
      messages.forEach(msg => {
         try {
            const timeStr = msg.created_at || msg.waktu_pesan;
            if (!timeStr) return;
            const d = new Date(timeStr);
            if (isNaN(d.getTime())) return;

            let key = '';
            if (msgTimeFilter === 'day') {
               key = d.toISOString().split('T')[0];
            } else if (msgTimeFilter === 'week') {
               const firstDayOfYear = new Date(d.getFullYear(), 0, 1);
               const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
               const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
               key = `${d.getFullYear()}-Minggu ${weekNum}`;
            } else {
               key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            }
            if (!grouped.has(key)) grouped.set(key, new Set());
            grouped.get(key)!.add(msg.nomor_wa);
         } catch (e) { console.error("Error processing stats date:", e); }
      });
      const stats = Array.from(grouped.entries()).map(([k, v]) => ({ periode: k, jumlah_konsumen: v.size })).sort((a, b) => a.periode.localeCompare(b.periode));
      const total = stats.reduce((sum, item) => sum + item.jumlah_konsumen, 0);
      return { messageStats: stats, currentTotalConsumers: total };
   }, [messages, msgTimeFilter]);

   const filteredContacts = useMemo(() => uniqueContacts.filter((c: RiwayatPesan) => {
      const name = getRealProfileName(c.nomor_wa).toLowerCase();
      const num = (c.nomor_wa || "").toLowerCase();
      const search = searchChat.toLowerCase();
      return name.includes(search) || num.includes(search);
   }), [uniqueContacts, searchChat, consumers, messages]);

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
   }, [filteredConsumers, sortConfigKonsumen]);

   const currentChatThread = useMemo(() => {
      if (!selectedWa) return [];
      return messages
         .filter((m: RiwayatPesan) => m.nomor_wa === selectedWa)
         .sort((a, b) => {
            const dateA = new Date(a.waktu_pesan || a.created_at || 0).getTime();
            const dateB = new Date(b.waktu_pesan || b.created_at || 0).getTime();
            return dateA - dateB;
         });
   }, [selectedWa, messages]);

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
   }, [filteredPromos, sortConfigPromos, consumers]);
   
   const claimStatusCounts = useMemo(() => {
      const counts: Record<string, number> = { Putih: 0, Merah: 0, Orange: 0, Biru: 0, Pink: 0, Hijau: 0 };
      claims.forEach(c => {
         const color = getClaimStatusColor(c);
         if (counts[color] !== undefined) counts[color]++;
      });
      return counts;
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
      return true;
   }), [claims, searchClaim, filterStatusWarna, consumers, promos]); // Keep filteredClaims for search

   const sortedClaims = useMemo(() => {
      const sortableItems = [...filteredClaims];
      return sortableItems.sort(getSortFunction(sortConfigClaims, consumers));
   }, [filteredClaims, sortConfigClaims, consumers]);

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

   const filteredEvents = useMemo(() => events.filter((e: EventData) => (e.event_title || "").toLowerCase().includes(searchEvent.toLowerCase())), [events, searchEvent]);
   const sortedEvents = useMemo(() => {
      const sortableItems = [...filteredEvents];
      return sortableItems.sort(getSortFunction(sortConfigEvents, consumers));
   }, [filteredEvents, sortConfigEvents, consumers]);

   const getClaimDurationDays = (createdAt?: string) => {
      if (!createdAt) return '-';
      const created = new Date(createdAt);
      if (isNaN(created.getTime())) return '-';
      const diff = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      return `${diff} hari`;
   };

   const formatSubmitDate = (createdAt?: string) => {
      if (!createdAt) return '-';
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
   };

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
         if (list.length > 1) {
            for (let i = 0; i < list.length - 1; i++) {
               duplicatesToMark.add(list[i]);
            }
         }
      });
      return duplicatesToMark;
   }, [claims]);

   const filteredWarranties = useMemo(() => warranties.filter((w: Garansi) => (w.nomor_seri || "").toLowerCase().includes(searchGaransi.toLowerCase())), [warranties, searchGaransi]);
   const sortedWarranties = useMemo(() => {
      const sortableItems = [...filteredWarranties];
      return sortableItems.sort(getSortFunction(sortConfigWarranties, consumers));
   }, [filteredWarranties, sortConfigWarranties, consumers]);

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
   }, [filteredServices, sortConfigServices, consumers]);
   const filteredBudgets = useMemo(() => budgets.filter((b: BudgetApproval) => (b.title || "").toLowerCase().includes(searchBudget.toLowerCase())), [budgets, searchBudget]); // Keep filteredBudgets for search

   const sortedBudgets = useMemo(() => {
      const sortableItems = [...filteredBudgets];
      return sortableItems.sort(getSortFunction(sortConfigBudgets, consumers));
   }, [filteredBudgets, sortConfigBudgets, consumers]);

   const filteredKaryawans = useMemo(() => karyawans.filter((k: Karyawan) => { // Keep filteredKaryawans for search
      const nama = (k.nama_karyawan || "").toLowerCase();
      const user = (k.username || "").toLowerCase();
      const search = searchKaryawan.toLowerCase();
      return nama.includes(search) || user.includes(search);
   }), [karyawans, searchKaryawan]); // Keep filteredKaryawans for search
   const sortedKaryawans = useMemo(() => {
      const sortableItems = [...filteredKaryawans];
      return sortableItems.sort(getSortFunction(sortConfigKaryawans, consumers));
   }, [filteredKaryawans, sortConfigKaryawans, consumers]);
   // No need for filteredConsumers here, it's already defined above and sorted.

   const filteredLendingRecords = useMemo(() => lendingRecords.filter((l: PeminjamanBarang) => {
      const name = (l.nama_peminjam || "").toLowerCase();
      const wa = (l.nomor_wa_peminjam || "").toLowerCase();
      const status = (l.status_peminjaman || "").toLowerCase();
      const items = l.items_dipinjam.map(item => `${item.nama_barang} ${item.nomor_seri}`).join(' ').toLowerCase();
      const search = searchLending.toLowerCase();
      return name.includes(search) || wa.includes(search) || status.includes(search) || items.includes(search);
   }), [lendingRecords, searchLending]);

   const sortedLendingRecords = useMemo(() => {
      const sortableItems = [...filteredLendingRecords];
      return sortableItems.sort(getSortFunction(sortConfigLending, consumers));
   }, [filteredLendingRecords, sortConfigLending, consumers]);

   const ALL_TABS = [
      { id: 'dashboard', label: '🎯 Dashboard', count: undefined },
      { id: 'messages', label: '💬 Pesan', count: messages.length },
      { id: 'konsumen', label: '👥 Konsumen', count: consumersList.length },

      { id: 'promos', label: '📢 Promo', count: promos.length },
      { id: 'claims', label: '🎫 Claim', count: claims.length },
      { id: 'warranties', label: '🛡️ Garansi', count: warranties.length },
      { id: 'services', label: '🔧 Service', count: services.length },
      { id: 'budgets', label: '💳 ProposalEvent', count: budgets.length },
      { id: 'lending', label: '📦 Peminjaman', count: lendingRecords.length },
      { id: 'import', label: '📦 Import Data', count: undefined },
      { id: 'userrole', label: '🔐 User Role', count: karyawans.length },
      { id: 'botsettings', label: '⚙️ Bot Settings', count: botSettings.length },
      { id: 'events', label: '📅 Master Event', count: events.length },
      { id: 'eventregistrations', label: '👥 Data Peserta', count: eventRegistrations.length },
   ];

   const visibleTabs = ALL_TABS.filter(tab => {
      if (currentUser?.role === 'Admin') return true;
      if (tab.id === 'userrole') return false;
      return (currentUser?.akses_halaman || []).includes(tab.id);
   });

   useEffect(() => {
      if (currentUser && visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) { setActiveTab(visibleTabs[0].id); }
   }, [currentUser, activeTab, visibleTabs]);

   // --- UI RENDER ---

   if (!isLoggedIn) {
      return (
         <div className="flex items-center justify-center min-h-screen bg-black text-gray-900 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#FFE500 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-sm relative z-10 border-t-4 border-[#FFE500]">
               <div className="text-center mb-10">
                  <div className="mb-4 transform hover:scale-105 transition inline-block">
                     <img src="/nikon-logo.svg" alt="Nikon" className="h-16 w-auto rounded-xl shadow-lg" />
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

   if (loading) return <div className="flex justify-center items-center h-screen bg-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

   return (
      <>
         <div className={`min-h-screen bg-gray-50 flex flex-col relative text-gray-900 ${printData ? 'hidden print:hidden' : 'print:hidden'}`}>

            {/* HEADER */}
            <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg border-b-4 border-[#FFE500] px-4 md:px-6 py-4 flex justify-between items-center text-white sticky top-0 z-30">
               <div className="flex items-center gap-3 md:gap-4">
                  <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} /></svg>
                  </button>
                  <div className="shadow-lg rounded-lg overflow-hidden">
                     <img src="/nikon-logo.svg" alt="Nikon" className="h-10 w-auto" />
                  </div>
                  <div>
                     <h1 className="text-lg font-bold tracking-wide">Alta Nikindo</h1>
                     <p className="text-xs text-gray-400 font-medium">Role: <span className="text-[#FFE500] font-bold">{currentUser?.role}</span></p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="hidden md:block text-right">
                     <span className="text-sm font-medium text-gray-400 block">Selamat datang,</span>
                     <span className="text-sm font-bold text-[#FFE500]">{currentUser?.nama_karyawan}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-[#FFE500] text-black font-bold flex items-center justify-center shadow-md text-sm">{currentUser?.nama_karyawan?.substring(0, 1).toUpperCase()}</div>
                  {/* QUICK LINKS DROPDOWN */}
                  <div className="relative">
                     <button
                        onClick={() => setLinksMenuOpen(v => !v)}
                        className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-md flex items-center gap-1.5"
                        title="Link halaman event"
                     >
                        🔗 <span className="hidden md:inline">Links</span>
                        <svg className={`w-3 h-3 transition-transform ${linksMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                     </button>
                     {linksMenuOpen && (
                        <>
                           <div className="fixed inset-0 z-30" onClick={() => setLinksMenuOpen(false)} />
                           <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-2xl border border-gray-200 z-40 overflow-hidden">
                              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
                                 <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Halaman Publik (Customer)</p>
                              </div>
                              <a href="/events/register" target="_blank" rel="noopener noreferrer" onClick={() => setLinksMenuOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-yellow-50 transition-colors border-b border-gray-100">
                                 <span className="text-2xl">🎫</span>
                                 <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900">Katalog & Daftar Event</p>
                                    <p className="text-[11px] text-gray-500 truncate">/events/register</p>
                                 </div>
                                 <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                              <a href="/events/refund" target="_blank" rel="noopener noreferrer" onClick={() => setLinksMenuOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-yellow-50 transition-colors">
                                 <span className="text-2xl">💰</span>
                                 <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900">Klaim Pengembalian Deposit</p>
                                    <p className="text-[11px] text-gray-500 truncate">/events/refund</p>
                                 </div>
                                 <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>

                              <div className="bg-gray-50 px-4 py-2 border-b border-t border-gray-100">
                                 <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Halaman Admin</p>
                              </div>
                              <a href="/admin/events" target="_blank" rel="noopener noreferrer" onClick={() => setLinksMenuOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-yellow-50 transition-colors border-b border-gray-100">
                                 <span className="text-2xl">✅</span>
                                 <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900">Validasi Pembayaran Event</p>
                                    <p className="text-[11px] text-gray-500 truncate">/admin/events</p>
                                 </div>
                                 <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                              <a href="/admin/events/attendance" target="_blank" rel="noopener noreferrer" onClick={() => setLinksMenuOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-yellow-50 transition-colors border-b border-gray-100">
                                 <span className="text-2xl">📷</span>
                                 <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900">Absensi & Scan QR</p>
                                    <p className="text-[11px] text-gray-500 truncate">/admin/events/attendance</p>
                                 </div>
                                 <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                              <a href="/admin/events/deposit" target="_blank" rel="noopener noreferrer" onClick={() => setLinksMenuOpen(false)} className="flex items-start gap-3 px-4 py-3 hover:bg-yellow-50 transition-colors">
                                 <span className="text-2xl">💸</span>
                                 <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-gray-900">Kelola Deposit Event</p>
                                    <p className="text-[11px] text-gray-500 truncate">/admin/events/deposit</p>
                                 </div>
                                 <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>

                              <div className="bg-gray-50 px-4 py-2 border-t border-gray-100">
                                 <p className="text-[10px] text-gray-400">Klik untuk buka di tab baru</p>
                              </div>
                           </div>
                        </>
                     )}
                  </div>
                  <button onClick={handleLogout} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm">Logout</button>
               </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
               {/* MOBILE OVERLAY */}
               {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

               {/* SIDEBAR NAVIGATION */}
               <div className={`fixed md:relative z-20 md:z-auto top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm overflow-y-auto transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                  <div className="p-4 space-y-2 pt-20 md:pt-4">
                     {visibleTabs.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all text-sm flex items-center justify-between group ${activeTab === tab.id ? 'bg-[#FFE500] text-black shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}>
                           <span>{tab.label}</span>
                           {tab.count !== undefined && <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${activeTab === tab.id ? 'bg-black/20' : 'bg-gray-200 text-gray-600'}`}>{tab.count}</span>}
                        </button>
                     ))}

                     {/* EVENT TOOLS — link langsung ke page admin event */}
                     <div className="pt-4 mt-4 border-t border-gray-200">
                        <p className="px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Event Tools</p>
                        <a href="/admin/events/attendance" target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-3 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 mb-2">
                           <span className="flex items-center gap-2">📷 Absensi Scan QR</span>
                           <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a href="/admin/events" target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-3 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 mb-2">
                           <span className="flex items-center gap-2">✅ Validasi Bayar</span>
                           <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a href="/admin/events/deposit" target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-3 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200">
                           <span className="flex items-center gap-2">💸 Deposit</span>
                           <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                     </div>
                  </div>
               </div>

               {/* MAIN CONTENT */}
               <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 space-y-6">

               {/* ======================= DASHBOARD OVERVIEW ======================= */}
               {activeTab === 'dashboard' && (
                  <div className="animate-fade-in space-y-6">
                     {/* WELCOME CARD */}
                     <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 text-white shadow-lg border border-gray-700">
                        <div className="flex justify-between items-start">
                           <div>
                              <h2 className="text-3xl font-bold mb-2">Selamat Datang Kembali! 👋</h2>
                              <p className="text-gray-300">Anda login sebagai <span className="font-bold text-[#FFE500]">{currentUser?.nama_karyawan}</span> ({currentUser?.role})</p>
                              <p className="text-gray-400 text-sm mt-2">Dashboard diperbarui untuk pengalaman yang lebih baik</p>
                           </div>
                           <div className="shadow-lg rounded-lg overflow-hidden">
                              <img src="/nikon-logo.svg" alt="Nikon" className="h-16 w-auto" />
                           </div>
                        </div>
                     </div>

                     {/* STATISTICS CARDS */}
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="stat-card hover:shadow-lg transition-all">
                           <div className="flex items-center justify-between mb-3">
                              <div>
                                 <p className="stat-label">Total Messages</p>
                                 <p className="stat-value">{messages.length}</p>
                              </div>
                              <div className="text-4xl">💬</div>
                           </div>
                           <div className="text-xs text-gray-500">Chat history</div>
                        </div>

                        <div className="stat-card hover:shadow-lg transition-all">
                           <div className="flex items-center justify-between mb-3">
                              <div>
                                 <p className="stat-label">Claims Promo</p>
                                 <p className="stat-value">{claims.length}</p>
                              </div>
                              <div className="text-4xl">🎁</div>
                           </div>
                           <div className="text-xs text-gray-500">Active claims</div>
                        </div>

                        <div className="stat-card hover:shadow-lg transition-all">
                           <div className="flex items-center justify-between mb-3">
                              <div>
                                 <p className="stat-label">Warranties</p>
                                 <p className="stat-value">{warranties.length}</p>
                              </div>
                              <div className="text-4xl">🛡️</div>
                           </div>
                           <div className="text-xs text-gray-500">Product warranties</div>
                        </div>

                        <div className="stat-card hover:shadow-lg transition-all">
                           <div className="flex items-center justify-between mb-3">
                              <div>
                                 <p className="stat-label">Employees</p>
                                 <p className="stat-value">{karyawans.length}</p>
                              </div>
                              <div className="text-4xl">👥</div>
                           </div>
                           <div className="text-xs text-gray-500">Team members</div>
                        </div>
                     </div>

                     {/* QUICK ACTIONS */}
                     <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">⚡ Quick Actions</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                           <button onClick={() => setActiveTab('messages')} className="btn-primary text-center py-3 rounded-lg font-semibold hover:shadow-lg transition">
                              📨 Open Messages
                           </button>
                           <button onClick={() => setActiveTab('claims')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-sm">
                              🎯 View Claims
                           </button>
                           <button onClick={() => setActiveTab('import')} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition shadow-sm">
                              📤 Import Data
                           </button>
                        </div>
                     </div>

                     {/* INFO CARDS */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                           <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">💡 Tips</h4>
                           <ul className="text-sm text-blue-800 space-y-1">
                              <li>• Gunakan tab Pesan untuk komunikasi real-time</li>
                              <li>• Import data dalam urutan yang benar untuk hasil optimal</li>
                              <li>• Periksa database status di bagian bawah</li>
                           </ul>
                        </div>
                        <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
                           <h4 className="font-bold text-green-900 mb-2 flex items-center gap-2">✅ System Status</h4>
                           <div className="text-sm text-green-800 space-y-1">
                              <div className="flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                 Database Connected
                              </div>
                              <div className="flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                 All Services Running
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               )}

               {/* ======================= IMPORT DATA TAB ======================= */}
               {activeTab === 'import' && (
                  <div className="space-y-8 animate-fade-in text-gray-900">
                     <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-md">
                        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">📤 Pusat Upload & Update Database</h2>
                        <p className="text-gray-600 mb-6 text-sm">Pilih tabel target, unduh template untuk menyesuaikan kolom, lalu unggah file CSV Anda. Sistem akan melakukan *Upsert* (Update jika data sudah ada, Insert jika data baru).</p>
                        <p className="font-semibold text-gray-800 mb-3">Urutan template yang diupload :</p>
                        <ul className="list-disc list-inside text-gray-600 text-sm mb-6">
                           <li>Template 1: Tabel Konsumen (Wajib jika data konsumen belum ada, jika sudah bisa lanjut ke upload yang lainnya)</li>
                           <li>Template 2: Tabel Claim Promo</li>
                           <li>Template 3: Tabel Garansi</li>
                           <li>Template 4: Tabel Status Service</li>
                        </ul>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                           <div>
                              <label className="block text-sm font-bold mb-2">1. Pilih Tabel Database</label>
                              <select value={importTarget} onChange={e => setImportTarget(e.target.value as any)} className="w-full border border-gray-300 p-3 rounded-md bg-white text-gray-900 outline-none focus:ring-2 focus:ring-black">
                                 <option value="claim_promo">Tabel Claim Promo</option>
                                 <option value="garansi">Tabel Garansi</option>
                                 <option value="konsumen">Tabel Konsumen</option>
                                 <option value="status_service">Tabel Status Service</option>
                              </select>
                           </div>
                           <div>
                              <button onClick={downloadTemplate} className="w-full bg-gray-800 text-white p-3 rounded-md font-bold hover:bg-gray-700 transition">
                                 📥 Unduh Template CSV
                              </button>
                           </div>
                        </div>

                        <div className="mt-10 p-10 border-2 border-dashed border-gray-300 rounded-xl text-center bg-gray-50">
                           <div className="mb-4 text-4xl">📄</div>
                           <h3 className="font-bold text-lg mb-1">Upload File CSV</h3>
                           <p className="text-gray-500 text-sm mb-6">Pastikan file bertipe .csv dan mengikuti format template.</p>
                           <button onClick={() => fileInputRef.current?.click()} disabled={isSubmitting} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-slate-300 transition shadow-md">
                              {isSubmitting ? 'Sedang Memproses...' : 'Pilih File & Upload'}
                           </button>
                           <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleCentralUpload} />
                        </div>
                     </div>

                     <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-2">💡 Tips Penting:</h4>
                        <ul className="text-sm text-black list-disc ml-5 space-y-1 font-medium">
                           <li>Kolom ID adalah kunci utama. Jika Anda ingin mengupdate data lama, sertakan ID aslinya.</li>
                           <li>Jika ingin menambah data baru, kosongkan saja kolom ID tersebut.</li>
                           <li>Sistem secara otomatis akan mengisi <b>created_at</b>, <b>updated_at</b>, dan men-generate ID unik jika tidak diisi.</li>
                           <li>Gunakan aplikasi Excel atau Google Sheets untuk mengedit file template, lalu "Save As" sebagai CSV.</li>
                        </ul>
                     </div>
                  </div>
               )}

               {/* ======================= OTHER TABS FILTER HEADER ======================= */}
               {activeTab !== 'import' && activeTab !== 'lending' && activeTab !== 'messages' && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-wrap gap-4 justify-between items-center text-gray-900 mb-6">
                     <div className="flex flex-wrap gap-4 items-center">
                        {activeTab !== 'konsumen' && activeTab !== 'budgets' && activeTab !== 'userrole' && (
                           <>
                              <label className="text-sm font-bold">Dari: <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="ml-2 border border-gray-300 bg-white text-gray-900 rounded p-1 outline-none focus:border-[#FFE500]" /></label>
                              <label className="text-sm font-bold">Sampai: <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="ml-2 border border-gray-300 bg-white text-gray-900 rounded p-1 outline-none focus:border-[#FFE500]" /></label>
                           </>
                        )}
                        {activeTab !== 'konsumen' && (
                           <div className="flex items-center gap-2">
                              <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'table' ? 'bg-[#FFE500] text-black shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📋Baris</button>
                              <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'card' ? 'bg-[#FFE500] text-black shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🪪Kartu</button>
                           </div>
                        )}
                        {activeTab === 'konsumen' && <button onClick={() => openModal('create', 'konsumen')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Konsumen</button>}
                     </div>
                     <div className="flex flex-wrap gap-2 items-center">
                        {activeTab === 'claims' && (
                           <>
                              <button onClick={handleExportCSVClaim} className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">📥 Export CSV</button>
                              <button onClick={() => openModal('create', 'claim')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Claim</button>
                              </>
                        )}
                        {activeTab === 'botsettings' && <button onClick={() => openModal('create', 'botsettings')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Pengaturan</button>}
                       {activeTab === 'events' && <button onClick={() => openModal('create', 'event')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Event</button>}
                       {activeTab === 'eventregistrations' && <a href="/admin/events/attendance" target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-bold text-sm transition shadow-sm flex items-center gap-1.5">📷 Absensi & Scan QR<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>}
                        {activeTab === 'eventregistrations' && <button onClick={() => openModal('create', 'eventregistration')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Peserta</button>}
                        {activeTab === 'warranties' && <button onClick={() => openModal('create', 'warranty')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Garansi</button>}
                        {activeTab === 'services' && <button onClick={() => openModal('create', 'service')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Service</button>}
                        {activeTab === 'budgets' && <button onClick={() => openModal('create', 'budget')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Buat Proposal</button>}
                        {activeTab === 'promos' && currentUser?.role === 'Admin' && <button onClick={() => openModal('create', 'promo')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Promo</button>}
                        {activeTab === 'userrole' && currentUser?.role === 'Admin' && <button onClick={() => openModal('create', 'karyawan')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Karyawan</button>}
                     </div>
                  </div>
               )}

               {/* ======================= PESAN ======================= */}
               {activeTab === 'messages' && (
                  <div className="animate-fade-in text-gray-900 h-[calc(100vh-100px)] bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex">
                     {/* SIDEBAR: DAFTAR CHAT */}
                     <div className={`w-full md:w-[360px] lg:w-[420px] border-r border-gray-100 flex flex-col bg-white shrink-0 ${selectedWa ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center shrink-0">
                           <h3 className="font-bold text-lg flex items-center gap-2">💬 Pesan</h3>
                           <button onClick={handleRunCleanup} disabled={isSubmitting} className="ml-auto mr-3 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Bersihkan Sesi Inaktif">
                              {isSubmitting ? '⏳' : '🧹'}
                           </button>
                           <button onClick={() => setIsNewChatModalOpen(true)} className="w-10 h-10 flex items-center justify-center bg-[#FFE500] text-black rounded-lg shadow-md hover:bg-[#E5CE00] transition-all transform hover:scale-110">
                              <span className="text-xl font-bold">+</span>
                           </button>
                        </div>
                        <div className="p-4 bg-white shrink-0">
                           <div className="relative">
                              <input type="text" placeholder="Cari chat..." value={searchChat} onChange={e => setSearchChat(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FFE500] focus:border-transparent transition" />
                              <span className="absolute left-3 top-3 text-gray-400">🔍</span>
                           </div>
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                           {filteredContacts.map((c: RiwayatPesan) => {
                              const isNew = c.arah_pesan === 'IN' && (!readStatus[c.nomor_wa] || new Date(c.waktu_pesan || c.created_at!) > new Date(readStatus[c.nomor_wa]));
                              const profileName = getRealProfileName(c.nomor_wa);
                              return (
                                 <div key={c.nomor_wa} onClick={() => setSelectedWa(c.nomor_wa)} className={`flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-gray-50 ${selectedWa === c.nomor_wa ? 'bg-yellow-50 border-l-4 border-[#FFE500]' : ''}`}>
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FFE500] to-yellow-400 flex-shrink-0 flex items-center justify-center font-bold text-black text-lg border border-yellow-200 uppercase shadow-sm">
                                       {profileName.substring(0, 1)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex justify-between items-baseline mb-0.5">
                                          <h4 className={`text-sm truncate ${isNew ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'}`}>{profileName}</h4>
                                          <span className="text-[10px] text-gray-400 font-medium">{new Date(c.waktu_pesan || c.created_at || 0).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} {new Date(c.waktu_pesan || c.created_at || 0).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                       </div>
                                       <div className="flex justify-between items-center gap-2">
                                          <p className={`text-xs truncate flex-1 ${isNew ? 'font-bold text-gray-900' : 'text-gray-500'}`}>{c.isi_pesan}</p>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                             {c.bicara_dengan_cs && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-sm shadow-red-200"></span>}
                                             {isNew && <span className="bg-[#FFE500] text-black text-[9px] font-black px-1.5 py-0.5 rounded-full">BARU</span>}
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>

                     {/* MAIN CHAT AREA */}
                     <div className={`flex-1 flex flex-col bg-[#efeae2] relative min-w-0 ${selectedWa ? 'flex' : 'hidden md:flex'}`}>
                        {selectedWa ? (
                           <>
                              <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0 shadow-sm z-10">
                                 <div className="flex items-center gap-3">
                                    <button onClick={() => setSelectedWa(null)} className="md:hidden p-1 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full transition">
                                       <span className="text-xl">←</span>
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-500 uppercase">
                                       {getRealProfileName(selectedWa).substring(0, 1)}
                                    </div>
                                    <div>
                                       <h3 className="font-bold text-gray-900 leading-tight">{getRealProfileName(selectedWa)}</h3>
                                       <p className="text-[10px] font-bold text-gray-500">{selectedWa}</p>
                                    </div>
                                 </div>
                                 {uniqueContacts.find(c => c.nomor_wa === selectedWa)?.bicara_dengan_cs && (
                                    <button onClick={() => handleSelesaiCS(selectedWa)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-md">Tandai Selesai</button>
                                 )}
                              </div>
                              <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-3 relative scroll-smooth" style={{ backgroundImage: `url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')`, backgroundSize: '400px', backgroundRepeat: 'repeat' }}>
                                 {currentChatThread.map((msg: RiwayatPesan) => (
                                    <div key={msg.id_pesan || Math.random().toString()} className={`group flex ${msg.arah_pesan === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                                       <div className={`max-w-[85%] md:max-w-[70%] p-2.5 text-sm rounded-lg shadow-sm relative ${msg.arah_pesan === 'OUT' ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                                          <button
                                             onClick={() => setReplyToMessage(msg)}
                                             className={`absolute top-1 ${msg.arah_pesan === 'OUT' ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200`}
                                             title="Balas"
                                          >
                                             <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v6M3 10l6 6M3 10l6-6" /></svg>
                                          </button>
                                          {isImageUrl(msg.isi_pesan) ? (
                                             <div className="cursor-pointer" onClick={() => openImageViewer(msg.isi_pesan)}>
                                                <img src={msg.isi_pesan} alt="Media" className="max-w-full rounded-md max-h-64 object-cover mb-1" onLoad={scrollToBottom} />
                                             </div>
                                          ) : (
                                             <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.isi_pesan}</p>
                                          )}
                                          <div className="text-[9px] mt-1 text-right text-gray-500 font-bold">
                                             {(() => {
                                                const d = new Date(msg.waktu_pesan || msg.created_at || 0);
                                                return isNaN(d.getTime()) ? '-' : `${d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
                                             })()}
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                                 <div ref={messagesEndRef} />
                              </div>
                              <div className="shrink-0">
                                 {replyToMessage && (
                                    <div className="px-4 pt-3 pb-1 bg-gray-50 border-t border-gray-200 flex items-start gap-2">
                                       <div className="flex-1 bg-white rounded-lg p-2.5 border-l-4 border-[#FFE500]">
                                          <p className="text-[11px] font-bold text-[#b5880a]">
                                             {replyToMessage.arah_pesan === 'OUT' ? 'Anda' : getRealProfileName(replyToMessage.nomor_wa)}
                                          </p>
                                          <p className="text-xs text-gray-600 truncate">{replyToMessage.isi_pesan.substring(0, 100)}</p>
                                       </div>
                                       <button onClick={() => setReplyToMessage(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                       </button>
                                    </div>
                                 )}
                                 <form onSubmit={handleSendReply} className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 items-center">
                                    <div className="flex-1 relative">
                                       <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Ketik pesan..." className="w-full border-none bg-white text-gray-900 rounded-full px-5 py-2.5 text-sm outline-none shadow-inner focus:ring-2 focus:ring-[#FFE500]" />
                                    </div>
                                    <button type="submit" disabled={!replyText.trim()} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 transition shadow-md">
                                       <span className="text-xl">▶️</span>
                                    </button>
                                 </form>
                              </div>
                           </>
                        ) : (
                           <div className="flex-1 flex flex-col justify-center items-center text-gray-500 bg-gray-50 p-10 text-center">
                              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-4xl mb-4">💬</div>
                              <h3 className="text-xl font-bold text-gray-700">Pilih Percakapan</h3>
                              <p className="text-sm max-w-xs mt-2">Pilih salah satu konsumen di sebelah kiri untuk mulai membalas pesan secara real-time.</p>
                           </div>
                        )}
                     </div>
                  </div>
               )}



               {activeTab === 'konsumen' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <div className="flex gap-3 items-center">
                        <input type="text" placeholder="🔍 Cari Nama, No. WA, atau NIK..." value={searchKonsumen} onChange={e => setSearchKonsumen(e.target.value)} className="flex-1 p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                        <button onClick={() => openModal('create', 'konsumen')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2.5 rounded-md font-bold text-sm transition shadow-sm whitespace-nowrap">+ Tambah Konsumen</button>
                     </div>
                     <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                        <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-4 py-3 text-center font-bold w-12">No</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKonsumen, setSortConfigKonsumen, 'nama_lengkap')}>Nama {sortConfigKonsumen.column === 'nama_lengkap' && (<span>{sortConfigKonsumen.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKonsumen, setSortConfigKonsumen, 'id_konsumen')}>ID Konsumen {sortConfigKonsumen.column === 'id_konsumen' && (<span>{sortConfigKonsumen.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKonsumen, setSortConfigKonsumen, 'nomor_wa')}>No. WhatsApp {sortConfigKonsumen.column === 'nomor_wa' && (<span>{sortConfigKonsumen.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKonsumen, setSortConfigKonsumen, 'alamat_rumah')}>Alamat {sortConfigKonsumen.column === 'alamat_rumah' && (<span>{sortConfigKonsumen.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKonsumen, setSortConfigKonsumen, 'nik')}>NIK {sortConfigKonsumen.column === 'nik' && (<span>{sortConfigKonsumen.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Riwayat Barang</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedConsumers.map((k: KonsumenData) => {
                                    const userClaims = claims.filter((c: ClaimPromo) => c.nomor_wa === k.nomor_wa);
                                    return (
                                       <tr key={k.nomor_wa} className="hover:bg-gray-50 font-medium">
                                          <td className="px-4 py-3 text-center font-bold text-gray-600">{konsumenNumberMap.get(k.nomor_wa)}</td>
                                          <td className="px-4 py-3 text-slate-800 font-bold">{k.nama_lengkap || '-'}</td>
                                          <td className="px-4 py-3 font-mono">{k.id_konsumen || '-'}</td>
                                          <td className="px-4 py-3">{k.nomor_wa}</td>
                                          <td className="px-4 py-3 whitespace-normal">{[k.alamat_rumah, k.kelurahan, k.kecamatan, k.kabupaten_kotamadya, k.provinsi, k.kodepos].filter(Boolean).join(', ')}</td>
                                          <td className="px-4 py-3">{k.nik || '-'}</td>
                                          <td className="px-4 py-3 text-xs">
                                             <ul className="list-disc list-inside space-y-1">
                                                {userClaims.length > 0 ? userClaims.map(c => (
                                                   <li key={c.id_claim}>
                                                      {c.tipe_barang} (SN: {c.nomor_seri})
                                                   </li>
                                                )) : (
                                                   <li className="text-gray-500 italic">Tidak ada</li>
                                                )}
                                             </ul>
                                          </td>
                                          <td className="px-4 py-3">
                                             <div className="flex gap-3 items-center">
                                                <button onClick={() => openModal('edit', 'konsumen', k)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                                <button onClick={() => handleDelete('konsumen', k.nomor_wa)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                             </div>
                                          </td>
                                       </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  )}
               {/* ======================= PROMOS ======================= */}
               {activeTab === 'promos' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <input type="text" placeholder="🔍 Cari Nama Promo atau Periode Tanggal..." value={searchPromo} onChange={e => setSearchPromo(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
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
                                          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                             {p.tipe_produk.map((prod, idx) => (
                                                <div key={idx} className="text-xs p-2 bg-gray-50 border border-gray-100 rounded-md font-bold text-gray-700 flex items-center gap-2">
                                                   <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>{prod.nama_produk}
                                                </div>
                                             ))}
                                          </div>
                                       )}
                                    </div>
                                    {currentUser?.role === 'Admin' && (
                                       <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end">
                                          <button onClick={() => openModal('edit', 'promo', p)} className="text-black text-xs font-bold hover:underline">Edit Promo</button>
                                          <button onClick={() => handleDelete('promo', p.id_promo!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                       </div>
                                    )}
                                 </div>
                              );
                           })}
                        </div>
                     ) : (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'nama_promo')}>Nama Promo {sortConfigPromos.column === 'nama_promo' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'tanggal_mulai')}>Periode {sortConfigPromos.column === 'tanggal_mulai' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigPromos, setSortConfigPromos, 'status_aktif')}>Status {sortConfigPromos.column === 'status_aktif' && (<span>{sortConfigPromos.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Produk Berlaku</th>{currentUser?.role === 'Admin' && <th className="px-4 py-3 text-left font-bold">Aksi</th>}</tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedPromos.map((p: Promosi) => (
                                    <tr key={p.id_promo} className="hover:bg-gray-50 font-medium">
                                       <td className="px-4 py-3 font-bold">{p.nama_promo}</td>
                                       <td className="px-4 py-3">{p.tanggal_mulai} s/d {p.tanggal_selesai}</td>
                                       <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-extrabold tracking-wide ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span></td>
                                       <td className="px-4 py-3 text-xs whitespace-normal">{(p.tipe_produk || []).map(tp => tp.nama_produk).join(', ')}</td>
                                       {currentUser?.role === 'Admin' && (
                                          <td className="px-4 py-3"><div className="flex gap-3 items-center"><button onClick={() => openModal('edit', 'promo', p)} className="text-black text-xs font-bold hover:underline">Edit</button><button onClick={() => handleDelete('promo', p.id_promo!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button></div></td>
                                       )}
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
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <div className="flex flex-col md:flex-row gap-2">
                        <input type="text" placeholder="🔍 Cari Nama / No Seri / Nama Promo / Status MKT / Status FA..." value={searchClaim} onChange={e => setSearchClaim(e.target.value)} className="flex-1 p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                        <select value={filterStatusWarna} onChange={e => setFilterStatusWarna(e.target.value)} className="p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium md:w-48">
                           <option value="Semua">Semua Status Warna</option>
                           <option value="Putih">Belum Di Cek (Putih)</option>
                           <option value="Merah">Tidak Valid (Merah)</option>
                           <option value="Orange">Hold (Orange)</option>
                           <option value="Biru">Tunggu FA Cek (Biru)</option>
                           <option value="Pink">Tunggu Resi (Pink)</option>
                           <option value="Hijau">Selesai (Hijau)</option>
                        </select>
                     </div>
                     <div className="flex flex-wrap gap-2">
                        <div className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full bg-white border border-gray-300"></span>
                           Belum Di Cek: {claimStatusCounts.Putih}
                        </div>
                        <div className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full bg-red-500"></span>
                           Tidak Valid: {claimStatusCounts.Merah}
                        </div>
                        <div className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                           Hold: {claimStatusCounts.Orange}
                        </div>
                        <div className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                           Tunggu FA Cek: {claimStatusCounts.Biru}
                        </div>
                        <div className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full bg-pink-500"></span>
                           Tunggu Resi: {claimStatusCounts.Pink}
                        </div>
                        <div className="bg-white border border-gray-300 px-3 py-1.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full bg-green-500"></span>
                           Selesai: {claimStatusCounts.Hijau}
                        </div>
                     </div>
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-4 py-3 text-center font-bold">No</th><th className="px-4 py-3 text-center font-bold">Status Sistem</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'nama_konsumen')}>Nama {sortConfigClaims.column === 'nama_konsumen' && (<span>{sortConfigClaims.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'nomor_seri')}>No Seri {sortConfigClaims.column === 'nomor_seri' && (<span>{sortConfigClaims.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'tipe_barang')}>Barang {sortConfigClaims.column === 'tipe_barang' && (<span>{sortConfigClaims.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'jenis_promosi')}>Nama Promo {sortConfigClaims.column === 'jenis_promosi' && (<span>{sortConfigClaims.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'tanggal_pembelian')}>Tgl Beli {sortConfigClaims.column === 'tanggal_pembelian' && (<span>{sortConfigClaims.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'created_at')}>Tgl Submit {sortConfigClaims.column === 'created_at' && (<span>{sortConfigClaims.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-center font-bold">Durasi</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'nama_toko')}>Toko {sortConfigClaims.column === 'nama_toko' && (<span>{sortConfigClaims.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Nota/Garansi</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigClaims, setSortConfigClaims, 'validasi_by_mkt')}>MKT / FA {sortConfigClaims.column === 'validasi_by_mkt' && (<span>{sortConfigClaims.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Catatan MKT</th><th className="px-4 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedClaims.map((c: ClaimPromo) => {
                                    const isDuplicate = c.id_claim ? duplicateClaimIds.has(c.id_claim) : false;
                                    return (
                                    <tr key={c.id_claim} className={`hover:bg-gray-50 font-medium ${isDuplicate ? 'bg-red-50' : ''}`}>
                                       <td className="px-4 py-3 text-center font-bold text-gray-600">{claimNumberMap.get(c.id_claim!)}</td>
                                       <td className="px-4 py-3 text-center">
                                          <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold shadow-sm inline-block ${getBadgeStyle(getClaimStatusColor(c))}`}>
                                             {getBadgeLabel(getClaimStatusColor(c))}
                                          </span>
                                       </td>
                                       <td className="px-4 py-3 text-slate-800 font-bold">{consumers[c.nomor_wa] || c.nomor_wa}</td>
                                       <td className="px-4 py-3 font-mono">
                                          <div className="flex items-center gap-2">
                                             {c.nomor_seri}
                                             {isDuplicate && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap animate-pulse" title="Nomor seri ini sudah pernah diklaim sebelumnya">⚠️ DUPLIKAT</span>}
                                          </div>
                                       </td>
                                       <td className="px-4 py-3">{c.tipe_barang}</td>
                                       <td className="px-4 py-3 font-bold text-black">{c.jenis_promosi || getNamaPromo(c.tipe_barang)}</td>
                                       <td className="px-4 py-3">{c.tanggal_pembelian}</td>
                                       <td className="px-4 py-3">{formatSubmitDate(c.created_at)}</td>
                                       <td className="px-4 py-3">{getClaimDurationDays(c.created_at)}</td>
                                       <td className="px-4 py-3">{c.nama_toko || '-'}</td>
                                       <td className="px-4 py-3 text-black font-bold text-xs flex flex-col gap-1 whitespace-normal">
                                          {c.link_nota_pembelian ? (
                                             <button type="button" onClick={() => openImageViewer(c.link_nota_pembelian as string)} className="hover:underline hover:text-blue-800 text-left flex items-center gap-1">
                                                {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) ? '🔗📂' : '🔗'} Lihat Nota {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">(Google Drive)</span>}
                                             </button>
                                          ) : (
                                             <span className="text-gray-500 italic">Tidak ada Nota</span>
                                          )}
                                          {c.link_kartu_garansi ? (
                                             <button type="button" onClick={() => openImageViewer(c.link_kartu_garansi as string)} className="hover:underline hover:text-blue-800 text-left flex items-center gap-1">
                                                {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) ? '🔗📂' : '🔗'} Lihat Garansi {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">(Google Drive)</span>}
                                             </button>
                                          ) : (
                                             <span className="text-gray-500 italic">Tidak ada Garansi</span>
                                          )}
                                       </td>
                                       <td className="px-4 py-3 text-xs font-bold whitespace-normal max-w-[150px]">{c.validasi_by_mkt} / {c.validasi_by_fa}</td>
                                       <td className="px-4 py-3 text-xs text-gray-700 whitespace-normal max-w-[200px]">{c.catatan_mkt || '-'}</td>
                                       <td className="px-4 py-3">
                                          <div className="flex gap-3 items-center flex-wrap min-w-[200px]">
                                             <div className="flex items-center gap-2">
                                                <button onClick={() => handlePrintLabelPengiriman(c, claimNumberMap.get(c.id_claim!))} className="text-blue-600 text-xs font-bold hover:underline">Print Label</button>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                   <input
                                                      type="checkbox"
                                                      checked={c.id_claim ? printedClaimIds.has(c.id_claim) : false}
                                                      onChange={(e) => {
                                                         if (c.id_claim) {
                                                            const newSet = new Set(printedClaimIds);
                                                            if (e.target.checked) {
                                                               newSet.add(c.id_claim);
                                                            } else {
                                                               newSet.delete(c.id_claim);
                                                            }
                                                            setPrintedClaimIds(newSet);
                                                         }
                                                      }}
                                                      className="w-4 h-4 cursor-pointer"
                                                   />
                                                   <span className="text-xs text-gray-600">Sudah Print</span>
                                                </label>
                                             </div>
                                             <button onClick={() => {
                                                const consumerObj = consumersList.find(k => k.nomor_wa === c.nomor_wa);
                                                if (consumerObj) {
                                                   setReturnTab('claims');
                                                   setActiveTab('konsumen');
                                                   openModal('edit', 'konsumen', consumerObj);
                                                } else {
                                                   alert('Data konsumen tidak ditemukan di database.');
                                                }
                                             }} className="text-orange-600 text-xs font-bold hover:underline">Edit Alamat</button>
                                             <div className="w-px h-3 bg-slate-300"></div>
                                             <button onClick={() => handleKirimStatusClaim(c)} className="text-emerald-600 text-xs font-bold hover:underline">Kirim Status</button>
                                             <div className="w-px h-3 bg-slate-300"></div>
                                             <button onClick={() => openModal('edit', 'claim', c)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                             <button onClick={() => handleDelete('claim', c.id_claim!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
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
                           {sortedClaims.map((c: ClaimPromo) => {
                              const isDuplicate = c.id_claim ? duplicateClaimIds.has(c.id_claim) : false;
                              return (
                              <div key={c.id_claim} className={`bg-white p-4 rounded-lg shadow-sm border flex flex-col hover:border-[#FFE500] transition ${isDuplicate ? 'border-red-500 bg-red-50' : 'border-gray-100'}`}>
                                 <div className="border-b border-gray-100 pb-3 mb-3">
                                    <div className="flex justify-between items-start gap-2">
                                       <div className="flex items-center gap-2">
                                          <span className="font-bold text-lg text-gray-600 bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center text-center">{claimNumberMap.get(c.id_claim!)}</span>
                                          <div>
                                             <h3 className="font-bold text-base text-slate-800">{consumers[c.nomor_wa] || c.nomor_wa}</h3>
                                             <p className="text-xs text-gray-500 font-mono flex items-center gap-2">
                                                {c.nomor_seri}
                                                {isDuplicate && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap animate-pulse">⚠️ DUPLIKAT</span>}
                                             </p>
                                          </div>
                                       </div>
                                       <span className={`px-2 py-1 rounded-md text-[10px] font-extrabold shadow-sm ${getBadgeStyle(getClaimStatusColor(c))}`}>
                                          {getBadgeLabel(getClaimStatusColor(c))}
                                       </span>
                                    </div>
                                 </div>
                                 <div className="space-y-2 text-xs flex-1">
                                    <p><span className="font-bold w-20 inline-block">Barang:</span> {c.tipe_barang}</p>
                                    <p><span className="font-bold w-20 inline-block">Promo:</span> {c.jenis_promosi || getNamaPromo(c.tipe_barang)}</p>
                                    <p><span className="font-bold w-20 inline-block">Tgl Beli:</span> {c.tanggal_pembelian}</p>
                                    <p><span className="font-bold w-20 inline-block">Tgl Submit:</span> {formatSubmitDate(c.created_at)}</p>
                                    <p><span className="font-bold w-20 inline-block">Durasi:</span> {getClaimDurationDays(c.created_at)}</p>
                                    <p><span className="font-bold w-20 inline-block">Toko:</span> {c.nama_toko || '-'}</p>
                                    <p><span className="font-bold w-20 inline-block">MKT/FA:</span> {c.validasi_by_mkt} / {c.validasi_by_fa}</p>
                                    {c.catatan_mkt && <p className="bg-blue-50 border border-blue-100 rounded p-2"><span className="font-bold">Catatan MKT:</span> {c.catatan_mkt}</p>}
                                    <div className="flex flex-col gap-1 pt-1">
                                       {c.link_nota_pembelian && <button type="button" onClick={() => openImageViewer(c.link_nota_pembelian as string)} className="hover:underline hover:text-blue-800 text-left font-bold flex items-center gap-1">
                                          {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) ? '🔗📂' : '🔗'} Lihat Nota {typeof c.link_nota_pembelian === 'string' && isGoogleDriveLink(c.link_nota_pembelian) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded whitespace-nowrap">(Drive)</span>}
                                       </button>}
                                       {c.link_kartu_garansi && <button type="button" onClick={() => openImageViewer(c.link_kartu_garansi as string)} className="hover:underline hover:text-blue-800 text-left font-bold flex items-center gap-1">
                                          {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) ? '🔗📂' : '🔗'} Lihat Garansi {typeof c.link_kartu_garansi === 'string' && isGoogleDriveLink(c.link_kartu_garansi) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded whitespace-nowrap">(Drive)</span>}
                                       </button>}
                                    </div>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end flex-wrap">
                                    <div className="flex items-center gap-2">
                                       <button onClick={() => handlePrintLabelPengiriman(c, claimNumberMap.get(c.id_claim!))} className="text-blue-600 text-xs font-bold hover:underline">Print Label</button>
                                       <label className="flex items-center gap-1.5 cursor-pointer">
                                          <input
                                             type="checkbox"
                                             checked={c.id_claim ? printedClaimIds.has(c.id_claim) : false}
                                             onChange={(e) => {
                                                if (c.id_claim) {
                                                   const newSet = new Set(printedClaimIds);
                                                   if (e.target.checked) {
                                                      newSet.add(c.id_claim);
                                                   } else {
                                                      newSet.delete(c.id_claim);
                                                   }
                                                   setPrintedClaimIds(newSet);
                                                }
                                             }}
                                             className="w-4 h-4 cursor-pointer"
                                          />
                                          <span className="text-xs text-gray-600">Sudah Print</span>
                                       </label>
                                    </div>
                                    <button onClick={() => {
                                       const consumerObj = consumersList.find(k => k.nomor_wa === c.nomor_wa);
                                       if (consumerObj) {
                                          setReturnTab('claims');
                                          setActiveTab('konsumen');
                                          openModal('edit', 'konsumen', consumerObj);
                                       } else {
                                          alert('Data konsumen tidak ditemukan di database.');
                                       }
                                    }} className="text-orange-600 text-xs font-bold hover:underline">Edit Alamat</button>
                                    <button onClick={() => handleKirimStatusClaim(c)} className="text-emerald-600 text-xs font-bold hover:underline">Kirim Status</button>
                                    <button onClick={() => openModal('edit', 'claim', c)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                    <button onClick={() => handleDelete('claim', c.id_claim!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                 </div>
                              </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= WARRANTIES ======================= */}
               {activeTab === 'warranties' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <input type="text" placeholder="🔍 Cari Nomor Seri..." value={searchGaransi} onChange={e => setSearchGaransi(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-4 py-3 text-center font-bold w-12">No</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'nomor_seri')}>No Seri {sortConfigWarranties.column === 'nomor_seri' && (<span>{sortConfigWarranties.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'tipe_barang')}>Barang {sortConfigWarranties.column === 'tipe_barang' && (<span>{sortConfigWarranties.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Nota/Garansi</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'status_validasi')}>Status {sortConfigWarranties.column === 'status_validasi' && (<span>{sortConfigWarranties.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'jenis_garansi')}>Jenis {sortConfigWarranties.column === 'jenis_garansi' && (<span>{sortConfigWarranties.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigWarranties, setSortConfigWarranties, 'lama_garansi')}>Sisa Garansi {sortConfigWarranties.column === 'lama_garansi' && (<span>{sortConfigWarranties.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedWarranties.map((w: Garansi) => {
                                    const linked = claims.find((c: ClaimPromo) => c.nomor_seri === w.nomor_seri);
                                    const linkNota = w.link_nota_pembelian || linked?.link_nota_pembelian;
                                    const linkGaransi = w.link_kartu_garansi || linked?.link_kartu_garansi;
                                    return (
                                       <tr key={w.id_garansi} className="hover:bg-gray-50 font-medium">
                                          <td className="px-4 py-3 text-center font-bold text-gray-600">{garansiNumberMap.get(w.id_garansi!)}</td>
                                          <td className="px-4 py-3 font-mono font-bold">{w.nomor_seri}</td>
                                          <td className="px-4 py-3">{w.tipe_barang}</td>
                                          <td className="px-4 py-3 text-black font-bold text-xs flex flex-col gap-1 whitespace-normal">
                                             {linkNota ? (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                   <button type="button" onClick={() => openImageViewer(linkNota as string)} className="hover:underline hover:text-blue-800 text-left flex items-center gap-1">
                                                      {typeof linkNota === 'string' && isGoogleDriveLink(linkNota) ? '🔗📂' : '🔗'} Lihat Nota {typeof linkNota === 'string' && isGoogleDriveLink(linkNota) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">(Drive)</span>}
                                                   </button>
                                                   {!w.link_nota_pembelian && linked?.link_nota_pembelian && (
                                                      <span className="bg-blue-100 text-blue-700 px-1 rounded-[2px] text-[9px] font-black uppercase">Claim</span>
                                                   )}
                                                </div>
                                             ) : (
                                                <span className="text-gray-500 italic">Tidak ada Nota</span>
                                             )}
                                             {linkGaransi ? (
                                                <div className="flex items-center gap-1 flex-wrap">
                                                   <button type="button" onClick={() => openImageViewer(linkGaransi as string)} className="hover:underline hover:text-blue-800 text-left flex items-center gap-1">
                                                      {typeof linkGaransi === 'string' && isGoogleDriveLink(linkGaransi) ? '🔗📂' : '🔗'} Lihat Garansi {typeof linkGaransi === 'string' && isGoogleDriveLink(linkGaransi) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">(Drive)</span>}
                                                   </button>
                                                   {!w.link_kartu_garansi && linked?.link_kartu_garansi && (
                                                      <span className="bg-blue-100 text-blue-700 px-1 rounded-[2px] text-[9px] font-black uppercase">Claim</span>
                                                   )}
                                                </div>
                                             ) : (
                                                <span className="text-gray-500 italic">Tidak ada Garansi</span>
                                             )}
                                          </td>
                                          <td className="px-4 py-3">
                                             <span className={`px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${w.status_validasi === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{w.status_validasi}</span>
                                          </td>
                                          <td className="px-4 py-3">{w.jenis_garansi}</td>
                                          <td className="px-4 py-3 font-bold text-gray-700">{calculateSisaGaransi(linked?.tanggal_pembelian, w.lama_garansi)}</td>
                                          <td className="px-4 py-3">
                                             <div className="flex gap-3 items-center">
                                                <button onClick={() => handleKirimStatusGaransi(w)} className="text-emerald-600 text-xs font-bold hover:underline" title="Kirim WA Status">Kirim Status</button>
                                                <div className="w-px h-3 bg-slate-300"></div>
                                                <button onClick={() => openModal('edit', 'warranty', w)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                                <button onClick={() => handleDelete('warranty', w.id_garansi!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                             </div>
                                          </td>
                                       </tr>
                                    )
                                 })}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                           {sortedWarranties.map((w: Garansi) => {
                              const linked = claims.find((c: ClaimPromo) => c.nomor_seri === w.nomor_seri);
                              const linkNota = w.link_nota_pembelian || linked?.link_nota_pembelian;
                              const linkGaransi = w.link_kartu_garansi || linked?.link_kartu_garansi;
                              return (
                                 <div key={w.id_garansi} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
                                    <div className="border-b border-gray-100 pb-3 mb-3">
                                       <div className="flex items-center gap-2">
                                          <span className="font-bold text-lg text-gray-600 bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center text-center">{garansiNumberMap.get(w.id_garansi!)}</span>
                                          <div>
                                             <h3 className="font-bold text-base text-slate-800 font-mono">{w.nomor_seri}</h3>
                                             <p className="text-xs text-gray-500">{w.tipe_barang}</p>
                                          </div>
                                       </div>
                                    </div>
                                    <div className="space-y-2 text-xs flex-1">
                                       <p><span className="font-bold w-24 inline-block">Status:</span> <span className={`px-2 py-0.5 rounded text-[10px] tracking-wide font-extrabold ${w.status_validasi === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{w.status_validasi}</span></p>
                                       <p><span className="font-bold w-24 inline-block">Jenis:</span> {w.jenis_garansi}</p>
                                       <p><span className="font-bold w-24 inline-block">Sisa:</span> {calculateSisaGaransi(linked?.tanggal_pembelian, w.lama_garansi)}</p>
                                       <div className="flex flex-col gap-1 pt-1">
                                          {linkNota && <button type="button" onClick={() => openImageViewer(linkNota as string)} className="hover:underline hover:text-blue-800 text-left font-bold flex items-center gap-1">
                                             {typeof linkNota === 'string' && isGoogleDriveLink(linkNota) ? '🔗📂' : '🔗'} Lihat Nota {typeof linkNota === 'string' && isGoogleDriveLink(linkNota) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded whitespace-nowrap">(Drive)</span>}
                                          </button>}
                                          {linkGaransi && <button type="button" onClick={() => openImageViewer(linkGaransi as string)} className="hover:underline hover:text-blue-800 text-left font-bold flex items-center gap-1">
                                             {typeof linkGaransi === 'string' && isGoogleDriveLink(linkGaransi) ? '🔗📂' : '🔗'} Lihat Garansi {typeof linkGaransi === 'string' && isGoogleDriveLink(linkGaransi) && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded whitespace-nowrap">(Drive)</span>}
                                          </button>}
                                       </div>
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end">
                                       <button onClick={() => handleKirimStatusGaransi(w)} className="text-emerald-600 text-xs font-bold hover:underline" title="Kirim WA Status">Kirim</button>
                                       <button onClick={() => openModal('edit', 'warranty', w)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                       <button onClick={() => handleDelete('warranty', w.id_garansi!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
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
                     <input type="text" placeholder="🔍 Cari No Tanda Terima / No Seri / Status..." value={searchService} onChange={e => setSearchService(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'nomor_tanda_terima')}>No Tanda Terima {sortConfigServices.column === 'nomor_tanda_terima' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'nomor_seri')}>No Seri Barang {sortConfigServices.column === 'nomor_seri' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'status_service')}>Status Service {sortConfigServices.column === 'status_service' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigServices, setSortConfigServices, 'created_at')}>Tgl Update {sortConfigServices.column === 'created_at' && (<span>{sortConfigServices.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedServices.map((s: StatusService) => (
                                    <tr key={s.id_service} className="hover:bg-gray-50 font-medium">
                                       <td className="px-6 py-3 font-mono font-bold text-slate-800">{s.nomor_tanda_terima}</td>
                                       <td className="px-6 py-3">{s.nomor_seri}</td>
                                       <td className="px-6 py-3">
                                          <span className="px-2 py-1 rounded text-[10px] tracking-wide font-extrabold bg-blue-100 text-blue-800 uppercase">{s.status_service}</span>
                                       </td>
                                       <td className="px-6 py-3 font-bold text-gray-500">{s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}</td>
                                       <td className="px-6 py-3 flex gap-3">
                                          <button onClick={() => openModal('edit', 'service', s)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                          <button onClick={() => handleDelete('service', s.id_service!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
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
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end">
                                    <button onClick={() => openModal('edit', 'service', s)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                    <button onClick={() => handleDelete('service', s.id_service!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
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
                     <input type="text" placeholder="🔍 Cari Title Proposal..." value={searchBudget} onChange={e => setSearchBudget(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'proposal_no')}>Proposal No {sortConfigBudgets.column === 'proposal_no' && (<span>{sortConfigBudgets.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'title')}>Title {sortConfigBudgets.column === 'title' && (<span>{sortConfigBudgets.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'period')}>Period {sortConfigBudgets.column === 'period' && (<span>{sortConfigBudgets.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'total_cost')}>Total Cost {sortConfigBudgets.column === 'total_cost' && (<span>{sortConfigBudgets.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedBudgets.map((b: BudgetApproval) => (
                                    <tr key={b.id_budget} className="hover:bg-gray-50 font-medium">
                                       <td className="px-6 py-3 font-mono font-bold text-slate-800">{b.proposal_no}</td>
                                       <td className="px-6 py-3">{b.title}</td>
                                       <td className="px-6 py-3">{b.period}</td>
                                       <td className="px-6 py-3 font-bold text-gray-700">Rp {Number(b.total_cost).toLocaleString('id-ID')}</td>
                                       <td className="px-6 py-3 flex gap-3">
                                          <button onClick={() => setPrintData(b)} className="text-emerald-600 text-xs font-bold hover:underline">Print PDF</button>
                                          <button onClick={() => openModal('edit', 'budget', b)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                          <button onClick={() => handleDelete('budget', b.id_budget!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {sortedBudgets.map((b: BudgetApproval) => (
                              <div key={b.id_budget} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
                                 <div className="border-b border-gray-100 pb-3 mb-3">
                                    <h3 className="font-bold text-base text-slate-800">{b.title}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{b.proposal_no}</p>
                                 </div>
                                 <div className="space-y-2 text-xs flex-1">
                                    <p><span className="font-bold w-20 inline-block">Periode:</span> {b.period}</p>
                                    <p><span className="font-bold w-20 inline-block">Total Biaya:</span> Rp {Number(b.total_cost).toLocaleString('id-ID')}</p>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end">
                                    <button onClick={() => setPrintData(b)} className="text-emerald-600 text-xs font-bold hover:underline">Print PDF</button>
                                    <button onClick={() => openModal('edit', 'budget', b)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                    <button onClick={() => handleDelete('budget', b.id_budget!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= LENDING FILTER HEADER ======================= */}
               {activeTab === 'lending' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <div className="flex-1 flex flex-wrap gap-4 items-center">
                        <input type="text" placeholder="🔍 Cari Nama Peminjam / No WA / Nama Barang / No Seri..." value={searchLending} onChange={e => setSearchLending(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                        <div className="flex items-center gap-2">
                           <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'table' ? 'bg-[#FFE500] text-black shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📋Baris</button>
                           <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'card' ? 'bg-[#FFE500] text-black shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🪪Kartu</button>
                        </div>
                     </div>
                     <button onClick={() => openModal('create', 'lending')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Pinjam Barang</button>
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'nama_peminjam')}>Peminjam {sortConfigLending.column === 'nama_peminjam' && (<span>{sortConfigLending.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">KTP</th>{/* Not sortable as it's a button */}<th className="px-4 py-3 text-left font-bold">Barang Dipinjam</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'tanggal_peminjaman')}>Tgl Pinjam {sortConfigLending.column === 'tanggal_peminjaman' && (<span>{sortConfigLending.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'tanggal_pengembalian')}>Tgl Kembali {sortConfigLending.column === 'tanggal_pengembalian' && (<span>{sortConfigLending.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'status_peminjaman')}>Status {sortConfigLending.column === 'status_peminjaman' && (<span>{sortConfigLending.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedLendingRecords.map((l: PeminjamanBarang) => (
                                    <tr key={l.id_peminjaman} className="hover:bg-gray-50 font-medium">
                                       <td className="px-4 py-3 text-slate-800 font-bold">
                                          {l.nama_peminjam} <br />
                                          <span className="text-xs text-gray-500">{l.nomor_wa_peminjam}</span>
                                       </td>
                                       <td className="px-4 py-3">
                                          {l.link_ktp_peminjam ? (
                                             <button type="button" onClick={() => openImageViewer(l.link_ktp_peminjam as string)} className="hover:underline hover:text-blue-800 text-left text-xs font-bold">🔗 Lihat KTP</button>
                                          ) : (
                                             <span className="text-gray-500 italic text-xs">Tidak ada</span>
                                          )}
                                       </td>
                                       <td className="px-4 py-3 text-xs">
                                          <ul className="list-disc list-inside space-y-1">
                                             {l.items_dipinjam.map((item, idx) => (
                                                <li key={idx} className={`${item.status_pengembalian === 'dikembalikan' ? 'text-green-600 line-through' : 'text-slate-800'}`}>
                                                   {item.nama_barang} (SN: {item.nomor_seri})
                                                   {item.catatan && <span className="text-gray-500 italic"> - {item.catatan}</span>}
                                                   {item.status_pengembalian === 'dikembalikan' && <span className="ml-1 text-green-700 font-bold">(Dikembalikan)</span>}
                                                </li>
                                             ))}
                                          </ul>
                                       </td>
                                       <td className="px-4 py-3 font-bold text-gray-700">{l.tanggal_peminjaman ? new Date(l.tanggal_peminjaman).toLocaleDateString('id-ID') : '-'}</td>
                                       <td className="px-4 py-3 font-bold text-gray-700">{l.tanggal_pengembalian ? new Date(l.tanggal_pengembalian).toLocaleDateString('id-ID') : '-'}</td>
                                       <td className="px-4 py-3">
                                          <span className={`px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${l.status_peminjaman === 'aktif' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>{l.status_peminjaman.toUpperCase()}</span>
                                       </td>
                                       <td className="px-4 py-3">
                                          <div className="flex gap-3 items-center">
                                             {l.status_peminjaman === 'aktif' && (
                                                <button onClick={() => openModal('return', 'lending', l)} className="text-blue-600 text-xs font-bold hover:underline">Pengembalian</button>
                                             )}
                                             <button onClick={() => openModal('edit', 'lending', l)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                             <button onClick={() => handleDelete('lending', l.id_peminjaman!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                          </div>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {sortedLendingRecords.map((l: PeminjamanBarang) => (
                              <div key={l.id_peminjaman} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
                                 <div className="border-b border-gray-100 pb-3 mb-3">
                                    <h3 className="font-bold text-base text-slate-800">{l.nama_peminjam}</h3>
                                    <p className="text-xs text-gray-500">{l.nomor_wa_peminjam}</p>
                                    <span className={`mt-2 inline-block px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${l.status_peminjaman === 'aktif' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'}`}>{l.status_peminjaman.toUpperCase()}</span>
                                 </div>
                                 <div className="space-y-2 text-xs flex-1">
                                    <p><span className="font-bold w-24 inline-block">Tgl Pinjam:</span> {l.tanggal_peminjaman ? new Date(l.tanggal_peminjaman).toLocaleDateString('id-ID') : '-'}</p>
                                    <p><span className="font-bold w-24 inline-block">Tgl Kembali:</span> {l.tanggal_pengembalian ? new Date(l.tanggal_pengembalian).toLocaleDateString('id-ID') : '-'}</p>
                                    <div className="font-bold mt-2">Barang:</div>
                                    <ul className="list-disc list-inside pl-2 space-y-1">
                                       {l.items_dipinjam.map((item, idx) => (
                                          <li key={idx} className={`${item.status_pengembalian === 'dikembalikan' ? 'text-green-600 line-through' : 'text-slate-800'}`}>{item.nama_barang} (SN: {item.nomor_seri})</li>
                                       ))}
                                    </ul>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end">
                                    {l.status_peminjaman === 'aktif' && <button onClick={() => openModal('return', 'lending', l)} className="text-blue-600 text-xs font-bold hover:underline">Pengembalian</button>}
                                    <button onClick={() => openModal('edit', 'lending', l)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                    <button onClick={() => handleDelete('lending', l.id_peminjaman!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               
               {/* ======================= EVENT REGISTRATIONS ======================= */}
               {activeTab === 'eventregistrations' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     {/* Quick links bar */}
                     <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-700 mr-2">🛠️ Halaman Admin:</span>
                        <a href="/admin/events" target="_blank" rel="noopener noreferrer" className="text-xs bg-white hover:bg-blue-100 text-gray-800 border border-blue-300 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5">
                           ✅ Validasi Pembayaran
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a href="/admin/events/attendance" target="_blank" rel="noopener noreferrer" className="text-xs bg-white hover:bg-blue-100 text-gray-800 border border-blue-300 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5">
                           📷 Absensi Scan QR
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a href="/admin/events/deposit" target="_blank" rel="noopener noreferrer" className="text-xs bg-white hover:bg-blue-100 text-gray-800 border border-blue-300 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5">
                           💸 Kelola Deposit
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <span className="text-gray-300 mx-1">|</span>
                        <span className="text-[10px] text-gray-500">Public:</span>
                        <a href="/events/register" target="_blank" rel="noopener noreferrer" className="text-xs bg-white hover:bg-yellow-100 text-gray-800 border border-yellow-300 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5">
                           🎫 Daftar Event
                        </a>
                        <a href="/events/refund" target="_blank" rel="noopener noreferrer" className="text-xs bg-white hover:bg-yellow-100 text-gray-800 border border-yellow-300 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5">
                           💰 Refund Deposit
                        </a>
                     </div>
                     <input type="text" placeholder="🔍 Cari Nama Peserta atau Event..." value={searchRegistration} onChange={e => setSearchRegistration(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-6 py-3 text-left font-bold">Nama Lengkap</th><th className="px-6 py-3 text-left font-bold">Nomor WA</th><th className="px-6 py-3 text-left font-bold">Kab/Kota</th><th className="px-6 py-3 text-left font-bold">Tipe Kamera</th><th className="px-6 py-3 text-left font-bold">Event</th><th className="px-6 py-3 text-left font-bold">Status</th><th className="px-6 py-3 text-left font-bold">Kehadiran</th><th className="px-6 py-3 text-left font-bold">Bukti TF</th><th className="px-6 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {eventRegistrations.filter(r => (r.nama_lengkap || '').toLowerCase().includes(searchRegistration.toLowerCase()) || r.event_name.toLowerCase().includes(searchRegistration.toLowerCase())).map((reg: EventRegistration) => (
                                    <tr key={reg.id} className="hover:bg-gray-50 font-medium">
                                       <td className="px-6 py-3 font-bold text-slate-800">{reg.nama_lengkap}</td>
                                       <td className="px-6 py-3">{reg.nomor_wa}</td>
                                       <td className="px-6 py-3 text-xs text-gray-600">{reg.kabupaten_kotamadya || '-'}</td>
                                       <td className="px-6 py-3 text-xs text-gray-600">{reg.tipe_kamera || '-'}</td>
                                       <td className="px-6 py-3 text-amber-600 font-bold">{reg.event_name}</td>
                                       <td className="px-6 py-3">
                                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${reg.status_pendaftaran === 'terdaftar' ? 'bg-green-100 text-green-700' : reg.status_pendaftaran === 'ditolak' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{reg.status_pendaftaran === 'terdaftar' ? 'Terdaftar' : reg.status_pendaftaran === 'ditolak' ? 'Ditolak' : 'Menunggu Validasi'}</span>
                                       </td>
                                       <td className="px-6 py-3">
                                          {reg.is_attended ? <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-1 rounded">HADIR ✅</span> : <button onClick={() => handleMarkAttendance(reg.id!)} className="text-[10px] bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold px-2 py-1 rounded border border-gray-300">Set Hadir</button>}
                                       </td>
                                       <td className="px-6 py-3">
                                          {reg.bukti_transfer_url ? <a href={reg.bukti_transfer_url} target="_blank" className="text-blue-500 hover:underline font-bold">Lihat Bukti</a> : <span className="text-gray-400">Belum Ada</span>}
                                       </td>
                                       <td className="px-6 py-3 flex gap-3">
                                          {reg.status_pendaftaran === 'terdaftar' && (
                                             <button
                                                onClick={() => handleSendEventSuccessWA(reg)}
                                                className="text-green-600 text-xs font-bold hover:underline"
                                                title="Kirim Konfirmasi WA"
                                             >
                                                Kirim WA
                                             </button>
                                          )}
                                          <button onClick={() => openModal('edit', 'eventregistration', reg)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                          <button onClick={() => handleDelete('eventregistration', reg.id!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     ) : (<div></div>)}
                  </div>
               )}

               {/* ======================= MASTER EVENT ======================= */}
               {activeTab === 'events' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     {/* Quick links bar */}
                     <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-3 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-gray-700 mr-2">🔗 Link Public:</span>
                        <a href="/events/register" target="_blank" rel="noopener noreferrer" className="text-xs bg-white hover:bg-yellow-100 text-gray-800 border border-yellow-300 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5">
                           🎫 Katalog & Daftar Event
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <a href="/events/refund" target="_blank" rel="noopener noreferrer" className="text-xs bg-white hover:bg-yellow-100 text-gray-800 border border-yellow-300 px-3 py-1.5 rounded-md font-bold transition flex items-center gap-1.5">
                           💰 Klaim Pengembalian Deposit
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/events/register`); alert('Link katalog event disalin!'); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md font-bold transition">📋 Copy URL Katalog</button>
                        <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/events/refund`); alert('Link refund disalin!'); }} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-md font-bold transition">📋 Copy URL Refund</button>
                     </div>
                     <input type="text" placeholder="🔍 Cari Judul Event..." value={searchEvent} onChange={e => setSearchEvent(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr>
                                    <th className="px-3 py-3 text-center font-bold w-12">No</th>
                                    <th className="px-3 py-3 text-left font-bold">Poster</th>
                                    <th className="px-3 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigEvents, setSortConfigEvents, 'event_title')}>Judul {sortConfigEvents.column === 'event_title' && (<span>{sortConfigEvents.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                                    <th className="px-3 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigEvents, setSortConfigEvents, 'event_date')}>Tanggal {sortConfigEvents.column === 'event_date' && (<span>{sortConfigEvents.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                                    <th className="px-3 py-3 text-left font-bold">Speaker</th>
                                    <th className="px-3 py-3 text-left font-bold">Harga / Bayar</th>
                                    <th className="px-3 py-3 text-left font-bold">Bank Info</th>
                                    <th className="px-3 py-3 text-left font-bold">QR Bayar</th>
                                    <th className="px-3 py-3 text-left font-bold">Kuota</th>
                                    <th className="px-3 py-3 text-left font-bold">Status</th>
                                    <th className="px-3 py-3 text-left font-bold">Proposal</th>
                                    <th className="px-3 py-3 text-left font-bold">Aksi</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedEvents.map((evt: EventData) => {
                                    const proposal = budgets.find(b => b.id_budget === evt.proposal_event_id);
                                    return (
                                    <tr key={evt.id} className="hover:bg-gray-50 font-medium">
                                       <td className="px-3 py-3 text-center font-bold text-gray-600">{eventNumberMap.get(evt.id!)}</td>
                                       <td className="px-3 py-3">{evt.event_image ? <img src={gdriveUrl(evt.event_image)} alt="poster" className="w-10 h-14 object-cover rounded" referrerPolicy="no-referrer" /> : <div className="w-10 h-14 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">–</div>}</td>
                                       <td className="px-3 py-3 font-bold text-slate-800 max-w-[180px] whitespace-normal">{evt.event_title}</td>
                                       <td className="px-3 py-3 text-xs">{evt.event_date}</td>
                                       <td className="px-3 py-3 text-xs text-gray-600 max-w-[140px] whitespace-normal">{evt.event_speaker || '-'}{evt.event_speaker_genre && <span className="block text-[10px] text-gray-400">{evt.event_speaker_genre}</span>}</td>
                                       <td className="px-3 py-3 text-xs">
                                          <span className="font-bold">{evt.event_price}</span>
                                          <span className={`block text-[10px] uppercase font-bold mt-0.5 px-1.5 py-0.5 rounded inline-block ${evt.event_payment_tipe === 'deposit' ? 'bg-orange-100 text-orange-700' : evt.event_payment_tipe === 'gratis' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{evt.event_payment_tipe || 'regular'}</span>
                                          {evt.event_payment_tipe === 'deposit' && evt.deposit_amount && <span className="block text-[10px] text-orange-600 mt-0.5">DP: {evt.deposit_amount}</span>}
                                       </td>
                                       <td className="px-3 py-3 text-[11px] text-gray-600 max-w-[140px] whitespace-pre-wrap">{evt.bank_info || '-'}</td>
                                       <td className="px-3 py-3">{evt.event_upload_payment_screenshot ? <a href={gdriveUrl(evt.event_upload_payment_screenshot)} target="_blank" rel="noopener noreferrer"><img src={gdriveUrl(evt.event_upload_payment_screenshot)} alt="qr" className="w-10 h-10 object-cover rounded border border-gray-200 hover:border-[#FFE500]" referrerPolicy="no-referrer" /></a> : <span className="text-gray-300 text-xs">–</span>}</td>
                                       <td className="px-3 py-3 text-xs">
                                          <span className="font-bold text-gray-700">{eventRegistrationsCount[evt.event_title] || 0}/{evt.event_partisipant_stock}</span>
                                          <span className="block text-[10px] text-blue-600 font-bold mt-0.5">{eventRegistrationsCount[evt.event_title] || 0} peserta</span>
                                       </td>
                                       <td className="px-3 py-3">{(() => { const { closed, reason } = getEventClosedStatus(evt, eventRegistrationsCount[evt.event_title] || 0); return <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${closed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{reason}</span>; })()}</td>
                                       <td className="px-3 py-3 text-[11px] text-gray-600 max-w-[120px] whitespace-normal">{proposal ? <span className="text-purple-700 font-mono">{proposal.proposal_no}</span> : <span className="text-gray-300">–</span>}</td>
                                       <td className="px-3 py-3 flex gap-2">
                                          <button onClick={() => openModal('edit', 'event', evt)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                          <button onClick={() => handleDelete('events', evt.id!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
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
                              const descPreview = evt.event_description ? (evt.event_description.length > 80 ? evt.event_description.substring(0, 80) + '...' : evt.event_description) : '-';
                              const { closed, reason } = getEventClosedStatus(evt, eventRegistrationsCount[evt.event_title] || 0);
                              const proposal = budgets.find(b => b.id_budget === evt.proposal_event_id);
                              return (
                              <div key={evt.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
                                 <div className="border-b border-gray-100 pb-3 mb-3 flex gap-3">
                                    {evt.event_image ? <img src={gdriveUrl(evt.event_image)} alt="poster" className="w-16 h-20 object-cover rounded flex-shrink-0" referrerPolicy="no-referrer" /> : <div className="w-16 h-20 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">No img</div>}
                                    <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2 mb-1">
                                          <span className="font-bold text-xs text-gray-500 bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center">{eventNumberMap.get(evt.id!)}</span>
                                          <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${closed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{reason}</span>
                                       </div>
                                       <h3 className="font-bold text-sm text-slate-800 leading-tight">{evt.event_title}</h3>
                                       <p className="text-xs text-gray-500 mt-0.5">{evt.event_date}</p>
                                       {evt.event_speaker && <p className="text-[11px] text-gray-400 mt-0.5">🎤 {evt.event_speaker}{evt.event_speaker_genre ? ` — ${evt.event_speaker_genre}` : ''}</p>}
                                    </div>
                                 </div>
                                 <div className="space-y-1.5 text-xs flex-1">
                                    <p className="text-gray-600 leading-snug">{descPreview}</p>
                                    <div className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                                       <span className="font-bold">{evt.event_price}</span>
                                       <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${evt.event_payment_tipe === 'deposit' ? 'bg-orange-100 text-orange-700' : evt.event_payment_tipe === 'gratis' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{evt.event_payment_tipe || 'regular'}</span>
                                    </div>
                                    {evt.event_payment_tipe === 'deposit' && evt.deposit_amount && <p className="text-orange-600 text-[11px]">Deposit: {evt.deposit_amount}</p>}
                                    <p><span className="font-bold">Kuota:</span> {eventRegistrationsCount[evt.event_title] || 0}/{evt.event_partisipant_stock} slot · {eventRegistrationsCount[evt.event_title] || 0} peserta</p>
                                    {evt.bank_info && <p className="bg-blue-50 border border-blue-100 rounded p-1.5 text-[11px] whitespace-pre-wrap"><span className="font-bold">Rekening:</span> {evt.bank_info}</p>}
                                    {evt.event_upload_payment_screenshot && <a href={gdriveUrl(evt.event_upload_payment_screenshot)} target="_blank" rel="noopener noreferrer" className="inline-block"><img src={gdriveUrl(evt.event_upload_payment_screenshot)} alt="qr" className="w-16 h-16 rounded border border-gray-200 hover:border-[#FFE500]" referrerPolicy="no-referrer" /></a>}
                                    {proposal && <p className="text-purple-700 text-[11px] font-mono">📄 {proposal.proposal_no}</p>}
                                 </div>
                                 <div className="mt-3 pt-2 border-t border-gray-100 flex gap-2 justify-end">
                                    <button onClick={() => openModal('edit', 'event', evt)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                    <button onClick={() => handleDelete('events', evt.id!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                 </div>
                              </div>
                              );
                           })}
                        </div>
                     )}
                  </div>
               )}

               {/* ======================= BOT SETTINGS ======================= */}
               {activeTab === 'botsettings' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <p className="text-sm text-gray-600">Kelola pengaturan dan tautan yang digunakan oleh Chatbot.</p>
                     <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                        <table className="w-full text-sm whitespace-normal break-words">
                           <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                              <tr>
                                 <th className="px-4 py-3 text-left font-bold">Nama Pengaturan</th>
                                 <th className="px-4 py-3 text-left font-bold">URL / Value</th>
                                 <th className="px-4 py-3 text-left font-bold">Deskripsi</th>
                                 <th className="px-4 py-3 text-left font-bold">Aksi</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {botSettings.map((setting: PengaturanBot) => (
                                 <tr key={setting.id} className="hover:bg-gray-50 font-medium">
                                    <td className="px-4 py-3 font-bold text-slate-800">{setting.nama_pengaturan}</td>
                                    <td className="px-4 py-3">
                                       {setting.url_file ? (
                                          <a href={setting.url_file} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{setting.url_file}</a>
                                       ) : (
                                          <span className="text-gray-500 italic">-</span>
                                       )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">{setting.description || '-'}</td>
                                    <td className="px-4 py-3 flex gap-3">
                                       <button onClick={() => openModal('edit', 'botsettings', setting)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                       <button onClick={() => handleDelete('botsettings', setting.id!.toString())} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}








               {/* ======================= USER ROLE ======================= */}
               {activeTab === 'userrole' && currentUser?.role === 'Admin' && (
                  <div className="space-y-4 animate-fade-in text-gray-900">
                     <input type="text" placeholder="🔍 Cari Username atau Nama Karyawan..." value={searchKaryawan} onChange={e => setSearchKaryawan(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal break-words">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'username')}>Username {sortConfigKaryawans.column === 'username' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'nama_karyawan')}>Nama Karyawan {sortConfigKaryawans.column === 'nama_karyawan' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'role')}>Role {sortConfigKaryawans.column === 'role' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigKaryawans, setSortConfigKaryawans, 'status_aktif')}>Status {sortConfigKaryawans.column === 'status_aktif' && (<span>{sortConfigKaryawans.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold">Akses Halaman</th><th className="px-6 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedKaryawans.map((k: Karyawan) => (
                                    <tr key={k.id_karyawan} className="hover:bg-gray-50 font-medium">
                                       <td className="px-6 py-3 font-bold text-slate-800">{k.username}</td>
                                       <td className="px-6 py-3">{k.nama_karyawan}</td>
                                       <td className="px-6 py-3 font-bold text-black">{k.role}</td>
                                       <td className="px-6 py-3">
                                          <span className={`px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${k.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{k.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
                                       </td>
                                       <td className="px-6 py-3 font-mono text-xs text-gray-600">{k.role === 'Admin' ? 'Semua Akses' : (k.akses_halaman || []).join(', ')}</td>
                                       <td className="px-6 py-3 flex gap-3">
                                          <button onClick={() => openModal('edit', 'karyawan', k)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                          <button onClick={() => openModal('reset_pw', 'karyawan', k)} className="text-amber-600 text-xs font-bold hover:underline">Reset PW</button>
                                          <button onClick={() => handleDelete('karyawan', k.id_karyawan!)} className="text-red-600 text-xs font-bold hover:underline" disabled={k.username === 'admin'}>Hapus</button>
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
                                    <div className="flex justify-between items-start">
                                       <div>
                                          <h3 className="font-bold text-base text-slate-800">{k.nama_karyawan}</h3>
                                          <p className="text-xs text-gray-500">{k.username}</p>
                                       </div>
                                       <span className={`px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${k.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{k.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
                                    </div>
                                    <p className="text-sm font-bold text-black mt-2">{k.role}</p>
                                 </div>
                                 <div className="space-y-1 text-xs flex-1">
                                    <p className="font-bold">Akses:</p>
                                    <p className="font-mono text-gray-600">{k.role === 'Admin' ? 'Semua Akses' : (k.akses_halaman || []).join(', ')}</p>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end">
                                    <button onClick={() => openModal('edit', 'karyawan', k)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                    <button onClick={() => openModal('reset_pw', 'karyawan', k)} className="text-amber-600 text-xs font-bold hover:underline">Reset PW</button>
                                    <button onClick={() => handleDelete('karyawan', k.id_karyawan!)} className="text-red-600 text-xs font-bold hover:underline" disabled={k.username === 'admin'}>Hapus</button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}
               </main>
            </div>
         </div>

         {/* --- MODALS NEW CHAT --- */}
            {isNewChatModalOpen && (
               <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 text-gray-900">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                     <h2 className="text-lg font-bold">Pesan Baru</h2>
                     <input type="text" value={newChatWa} onChange={e => setNewChatWa(e.target.value)} placeholder="No WA (Contoh: 0812...)" className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                     <textarea rows={4} value={newChatMsg} onChange={e => setNewChatMsg(e.target.value)} placeholder="Isi pesan..." className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]"></textarea>
                     <div className="flex justify-end gap-3">
                        <button onClick={() => setIsNewChatModalOpen(false)} className="px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 rounded-md text-sm font-bold transition">Batal</button>
                        <button onClick={handleSendNewChat} className="px-4 py-2 bg-[#FFE500] hover:bg-[#E5CE00] text-black rounded-md text-sm font-bold transition disabled:opacity-50" disabled={!newChatWa || !newChatMsg}>Kirim</button>
                     </div>
                  </div>
               </div>
            )}

            {/* --- MODALS CREATE / EDIT --- */}
            {isModalOpen && (
               <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 text-gray-900">
                  <div className={`bg-white rounded-xl shadow-2xl w-full ${activeTab === 'budgets' ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden flex flex-col max-h-[90vh]`}>
                     <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold">{modalAction === 'create' ? 'Tambah' : modalAction === 'reset_pw' ? 'Reset Password' : 'Edit'} Data</h2>
                        <button onClick={closeModal} className="text-2xl text-gray-400 hover:text-gray-700 leading-none transition">×</button>
                     </div>

                     <div className="p-6 overflow-y-auto">

                        {activeTab === 'claims' && (
                           <form id="claimForm" onSubmit={handleSaveClaim} className="space-y-4">
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor WA</label>
                                 <input required type="text" value={claimForm.nomor_wa || ''} onChange={e => setClaimForm({ ...claimForm, nomor_wa: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor Seri</label>
                                 <input required type="text" value={claimForm.nomor_seri || ''} onChange={e => setClaimForm({ ...claimForm, nomor_seri: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Tipe Barang</label>
                                    <input type="text" list="list-tipe-barang" value={claimForm.tipe_barang || ''} onChange={e => setClaimForm({ ...claimForm, tipe_barang: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Tgl Pembelian</label>
                                    <input type="date" value={claimForm.tanggal_pembelian || ''} onChange={e => setClaimForm({ ...claimForm, tanggal_pembelian: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                              </div>

                              {(modalAction === 'edit' && (claimForm.link_kartu_garansi || claimForm.link_nota_pembelian)) && (
                                 <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex flex-col gap-2">
                                    <span className="text-xs font-bold text-blue-800">Dokumen Lampiran (Klik untuk Buka):</span>
                                    {claimForm.link_nota_pembelian ? (
                                       <button type="button" onClick={() => openImageViewer(claimForm.link_nota_pembelian as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Link Nota Pembelian</button>
                                    ) : (
                                       <span className="text-xs font-bold text-gray-500 italic">Tidak ada link Nota Pembelian</span>
                                    )}
                                    {claimForm.link_kartu_garansi ? (
                                       <button type="button" onClick={() => openImageViewer(claimForm.link_kartu_garansi as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Link Kartu Garansi</button>
                                    ) : (
                                       <span className="text-xs font-bold text-gray-500 italic">Tidak ada link Kartu Garansi</span>
                                    )}
                                 </div>
                              )}

                              {/* New file upload section for ClaimForm */}
                              <div className="bg-gray-50 border border-gray-100 p-3 rounded-md space-y-3">
                                 <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-900">Nota Pembelian (Upload atau Link)</label>
                                    <input type="text" value={typeof claimForm.link_nota_pembelian === 'string' ? claimForm.link_nota_pembelian : ''} onChange={e => setClaimForm({ ...claimForm, link_nota_pembelian: e.target.value })} placeholder="Tempel link Google Drive atau URL lainnya di sini..." className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-xs outline-none focus:border-[#FFE500]" />
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold text-gray-500">ATAU UPLOAD:</span>
                                       <input type="file" accept="image/*,application/pdf" onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) setClaimForm(prev => ({ ...prev, link_nota_pembelian: file as any }));
                                       }} className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-1 text-[10px]" />
                                    </div>
                                 </div>

                                 {claimForm.link_nota_pembelian && (
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                                       <span className="text-xs font-medium text-gray-600 truncate flex-1">
                                          {claimForm.link_nota_pembelian instanceof File ? `📄 File: ${claimForm.link_nota_pembelian.name}` : `${isGoogleDriveLink(claimForm.link_nota_pembelian) ? '🔗📂' : '🔗'} URL: ${String(claimForm.link_nota_pembelian).substring(0, 40)}...`}
                                       </span>
                                       <button type="button" onClick={() => setClaimForm(prev => ({ ...prev, link_nota_pembelian: null as any }))} className="bg-red-50 text-red-600 font-bold px-2 py-1 rounded text-[10px] hover:bg-red-100 transition">Hapus</button>
                                    </div>
                                 )}

                                 <div className="space-y-1 mt-4">
                                    <label className="block text-sm font-bold text-gray-900">Kartu Garansi (Upload atau Link)</label>
                                    <input type="text" value={typeof claimForm.link_kartu_garansi === 'string' ? claimForm.link_kartu_garansi : ''} onChange={e => setClaimForm({ ...claimForm, link_kartu_garansi: e.target.value })} placeholder="Tempel link Google Drive atau URL lainnya di sini..." className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-xs outline-none focus:border-[#FFE500]" />
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold text-gray-500">ATAU UPLOAD:</span>
                                       <input type="file" accept="image/*,application/pdf" onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) setClaimForm(prev => ({ ...prev, link_kartu_garansi: file as any }));
                                       }} className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-1 text-[10px]" />
                                    </div>
                                 </div>

                                 {claimForm.link_kartu_garansi && (
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                                       <span className="text-xs font-medium text-gray-600 truncate flex-1">
                                          {claimForm.link_kartu_garansi instanceof File ? `📄 File: ${claimForm.link_kartu_garansi.name}` : `${isGoogleDriveLink(claimForm.link_kartu_garansi) ? '🔗📂' : '🔗'} URL: ${String(claimForm.link_kartu_garansi).substring(0, 40)}...`}
                                       </span>
                                       <button type="button" onClick={() => setClaimForm(prev => ({ ...prev, link_kartu_garansi: null as any }))} className="bg-red-50 text-red-600 font-bold px-2 py-1 rounded text-[10px] hover:bg-red-100 transition">Hapus</button>
                                    </div>
                                 )}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Validasi MKT</label>
                                    <select value={claimForm.validasi_by_mkt || ''} onChange={e => setClaimForm({ ...claimForm, validasi_by_mkt: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Tidak Valid">Tidak Valid</option>
                                       <option value="HOLD">HOLD</option>
                                       <option value="Double Input">Double Input</option>
                                    </select>
                                    <label className="block text-sm font-bold mt-3 mb-1">Catatan MKT</label>
                                    <textarea rows={2} value={claimForm.catatan_mkt || ''} onChange={e => setClaimForm({ ...claimForm, catatan_mkt: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Catatan tambahan MKT..."></textarea>
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Validasi FA</label>
                                    <select value={claimForm.validasi_by_fa || ''} onChange={e => setClaimForm({ ...claimForm, validasi_by_fa: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Tidak Valid">Tidak Valid</option>
                                    </select>
                                    <label className="block text-sm font-bold mt-3 mb-1">Catatan FA</label>
                                    <textarea rows={2} value={claimForm.catatan_fa || ''} onChange={e => setClaimForm({ ...claimForm, catatan_fa: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Catatan tambahan FA..."></textarea>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 bg-gray-50 border border-gray-100 p-3 rounded-md">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Nama Toko</label>
                                    <input type="text" list="list-nama-toko" value={claimForm.nama_toko || ''} onChange={e => setClaimForm({ ...claimForm, nama_toko: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Ketik nama toko..." />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Jenis Promosi</label>
                                    <input type="text" list="list-jenis-promo" value={claimForm.jenis_promosi || ''} onChange={e => setClaimForm({ ...claimForm, jenis_promosi: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Ketik jenis promo..." />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Jasa Pengiriman</label>
                                    <input type="text" list="list-jasa-kirim" value={claimForm.nama_jasa_pengiriman || ''} onChange={e => setClaimForm({ ...claimForm, nama_jasa_pengiriman: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="JNE / J&T / dll" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Nomor Resi</label>
                                    <input type="text" value={claimForm.nomor_resi || ''} onChange={e => setClaimForm({ ...claimForm, nomor_resi: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Masukkan nomor resi..." />
                                 </div>
                              </div>
                           </form>
                        )}

                        {activeTab === 'konsumen' && (
                           <form id="konsumenForm" onSubmit={handleSaveKonsumen} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Nama Lengkap</label>
                                    <input required type="text" value={konsumenForm.nama_lengkap || ''} onChange={e => setKonsumenForm({ ...konsumenForm, nama_lengkap: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Nomor WhatsApp</label>
                                    <input required type="text" value={konsumenForm.nomor_wa || ''} onChange={e => setKonsumenForm({ ...konsumenForm, nomor_wa: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={modalAction === 'edit'} />
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">NIK</label>
                                    <input type="text" value={konsumenForm.nik || ''} onChange={e => setKonsumenForm({ ...konsumenForm, nik: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Kode Pos</label>
                                    <input type="text" value={konsumenForm.kodepos || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kodepos: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Alamat Rumah</label>
                                 <textarea rows={2} value={konsumenForm.alamat_rumah || ''} onChange={e => setKonsumenForm({ ...konsumenForm, alamat_rumah: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]"></textarea>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Kelurahan</label>
                                    <input type="text" value={konsumenForm.kelurahan || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kelurahan: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Kecamatan</label>
                                    <input type="text" value={konsumenForm.kecamatan || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kecamatan: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Kabupaten / Kotamadya</label>
                                    <input type="text" value={konsumenForm.kabupaten_kotamadya || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kabupaten_kotamadya: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Provinsi</label>
                                    <input type="text" value={konsumenForm.provinsi || ''} onChange={e => setKonsumenForm({ ...konsumenForm, provinsi: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                              </div>
                           </form>
                        )}

                        {activeTab === 'warranties' && (
                           <form id="warrantyForm" onSubmit={handleSaveWarranty} className="space-y-4">
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor Seri</label>
                                 <input required type="text" value={warrantyForm.nomor_seri || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nomor_seri: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Tipe Barang</label>
                                 <input required type="text" list="list-tipe-barang" value={warrantyForm.tipe_barang || ''} onChange={e => setWarrantyForm({ ...warrantyForm, tipe_barang: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>

                              {(modalAction === 'edit') && (
                                 <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex flex-col gap-2">
                                    <span className="text-xs font-bold text-blue-800">Dokumen Lampiran Garansi/Nota:</span>
                                    {(() => {
                                       const linked = claims.find(c => c.nomor_seri === warrantyForm.nomor_seri);
                                       const n = warrantyForm.link_nota_pembelian || linked?.link_nota_pembelian;
                                       const g = warrantyForm.link_kartu_garansi || linked?.link_kartu_garansi;
                                       return (
                                          <>
                                             {n ? <button type="button" onClick={() => openImageViewer(n as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Lihat Bukti Nota</button> : <span className="text-xs font-bold text-gray-500 italic">Tidak ada link Nota</span>}
                                             {g ? <button type="button" onClick={() => openImageViewer(g as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Lihat Bukti Kartu Garansi</button> : <span className="text-xs font-bold text-gray-500 italic">Tidak ada link Kartu Garansi</span>}
                                          </>
                                       );
                                    })()}
                                 </div>
                              )}

                              {/* New file upload section for WarrantyForm */}
                              <div className="bg-gray-50 border border-gray-100 p-3 rounded-md space-y-3">
                                 <div className="space-y-1">
                                    <label className="block text-sm font-bold text-gray-900">Nota Pembelian (Upload atau Link)</label>
                                    <input type="text" value={typeof warrantyForm.link_nota_pembelian === 'string' ? warrantyForm.link_nota_pembelian : ''} onChange={e => setWarrantyForm({ ...warrantyForm, link_nota_pembelian: e.target.value })} placeholder="Tempel link Google Drive atau URL lainnya di sini..." className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-xs outline-none focus:border-[#FFE500]" />
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold text-gray-500">ATAU UPLOAD:</span>
                                       <input type="file" accept="image/*,application/pdf" onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) setWarrantyForm(prev => ({ ...prev, link_nota_pembelian: file as any }));
                                       }} className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-1 text-[10px]" />
                                    </div>
                                 </div>

                                 {warrantyForm.link_nota_pembelian && (
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                                       <span className="text-xs font-medium text-gray-600 truncate flex-1">
                                          {warrantyForm.link_nota_pembelian instanceof File ? `📄 File: ${warrantyForm.link_nota_pembelian.name}` : `${isGoogleDriveLink(warrantyForm.link_nota_pembelian) ? '🔗📂' : '🔗'} URL: ${String(warrantyForm.link_nota_pembelian).substring(0, 40)}...`}
                                       </span>
                                       <button type="button" onClick={() => setWarrantyForm(prev => ({ ...prev, link_nota_pembelian: null as any }))} className="bg-red-50 text-red-600 font-bold px-2 py-1 rounded text-[10px] hover:bg-red-100 transition">Hapus</button>
                                    </div>
                                 )}

                                 <div className="space-y-1 mt-4">
                                    <label className="block text-sm font-bold text-gray-900">Kartu Garansi (Upload atau Link)</label>
                                    <input type="text" value={typeof warrantyForm.link_kartu_garansi === 'string' ? warrantyForm.link_kartu_garansi : ''} onChange={e => setWarrantyForm({ ...warrantyForm, link_kartu_garansi: e.target.value })} placeholder="Tempel link Google Drive atau URL lainnya di sini..." className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-xs outline-none focus:border-[#FFE500]" />
                                    <div className="flex items-center gap-2">
                                       <span className="text-[10px] font-bold text-gray-500">ATAU UPLOAD:</span>
                                       <input type="file" accept="image/*,application/pdf" onChange={e => {
                                          const file = e.target.files?.[0];
                                          if (file) setWarrantyForm(prev => ({ ...prev, link_kartu_garansi: file as any }));
                                       }} className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-1 text-[10px]" />
                                    </div>
                                 </div>

                                 {warrantyForm.link_kartu_garansi && (
                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-100">
                                       <span className="text-xs font-medium text-gray-600 truncate flex-1">
                                          {warrantyForm.link_kartu_garansi instanceof File ? `📄 File: ${warrantyForm.link_kartu_garansi.name}` : `${isGoogleDriveLink(warrantyForm.link_kartu_garansi) ? '🔗📂' : '🔗'} URL: ${String(warrantyForm.link_kartu_garansi).substring(0, 40)}...`}
                                       </span>
                                       <button type="button" onClick={() => setWarrantyForm(prev => ({ ...prev, link_kartu_garansi: null as any }))} className="bg-red-50 text-red-600 font-bold px-2 py-1 rounded text-[10px] hover:bg-red-100 transition">Hapus</button>
                                    </div>
                                 )}
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Status Validasi</label>
                                    <select value={warrantyForm.status_validasi || ''} onChange={e => setWarrantyForm({ ...warrantyForm, status_validasi: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="Menunggu">Menunggu</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Tidak Valid">Tidak Valid</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Jenis Garansi</label>
                                    <select value={warrantyForm.jenis_garansi || ''} onChange={e => setWarrantyForm({ ...warrantyForm, jenis_garansi: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="Jasa 30%">Jasa 30%</option>
                                       <option value="Extended to 2 Year">Extended to 2 Year</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Lama Garansi</label>
                                    <select value={warrantyForm.lama_garansi || ''} onChange={e => setWarrantyForm({ ...warrantyForm, lama_garansi: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="1 Tahun">1 Tahun</option>
                                       <option value="2 Tahun">2 Tahun</option>
                                       <option value="Tidak Garansi">Tidak Garansi</option>
                                    </select>
                                 </div>
                              </div>
                           </form>
                        )}

                        {activeTab === 'promos' && (
                           <form id="promoForm" onSubmit={handleSavePromo} className="space-y-4">
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nama Promo</label>
                                 <input required type="text" list="list-jenis-promo" value={promoForm.nama_promo || ''} onChange={e => setPromoForm({ ...promoForm, nama_promo: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Tgl Mulai</label>
                                    <input required type="date" value={promoForm.tanggal_mulai || ''} onChange={e => setPromoForm({ ...promoForm, tanggal_mulai: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Tgl Selesai</label>
                                    <input required type="date" value={promoForm.tanggal_selesai || ''} onChange={e => setPromoForm({ ...promoForm, tanggal_selesai: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                              </div>
                              <div>
                                 <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={promoForm.status_aktif || false} onChange={e => setPromoForm({ ...promoForm, status_aktif: e.target.checked })} className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black" />
                                    <span className="text-sm font-bold text-gray-900">Promo Aktif</span>
                                 </label>
                              </div>

                              <div className="mt-4 border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded-md">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-gray-900">Tipe Produk yang Berlaku</label>
                                    <button type="button" onClick={() => setPromoForm({ ...promoForm, tipe_produk: [...(promoForm.tipe_produk || []), { nama_produk: '' }] })} className="bg-white border border-gray-300 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 transition text-gray-900">+ Tambah Produk</button>
                                 </div>
                                 {promoForm.tipe_produk?.map((item, index) => (
                                    <div key={index} className="flex gap-2 mb-2 items-center">
                                       <div className="flex-1">
                                          <input type="text" list="list-tipe-barang" required value={item.nama_produk} onChange={e => { const newItems = [...(promoForm.tipe_produk || [])]; newItems[index].nama_produk = e.target.value; setPromoForm({ ...promoForm, tipe_produk: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Ketik nama produk..." />
                                       </div>
                                       <button type="button" onClick={() => { const newItems = [...(promoForm.tipe_produk || [])]; newItems.splice(index, 1); setPromoForm({ ...promoForm, tipe_produk: newItems }); }} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-2 rounded text-sm transition border border-red-200">X</button>
                                    </div>
                                 ))}
                                 {(!promoForm.tipe_produk || promoForm.tipe_produk.length === 0) && <p className="text-xs font-bold text-gray-500 italic mt-2">Belum ada produk ditambahkan</p>}
                              </div>
                           </form>
                        )}

                        {activeTab === 'services' && (
                           <form id="serviceForm" onSubmit={handleSaveService} className="space-y-4">
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor Tanda Terima</label>
                                 <input required type="text" value={serviceForm.nomor_tanda_terima || ''} onChange={e => setServiceForm({ ...serviceForm, nomor_tanda_terima: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Masukkan ID/Resi service" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor Seri</label>
                                 <input required type="text" value={serviceForm.nomor_seri || ''} onChange={e => setServiceForm({ ...serviceForm, nomor_seri: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Status Service</label>
                                 <input required type="text" list="list-status-service" value={serviceForm.status_service || ''} onChange={e => setServiceForm({ ...serviceForm, status_service: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Contoh: Menunggu Sparepart / Selesai" />
                              </div>
                           </form>
                        )}

                        {activeTab === 'budgets' && (
                           <form id="budgetForm" onSubmit={handleSaveBudget} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Proposal No</label>
                                    <input required type="text" value={budgetForm.proposal_no || ''} onChange={e => setBudgetForm({ ...budgetForm, proposal_no: e.target.value })} className="w-full border border-gray-300 bg-gray-100 text-gray-900 rounded-md px-3 py-2 text-sm font-mono" readOnly />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Title</label>
                                    <input required type="text" value={budgetForm.title || ''} onChange={e => setBudgetForm({ ...budgetForm, title: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" />
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Period (Tanggal)</label>
                                    <input required type="date" value={budgetForm.period || ''} onChange={e => setBudgetForm({ ...budgetForm, period: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Budget Source</label>
                                    <input required type="text" list="list-budget-source" value={budgetForm.budget_source || ''} onChange={e => setBudgetForm({ ...budgetForm, budget_source: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" />
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Objectives</label>
                                 <textarea required rows={2} value={budgetForm.objectives || ''} onChange={e => setBudgetForm({ ...budgetForm, objectives: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Detail of Activity</label>
                                 <textarea required rows={2} value={budgetForm.detail_activity || ''} onChange={e => setBudgetForm({ ...budgetForm, detail_activity: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Expected Result</label>
                                 <textarea required rows={2} value={budgetForm.expected_result || ''} onChange={e => setBudgetForm({ ...budgetForm, expected_result: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" />
                              </div>

                              <div className="bg-gray-50 border border-gray-100 p-4 rounded-md space-y-4">
                                 <label className="block text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Nama Penandatangan (Approval)</label>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                       <label className="block text-[11px] font-bold text-gray-600 mb-1">Proposed By</label>
                                       <input type="text" value={budgetForm.drafter_name || ''} onChange={e => setBudgetForm({ ...budgetForm, drafter_name: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" placeholder="Nama Pembuat" />
                                    </div>
                                    <div>
                                       <label className="block text-[11px] font-bold text-gray-600 mb-1">Mgt. Comment 1</label>
                                       <input type="text" value={budgetForm.mgt_comment_1 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_comment_1: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" placeholder="Kosongkan jika tidak perlu" />
                                    </div>
                                    <div>
                                       <label className="block text-[11px] font-bold text-gray-600 mb-1">Mgt. Comment 2</label>
                                       <input type="text" value={budgetForm.mgt_comment_2 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_comment_2: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" placeholder="Kosongkan jika tidak perlu" />
                                    </div>
                                    <div>
                                       <label className="block text-[11px] font-bold text-gray-600 mb-1">Mgt. Consent</label>
                                       <input type="text" value={budgetForm.mgt_consent || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_consent: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" placeholder="Contoh: Larry Handra" />
                                    </div>
                                    <div>
                                       <label className="block text-[11px] font-bold text-gray-600 mb-1">Finance Consent</label>
                                       <input type="text" value={budgetForm.finance_consent || ''} onChange={e => setBudgetForm({ ...budgetForm, finance_consent: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm" placeholder="Nama Finance" />
                                    </div>
                                 </div>
                              </div>

                              <div>
                                 <label className="block text-sm font-bold mb-2">Lampiran Poster (Maks 3 Gambar)</label>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[0, 1, 2].map((i) => (
                                       <div key={i} className="space-y-2">
                                          <div className="flex gap-2 items-center">
                                             <input type="file" accept="image/*" onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                   const newUrls = [...(budgetForm.attachment_urls || [null, null, null])];
                                                   newUrls[i] = file;
                                                   setBudgetForm({ ...budgetForm, attachment_urls: newUrls });
                                                }
                                             }} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-2 py-1 text-xs" />
                                             {budgetForm.attachment_urls?.[i] && (
                                                <button type="button" onClick={() => {
                                                   const newUrls = [...(budgetForm.attachment_urls || [])];
                                                   newUrls[i] = null;
                                                   setBudgetForm({ ...budgetForm, attachment_urls: newUrls });
                                                }} className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-[10px] hover:bg-red-200 transition">×</button>
                                             )}
                                          </div>
                                          {budgetForm.attachment_urls?.[i] && (
                                             <div className="border rounded p-1 bg-gray-50 text-center">
                                                <img
                                                   src={budgetForm.attachment_urls[i] instanceof File
                                                      ? URL.createObjectURL(budgetForm.attachment_urls[i] as File)
                                                      : budgetForm.attachment_urls[i] as string}
                                                   alt={`Preview ${i + 1}`}
                                                   className="h-20 mx-auto object-contain cursor-pointer"
                                                   onClick={() => openImageViewer(budgetForm.attachment_urls![i] as any)}
                                                />
                                             </div>
                                          )}
                                       </div>
                                    ))}
                                 </div>
                              </div>
                              <div className="mt-6 border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded-md">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-gray-900">Rincian Budget (Items)</label>
                                    <button type="button" onClick={() => setBudgetForm({ ...budgetForm, items: [...(budgetForm.items || []), { purpose: '', qty: 1, cost_unit: 0, value: 0 }] })} className="bg-white border border-gray-300 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 transition text-gray-900">+ Tambah Item</button>
                                 </div>
                                 {budgetForm.items?.map((item, index) => (
                                    <div key={index} className="flex gap-2 mb-2 items-end">
                                       <div className="flex-1">
                                          <label className="text-xs font-bold text-gray-700">Purpose</label>
                                          <input type="text" value={item.purpose} onChange={e => { const newItems = [...(budgetForm.items || [])]; newItems[index].purpose = e.target.value; setBudgetForm({ ...budgetForm, items: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                       <div className="w-16">
                                          <label className="text-xs font-bold text-gray-700">Qty</label>
                                          <input type="number" value={item.qty} onChange={e => { const newItems = [...(budgetForm.items || [])]; newItems[index].qty = Number(e.target.value); newItems[index].value = newItems[index].qty * newItems[index].cost_unit; setBudgetForm({ ...budgetForm, items: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                       <div className="w-32">
                                          <label className="text-xs font-bold text-gray-700">Cost/Unit</label>
                                          <input type="number" value={item.cost_unit} onChange={e => { const newItems = [...(budgetForm.items || [])]; newItems[index].cost_unit = Number(e.target.value); newItems[index].value = newItems[index].qty * newItems[index].cost_unit; setBudgetForm({ ...budgetForm, items: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                       <div className="w-32">
                                          <label className="text-xs font-bold text-gray-700">Value (Auto)</label>
                                          <input type="number" readOnly value={item.value} className="w-full border border-gray-300 bg-gray-100 text-gray-600 rounded px-2 py-1 text-sm font-mono" />
                                       </div>
                                       <button type="button" onClick={() => { const newItems = [...(budgetForm.items || [])]; newItems.splice(index, 1); setBudgetForm({ ...budgetForm, items: newItems }); }} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1.5 rounded text-sm mb-0.5 transition border border-red-200">X</button>
                                    </div>
                                 ))}
                                 <div className="flex justify-end items-center mt-4 gap-4">
                                    <button type="button" onClick={() => { const total = (budgetForm.items || []).reduce((acc, curr) => acc + curr.value, 0); setBudgetForm({ ...budgetForm, total_cost: total }); }} className="text-xs font-bold text-black hover:text-blue-800 hover:underline transition">Hitung Ulang Total</button>
                                    <div className="font-bold text-gray-900">Total Cost: Rp {Number(budgetForm.total_cost || 0).toLocaleString('id-ID')}</div>
                                 </div>
                              </div>
                           </form>
                        )}

                        {activeTab === 'lending' && (
                           <>
                           <form id="lendingForm" onSubmit={handleSaveLending} className="space-y-4">
                              {modalAction === 'return' && (
                                 <div className="bg-blue-50 p-4 rounded-md border border-blue-200 text-blue-800 text-sm mb-4 font-medium">
                                    Anda sedang memproses pengembalian barang untuk: <b className="text-blue-900 text-lg ml-1">{lendingForm.nama_peminjam}</b>
                                 </div>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Nama Peminjam</label>
                                    <input required type="text" value={lendingForm.nama_peminjam || ''} onChange={e => setLendingForm({ ...lendingForm, nama_peminjam: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={modalAction === 'return'} />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Nomor WhatsApp Peminjam</label>
                                    <input required type="text" value={lendingForm.nomor_wa_peminjam || ''} onChange={e => setLendingForm({ ...lendingForm, nomor_wa_peminjam: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={modalAction === 'return'} />
                                 </div>
                              </div>

                              {modalAction !== 'return' && (
                                 <div className="bg-gray-50 border border-gray-100 p-3 rounded-md space-y-3">
                                    <label className="block text-sm font-bold text-gray-900">Upload Foto KTP / ID Card</label>
                                    <input type="file" accept="image/*,application/pdf" onChange={e => {
                                       const file = e.target.files?.[0];
                                       if (file) setLendingForm(prev => ({ ...prev, link_ktp_peminjam: file as any }));
                                    }} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-1.5 text-sm" />
                                    {lendingForm.link_ktp_peminjam && (
                                       <div className="flex items-center gap-2 mt-2">
                                          <span className="text-xs font-medium text-gray-600 truncate max-w-[200px]">
                                             {lendingForm.link_ktp_peminjam instanceof File ? `File baru: ${lendingForm.link_ktp_peminjam.name}` : `URL: ${String(lendingForm.link_ktp_peminjam).substring(0, 30)}...`}
                                          </span>
                                          <button type="button" onClick={() => setLendingForm(prev => ({ ...prev, link_ktp_peminjam: null as any }))} className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs hover:bg-red-200 transition">Hapus</button>
                                       </div>
                                    )}
                                    {lendingForm.link_ktp_peminjam && typeof lendingForm.link_ktp_peminjam === 'string' && (
                                       <button type="button" onClick={() => openImageViewer(lendingForm.link_ktp_peminjam as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Lihat KTP Terunggah</button>
                                    )}
                                 </div>
                              )}

                              <div className="mt-4 border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded-md">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-gray-900">Daftar Barang Dipinjam</label>
                                    {modalAction !== 'return' && (
                                       <button type="button" onClick={() => setLendingForm({ ...lendingForm, items_dipinjam: [...(lendingForm.items_dipinjam || []), { nama_barang: '', nomor_seri: '', catatan: '', catatan_pengembalian: '', status_pengembalian: 'dipinjam' }] })} className="bg-white border border-gray-300 px-3 py-1 rounded text-xs font-bold hover:bg-gray-100 transition text-gray-900">+ Tambah Barang</button>
                                    )}
                                 </div>
                                 {lendingForm.items_dipinjam?.map((item, index) => (
                                    <React.Fragment key={index}>
                                       <div className="flex gap-2 mb-2 items-end p-2 border border-gray-100 rounded-md bg-white">
                                          <div className="flex-1">
                                             <label className="text-xs font-bold text-gray-700">Nama Barang</label>
                                             <input type="text" list="list-nama-barang" required value={item.nama_barang} onChange={e => { const newItems = [...(lendingForm.items_dipinjam || [])]; newItems[index].nama_barang = e.target.value; setLendingForm({ ...lendingForm, items_dipinjam: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" disabled={modalAction === 'return'} />
                                          </div>
                                          <div className="flex-1">
                                             <label className="text-xs font-bold text-gray-700">Nomor Seri</label>
                                             <input type="text" required value={item.nomor_seri} onChange={e => { const newItems = [...(lendingForm.items_dipinjam || [])]; newItems[index].nomor_seri = e.target.value; setLendingForm({ ...lendingForm, items_dipinjam: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" disabled={modalAction === 'return'} />
                                          </div>
                                          <div className="flex-1">
                                             <label className="text-xs font-bold text-gray-700">Catatan</label>
                                             <input type="text" list="list-catatan-peminjaman" value={item.catatan || ''} onChange={e => { const newItems = [...(lendingForm.items_dipinjam || [])]; newItems[index].catatan = e.target.value; setLendingForm({ ...lendingForm, items_dipinjam: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" disabled={modalAction === 'return'} />
                                          </div>
                                          {modalAction === 'return' ? (
                                             <div className="w-32">
                                                <label className="text-xs font-bold text-gray-700">Status</label>
                                                <select value={item.status_pengembalian} onChange={e => {
                                                   const newItems = [...(lendingForm.items_dipinjam || [])];
                                                   newItems[index].status_pengembalian = e.target.value as 'dipinjam' | 'dikembalikan';
                                                   setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                                }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]">
                                                   <option value="dipinjam">Dipinjam</option>
                                                   <option value="dikembalikan">Dikembalikan</option>
                                                </select>
                                             </div>
                                          ) : modalAction === 'edit' ? (
                                             <div className="w-32">
                                                <label className="text-xs font-bold text-gray-700">Status</label>
                                                <select value={item.status_pengembalian} onChange={e => {
                                                   const newItems = [...(lendingForm.items_dipinjam || [])];
                                                   newItems[index].status_pengembalian = e.target.value as 'dipinjam' | 'dikembalikan';
                                                   setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                                }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" disabled>
                                                   <option value="dipinjam">Dipinjam</option>
                                                   <option value="dikembalikan">Dikembalikan</option>
                                                </select>
                                             </div>
                                          ) : (
                                             <button type="button" onClick={() => { const newItems = [...(lendingForm.items_dipinjam || [])]; newItems.splice(index, 1); setLendingForm({ ...lendingForm, items_dipinjam: newItems }); }} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1.5 rounded text-sm mb-0.5 transition border border-red-200">X</button>
                                          )}
                                       </div>
                                       {modalAction === 'return' && item.status_pengembalian === 'dikembalikan' && (
                                          <div className="flex gap-2 mb-2 items-end p-2 border border-gray-100 rounded-md bg-white -mt-1">
                                             <div className="flex-1">
                                                <label className="text-xs font-bold text-gray-700">Catatan Pengembalian (Opsional)</label>
                                                <input type="text" list="list-catatan-pengembalian" value={item.catatan_pengembalian || ''} onChange={e => { const newItems = [...(lendingForm.items_dipinjam || [])]; newItems[index].catatan_pengembalian = e.target.value; setLendingForm({ ...lendingForm, items_dipinjam: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" placeholder="Kondisi barang, dll." />
                                             </div>
                                             <div className="flex-1">
                                                <label className="text-xs font-bold text-gray-700">Catatan Admin</label>
                                                <input type="text" value={item.catatan_admin || ''} onChange={e => { const newItems = [...(lendingForm.items_dipinjam || [])]; newItems[index].catatan_admin = e.target.value; setLendingForm({ ...lendingForm, items_dipinjam: newItems }) }} className="w-full border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" placeholder="Catatan internal admin" />
                                             </div>
                                          </div>
                                       )}
                                    </React.Fragment>
                                 ))}
                                 {(!lendingForm.items_dipinjam || lendingForm.items_dipinjam.length === 0) && modalAction !== 'return' && (
                                    <p className="text-xs font-bold text-gray-500 italic mt-2">Belum ada barang ditambahkan</p>
                                 )}
                              </div>
                           </form>
                           <div className="flex justify-end gap-2 mt-4">
                              <button type="button" onClick={() => setLendingForm({ ...lendingForm, status_wa: 'Dikirim' })} className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-md text-sm transition flex items-center gap-2">
                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M.057 20l.667-6.017c.108-.178.84-.667 1.109-.834.269-.166.585-.166.854 0 .269.166.533.516.641.716l2.345 4.169c.173.31.433.56.729.716.296.156.633.166.942.033.309-.133.55-.416.7-.733l1.693-4.817c.1-.283.4-.516.733-.566.333-.05.683.066.933.316l3.483 3.367c.15.15.283.333.383.533.1.2.15.433.133.666-.017.233-.117.45-.283.616-.166.166-.383.283-.616.333-.233.05-.466.033-.683-.05l-4.417-2.483c-.133-.08-.266-.166-.4-.25-.133-.083-.283-.15-.433-.183-.15-.033-.316-.033-.466 0-.15.033-.283.1-.417.183l-4.416 2.483c-.217.1-.45.117-.683.05-.233-.05-.45-.166-.616-.333-.166-.166-.266-.383-.283-.616-.017-.233.033-.466.133-.666.1-.2.233-.383.383-.533l3.483-3.367c.25-.25.6-.366.933-.316.333.05.633.283.733.566l1.693 4.817c.15.316.393.599.7.733.309.133.65.123.942-.033.296-.156.556-.406.729-.716l2.345-4.169c.108-.199.372-.55.641-.716.269-.166.585-.166.854 0 .269.167.991.656 1.109.834l.667 6.017c.047.414-.296.777-.69.777h-11.834c-.394 0-.737-.363-.69-.777z"/></svg>
                                 Kirim Status WA
                              </button>
                           </div>
                           </>
                        )}

                        {activeTab === 'userrole' && (
                           <form id="karyawanForm" onSubmit={modalAction === 'reset_pw' ? handleResetPwAdmin : handleSaveKaryawan} className="space-y-4">
                              {modalAction === 'reset_pw' ? (
                                 <>
                                    <div className="bg-amber-50 p-4 rounded-md border border-amber-200 text-amber-800 text-sm mb-4 font-medium">
                                       Anda sedang mengatur ulang kata sandi (Reset Password) untuk user: <b className="text-amber-900 text-lg ml-1">{karyawanForm.username}</b>
                                    </div>
                                    <div>
                                       <label className="block text-sm font-bold mb-1">Ketik Password Baru</label>
                                       <input required type="password" value={karyawanForm.password || ''} onChange={e => setKaryawanForm({ ...karyawanForm, password: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Minimal 6 karakter..." />
                                    </div>
                                 </>
                              ) : (
                                 <>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Nama Karyawan</label>
                                          <input required type="text" value={karyawanForm.nama_karyawan || ''} onChange={e => setKaryawanForm({ ...karyawanForm, nama_karyawan: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Nomor WhatsApp (Reset Pw)</label>
                                          <input required type="text" placeholder="62812345..." value={karyawanForm.nomor_wa || ''} onChange={e => setKaryawanForm({ ...karyawanForm, nomor_wa: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Username Login</label>
                                          <input required type="text" value={karyawanForm.username || ''} onChange={e => setKaryawanForm({ ...karyawanForm, username: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={karyawanForm.username === 'admin'} />
                                       </div>
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Password {modalAction === 'edit' && <span className="text-[10px] font-normal text-gray-500">(Kosongkan jika tidak diubah)</span>}</label>
                                          <input type="password" value={karyawanForm.password || ''} onChange={e => setKaryawanForm({ ...karyawanForm, password: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Role Akun</label>
                                          <input type="text" list="list-roles" value={karyawanForm.role || ''} onChange={e => setKaryawanForm({ ...karyawanForm, role: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={karyawanForm.username === 'admin'} placeholder="Ketik atau pilih role..." />
                                       </div>
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Status Akun</label>
                                          <select value={karyawanForm.status_aktif ? 'true' : 'false'} onChange={e => setKaryawanForm({ ...karyawanForm, status_aktif: e.target.value === 'true' })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={karyawanForm.username === 'admin'}>
                                             <option value="true">Aktif</option>
                                             <option value="false">Tidak Aktif (Blokir)</option>
                                          </select>
                                       </div>
                                    </div>
                                    <div className="mt-4 border-t border-gray-100 pt-4 bg-gray-50 p-4 rounded-md">
                                       <label className="block text-sm font-bold text-gray-900 mb-2">Akses Halaman yang Diizinkan</label>
                                       <p className="text-xs font-bold text-gray-500 mb-3">Pilih tab mana saja yang boleh dilihat oleh karyawan ini.</p>
                                       <div className="grid grid-cols-2 gap-2">
                                          {[{ id: 'messages', label: 'Pesan' }, { id: 'konsumen', label: 'Konsumen' }, { id: 'promos', label: 'Promo' }, { id: 'claims', label: 'Claim' }, { id: 'warranties', label: 'Garansi' }, { id: 'services', label: 'Service' }, { id: 'budgets', label: 'ProposalEvent' }, { id: 'import', label: 'Import Data' }, { id: 'lending', label: 'Peminjaman' }].map(tab => {
                                             const isChecked = (karyawanForm.akses_halaman || []).includes(tab.id) || karyawanForm.role === 'Admin';
                                             return (
                                                <label key={tab.id} className={`flex items-center gap-2 p-2 rounded border ${isChecked ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'} cursor-pointer`}>
                                                   <input type="checkbox" checked={isChecked} disabled={karyawanForm.role === 'Admin'} onChange={() => {
                                                      const current = karyawanForm.akses_halaman || [];
                                                      if (current.includes(tab.id)) setKaryawanForm({ ...karyawanForm, akses_halaman: current.filter(x => x !== tab.id) });
                                                      else setKaryawanForm({ ...karyawanForm, akses_halaman: [...current, tab.id] });
                                                   }} className="w-4 h-4 text-black rounded focus:ring-black" />
                                                   <span className="text-sm font-bold text-gray-700">{tab.label}</span>
                                                </label>
                                             )
                                          })}
                                       </div>
                                    </div>
                                 </>
                              )}
                           </form>
                        )}

                        
                        
                        {activeTab === 'eventregistrations' && (
                           <form id="registrationForm" onSubmit={handleSaveRegistration} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nomor WhatsApp</label>
                                    <input type="text" value={registrationForm.nomor_wa || ''} onChange={async e => {
                                       const wa = e.target.value;
                                       setRegistrationForm({ ...registrationForm, nomor_wa: wa });
                                       if (wa.length >= 10) {
                                          const { data } = await supabase.from('konsumen').select('nama_lengkap, kabupaten_kotamadya').eq('nomor_wa', wa).single();
                                          if (data) setRegistrationForm(f => ({ ...f, nomor_wa: wa, nama_lengkap: data.nama_lengkap || '', kabupaten_kotamadya: data.kabupaten_kotamadya || '' }));
                                       }
                                    }} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" required />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Lengkap</label>
                                    <input type="text" value={registrationForm.nama_lengkap || ''} onChange={e => setRegistrationForm({ ...registrationForm, nama_lengkap: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" required />
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Kabupaten / Kotamadya</label>
                                    <input type="text" value={registrationForm.kabupaten_kotamadya || ''} onChange={e => setRegistrationForm({ ...registrationForm, kabupaten_kotamadya: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" placeholder="Auto-isi dari data konsumen" />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tipe Kamera</label>
                                    <input type="text" list="list-tipe-barang" value={registrationForm.tipe_kamera || ''} onChange={e => setRegistrationForm({ ...registrationForm, tipe_kamera: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" />
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Event</label>
                                 <select value={registrationForm.event_name || ''} onChange={e => setRegistrationForm({ ...registrationForm, event_name: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" required>
                                    <option value="">Pilih event...</option>
                                    {events.map(ev => <option key={ev.id} value={ev.event_title}>{ev.event_title}</option>)}
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status Pendaftaran</label>
                                 <select value={registrationForm.status_pendaftaran || 'menunggu_validasi'} onChange={e => setRegistrationForm({ ...registrationForm, status_pendaftaran: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]">
                                    <option value="menunggu_validasi">Menunggu Validasi Pembayaran</option>
                                    <option value="terdaftar">Terdaftar</option>
                                    <option value="ditolak">Ditolak</option>
                                 </select>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Link Bukti Transfer</label>
                                 <input type="url" value={registrationForm.bukti_transfer_url || ''} onChange={e => setRegistrationForm({ ...registrationForm, bukti_transfer_url: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" placeholder="Opsional" />
                              </div>
                           </form>
                        )}

                        {activeTab === 'events' && (
                           <form id="eventForm" onSubmit={handleSaveEvent} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Judul Event</label>
                                    <input type="text" value={eventForm.event_title || ''} onChange={e => setEventForm({ ...eventForm, event_title: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" required />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tanggal Acara</label>
                                    <input type="date" value={idDateToIso(eventForm.event_date)} onChange={e => setEventForm({ ...eventForm, event_date: isoToIdDate(e.target.value) })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" required />
                                    {eventForm.event_date && <p className="text-[10px] text-gray-400 mt-1">Tersimpan sebagai: <span className="font-mono">{eventForm.event_date}</span></p>}
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Speaker</label>
                                    <input type="text" value={eventForm.event_speaker || ''} onChange={e => setEventForm({ ...eventForm, event_speaker: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" placeholder="Nama pembicara / instruktur" />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Genre / Spesialisasi Speaker</label>
                                    <input type="text" value={eventForm.event_speaker_genre || ''} onChange={e => setEventForm({ ...eventForm, event_speaker_genre: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" placeholder="Contoh: Wildlife Photographer" />
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Harga</label>
                                    <input type="text" value={eventForm.event_price || ''} onChange={e => setEventForm({ ...eventForm, event_price: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" required placeholder="Rp 750.000 atau Gratis" />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Tipe Pembayaran</label>
                                    <select value={eventForm.event_payment_tipe || 'regular'} onChange={e => setEventForm({ ...eventForm, event_payment_tipe: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]">
                                       <option value="regular">Regular (Lunas)</option>
                                       <option value="deposit">Deposit</option>
                                       <option value="gratis">Gratis</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Jumlah Deposit</label>
                                    <input type="text" value={eventForm.deposit_amount || ''} onChange={e => setEventForm({ ...eventForm, deposit_amount: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" placeholder="Isi jika tipe deposit" disabled={eventForm.event_payment_tipe !== 'deposit'} />
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Kuota Slot (Peserta)</label>
                                    <input type="number" value={eventForm.event_partisipant_stock || 0} onChange={e => setEventForm({ ...eventForm, event_partisipant_stock: Number(e.target.value) })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" required />
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Status</label>
                                    <select value={eventForm.event_status || 'In stock'} onChange={e => setEventForm({ ...eventForm, event_status: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]">
                                       <option value="In stock">In stock (Available)</option>
                                       <option value="Sold Out">Sold Out</option>
                                       <option value="Close">Close</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Proposal Event</label>
                                    <select value={eventForm.proposal_event_id || ''} onChange={e => setEventForm({ ...eventForm, proposal_event_id: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]">
                                       <option value="">Tanpa proposal</option>
                                       {budgets.map(b => <option key={b.id_budget} value={b.id_budget}>{b.proposal_no} — {b.title}</option>)}
                                    </select>
                                 </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Info Rekening Bank</label>
                                    <input type="text" value={eventForm.bank_info || ''} onChange={e => setEventForm({ ...eventForm, bank_info: e.target.value })} className="w-full p-2 border border-gray-300 rounded text-sm focus:border-[#FFE500]" placeholder="Contoh: BCA 1234567890 a.n Nikon" />
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Foto / Poster Acara</label>
                                 {(eventImageFile || eventForm.event_image) && (
                                    <div className="mb-2 relative w-24 h-32 rounded overflow-hidden border border-gray-100">
                                       <img src={eventImageFile ? URL.createObjectURL(eventImageFile) : gdriveUrl(eventForm.event_image)} alt="preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                       <button type="button" onClick={() => { setEventImageFile(null); setEventForm({ ...eventForm, event_image: '' }); }} className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 py-0.5 leading-tight">✕</button>
                                    </div>
                                 )}
                                 <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setEventImageFile(e.target.files[0]); }} className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all cursor-pointer" />
                                 <p className="text-xs text-gray-400 mt-1">Format: JPG, PNG, WEBP. Rasio 3:4 disarankan.</p>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Screenshot / QR Pembayaran</label>
                                 {(eventPaymentScreenshotFile || eventForm.event_upload_payment_screenshot) && (
                                    <div className="mb-2 relative w-32 h-32 rounded overflow-hidden border border-gray-100">
                                       <img src={eventPaymentScreenshotFile ? URL.createObjectURL(eventPaymentScreenshotFile) : gdriveUrl(eventForm.event_upload_payment_screenshot)} alt="payment qr" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                       <button type="button" onClick={() => { setEventPaymentScreenshotFile(null); setEventForm({ ...eventForm, event_upload_payment_screenshot: '' }); }} className="absolute top-0 right-0 bg-red-500 text-white text-xs px-1 py-0.5 leading-tight">✕</button>
                                    </div>
                                 )}
                                 <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setEventPaymentScreenshotFile(e.target.files[0]); }} className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 transition-all cursor-pointer" />
                                 <p className="text-xs text-gray-400 mt-1">Upload gambar QR atau screenshot info pembayaran (JPG, PNG, WEBP).</p>
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Deskripsi Event</label>
                                 <textarea rows={5} value={eventForm.event_description || ''} onChange={e => setEventForm({ ...eventForm, event_description: e.target.value })} className="w-full p-3 border border-gray-300 rounded text-sm focus:border-[#FFE500]" required placeholder="Masukkan deskripsi acara lengkap..."></textarea>
                              </div>
                           </form>
                        )}

                        {activeTab === 'botsettings' && (
                           <form id="botSettingsForm" onSubmit={handleSaveBotSettings} className="space-y-4">
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nama Pengaturan</label>
                                 <input required type="text" value={botSettingsForm.nama_pengaturan || ''} onChange={e => setBotSettingsForm({ ...botSettingsForm, nama_pengaturan: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Contoh: LINK_SYARAT_KETENTUAN" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">URL / Value</label>
                                 <input type="text" value={botSettingsForm.url_file || ''} onChange={e => setBotSettingsForm({ ...botSettingsForm, url_file: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="https://..." />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Deskripsi</label>
                                 <textarea value={botSettingsForm.description || ''} onChange={e => setBotSettingsForm({ ...botSettingsForm, description: e.target.value })} className="w-full border border-gray-300 bg-white text-gray-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500] h-24" placeholder="Deskripsi atau kegunaan dari pengaturan ini..." />
                              </div>
                           </form>
                        )}
                     </div>
                     <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button onClick={closeModal} className="px-4 py-2 border border-gray-300 bg-white text-gray-900 hover:bg-gray-100 rounded-md text-sm font-bold transition">Batal</button>
                        {/* Logic for form ID */}
                        {(() => { // This IIFE calculates and returns the submit button
                           const formId = (() => {
                              if (activeTab === 'claims') return 'claimForm';
                              if (activeTab === 'warranties') return 'warrantyForm';
                              if (activeTab === 'services') return 'serviceForm';
                              if (activeTab === 'promos') return 'promoForm';
                              if (activeTab === 'konsumen') return 'konsumenForm';
                              if (activeTab === 'userrole') return 'karyawanForm';
                              if (activeTab === 'botsettings') return 'botSettingsForm';
                             if (activeTab === 'events') return 'eventForm';
                             if (activeTab === 'eventregistrations') return 'registrationForm';
                              if (activeTab === 'lending') return 'lendingForm'; // Both 'return' and 'create/edit' use 'lendingForm'
                              return 'budgetForm';
                           })();
                           const submitButtonText = isSubmitting ? 'Memproses...' : modalAction === 'return' ? 'Proses Pengembalian' : 'Simpan Data';
                           const submitButtonOnClick = activeTab === 'lending' && modalAction === 'return' ? () => handleReturnItems(lendingForm as PeminjamanBarang) : undefined;

                           return <button type="submit" form={formId} disabled={isSubmitting} onClick={submitButtonOnClick} className="px-4 py-2 bg-[#FFE500] hover:bg-[#E5CE00] text-black rounded-md text-sm font-bold transition disabled:opacity-50">{submitButtonText}</button>;
                        })()}
                     </div>
                  </div>
               </div>
            )}
         {/* =========================================================
          PRINT AREA (FORMAT PERSIS PDF MKTG)
      ========================================================= */}
         {printData && (
            <div className="flex flex-col absolute top-0 left-0 w-full bg-white text-black font-sans z-[100] min-h-screen pb-10 pt-6" style={{ fontSize: '13px', lineHeight: '1.4' }}>

               {/* PRINT CONTROL BAR */}
               <div className="print:hidden fixed top-4 right-4 flex flex-col gap-3 z-50 bg-white p-3 rounded-lg shadow-xl border border-gray-100">
                  <div className="flex gap-3 justify-end">
                     <button onClick={() => setPrintData(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-md transition text-sm">Kembali</button>
                     <button onClick={handlePrintDocument} className="px-4 py-2 bg-[#FFE500] hover:bg-[#E5CE00] text-black font-bold rounded-md transition shadow-md text-sm flex items-center gap-2">🖨️ Cetak PDF</button>
                  </div>
                  {printData.attachment_urls && printData.attachment_urls.some(u => u) && (
                     <div className="flex items-center gap-2 border-t border-gray-100 pt-2 mt-1">
                        <label className="text-xs font-bold text-gray-600">Ukuran Gambar:</label>
                        <input type="range" min="100" max="800" value={printImageSize} onChange={(e) => setPrintImageSize(Number(e.target.value))} className="w-32 accent-[#FFE500]" />
                        <span className="text-xs font-mono bg-gray-100 px-1 rounded">{printImageSize}px</span>
                     </div>
                  )}
               </div>

               <div className="px-4 max-w-[800px] mx-auto w-full">
                  {/* HEADER */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-5">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-black text-white flex flex-col items-center justify-center font-bold text-[10px] uppercase text-center p-1 leading-none shadow-sm">
                           <span>ALTA</span>
                           <span>NIKINDO</span>
                        </div>
                        <div className="font-extrabold text-2xl tracking-tight leading-tight">
                           BUDGET APPROVAL <br />
                           <span className="font-normal text-sm tracking-normal">(SALES / MARKETING / SERVICE)</span>
                        </div>
                     </div>
                     <div className="border-2 border-black bg-white">
                        <div className="flex border-b border-black">
                           <div className="w-20 p-1 border-r border-black font-bold text-xs bg-gray-50">Section:</div>
                           <div className="w-36 p-1 font-bold text-xs uppercase">{printData.budget_source || 'MARKETING'}</div>
                        </div>
                        <div className="flex">
                           <div className="w-20 p-1 border-r border-black font-bold text-xs bg-gray-50">Page(s):</div>
                           <div className="w-36 p-1 text-xs">1</div>
                        </div>
                     </div>
                  </div>

                  {/* SIGNATURE GRID */}
                  <div className="flex gap-2 mb-5 text-center">
                     <div className="border-2 border-black w-48 flex flex-col bg-white">
                        <div className="border-b-2 border-black p-1.5 font-bold bg-gray-100 text-black text-xs uppercase tracking-wide">Proposed / Prepared by</div>
                        <div className="flex-1 flex flex-col justify-end p-2 relative pt-8">
                           <input type="text" className="w-full text-center outline-none bg-transparent font-bold text-sm z-10" defaultValue={printData.drafter_name || ''} placeholder="Ketik nama..." />
                        </div>
                        <div className="border-t border-black flex text-[10px] divide-x divide-black bg-gray-50 text-black uppercase font-bold">
                           <div className="p-1 w-1/2 text-left">Sign</div>
                           <div className="p-1 w-1/2 text-left">Date:</div>
                        </div>
                     </div>
                     <div className="border-2 border-black flex-1 flex flex-col relative bg-white">
                        <div className="border-b-2 border-black p-1.5 font-bold bg-gray-100 text-black text-xs uppercase tracking-wide">Management Approval</div>
                        <div className="flex-1 flex divide-x divide-black min-h-[60px]">
                           <div className="flex-1 flex flex-col justify-end p-2 relative">
                              <input type="text" className="w-full text-center outline-none bg-transparent font-bold text-xs z-10" defaultValue={printData.mgt_comment_1 || ''} placeholder="Nama Comment 1..." />

                           </div>
                           <div className="flex-1 flex flex-col justify-end p-2 relative">
                              <input type="text" className="w-full text-center outline-none bg-transparent font-bold text-xs z-10" defaultValue={printData.mgt_comment_2 || ''} placeholder="Nama Comment 2..." />

                           </div>
                           <div className="flex-1 flex flex-col justify-end p-2 relative">
                              <input type="text" className="w-full text-center outline-none bg-transparent font-bold text-xs z-10" defaultValue={printData.mgt_consent || ''} placeholder="Nama Consent..." />

                           </div>
                        </div>
                        <div className="border-t border-black flex text-[10px] divide-x divide-black bg-gray-50 text-black uppercase font-bold">
                           <div className="p-1 w-1/3 text-left border-b border-black">Comment</div>
                           <div className="p-1 w-1/3 text-left border-b border-black">Comment</div>
                           <div className="p-1 w-1/3 text-left border-b border-black">Consent</div>
                        </div>
                        <div className="flex text-[10px] divide-x divide-black bg-white">
                           <div className="p-1 w-1/3 text-right">Date:</div>
                           <div className="p-1 w-1/3 text-right">Date:</div>
                           <div className="p-1 w-1/3 text-right">Date:</div>
                        </div>
                     </div>
                     <div className="border-2 border-black w-48 flex flex-col bg-white">
                        <div className="border-b-2 border-black p-1.5 font-bold bg-gray-100 text-black text-xs uppercase tracking-wide">Finance & Accounting</div>
                        <div className="flex-1 flex flex-col justify-end p-2 relative pt-8 min-h-[60px]">
                           <input type="text" className="w-full text-center outline-none bg-transparent font-bold text-xs z-10" defaultValue={printData.finance_consent || ''} placeholder="Ketik nama..." />

                        </div>
                        <div className="border-t border-black text-[10px] p-1 text-left font-bold border-b border-black bg-gray-50 text-black uppercase">Consent</div>
                        <div className="text-[10px] p-1 text-right bg-white uppercase font-bold">Date:</div>
                     </div>
                  </div>

                  {/* MAIN DETAILS */}
                  <div className="border-2 border-black mb-5 bg-white">
                     <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Title</div><div className="p-1.5 flex-1 font-bold uppercase text-sm">{printData.title}</div></div>
                     <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Proposal No.</div><div className="p-1.5 flex-1 font-mono font-bold">{printData.proposal_no}</div></div>
                     <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Period</div><div className="p-1.5 flex-1 font-bold">{printData.period}</div></div>
                     <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Objectives</div><div className="p-1.5 flex-1 whitespace-pre-wrap">{printData.objectives}</div></div>
                     <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Detail of Activity</div><div className="p-1.5 flex-1 whitespace-pre-wrap min-h-[40px]">{printData.detail_activity}</div></div>
                     <div className="flex"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Expected Result</div><div className="p-1.5 flex-1 whitespace-pre-wrap">{printData.expected_result}</div></div>
                  </div>

                  {/* ITEMS TABLE */}
                  <div className="mb-5 flex-1">
                     <table className="w-full border-collapse border-2 border-black text-black bg-white">
                        <thead>
                           <tr className="bg-gray-100 uppercase text-[11px] tracking-wide">
                              <th className="border border-black p-1.5 w-10 text-center font-bold">No</th>
                              <th className="border border-black p-1.5 text-center font-bold">Purpose / Item Description</th>
                              <th className="border border-black p-1.5 w-16 text-center font-bold">Qty</th>
                              <th className="border border-black p-1.5 w-32 text-center font-bold">Cost / Unit</th>
                              <th className="border border-black p-1.5 w-32 text-center font-bold">Petty Cash</th>
                              <th className="border border-black p-1.5 w-32 text-center font-bold">Total Value</th>
                           </tr>
                        </thead>
                        <tbody>
                           {printData.items && printData.items.length > 0 ? (
                              printData.items.map((item, idx) => (
                                 <tr key={idx}>
                                    <td className="border border-black p-1.5 text-center font-medium">{idx + 1}</td>
                                    <td className="border border-black p-1.5 text-left font-medium">{item.purpose}</td>
                                    <td className="border border-black p-1.5 text-center font-medium">{item.qty}</td>
                                    <td className="border border-black p-1.5 text-right font-medium">{Number(item.cost_unit).toLocaleString('id-ID')}</td>
                                    <td className="border border-black p-1.5 text-center bg-gray-50"></td>
                                    <td className="border border-black p-1.5 text-right font-bold">{Number(item.value).toLocaleString('id-ID')}</td>
                                 </tr>
                              ))
                           ) : (
                              <tr><td colSpan={6} className="border border-black py-6 text-center text-gray-500 italic">Tidak ada rincian item</td></tr>
                           )}
                           <tr className="border-t-2 border-black">
                              <td colSpan={3} className="border-l border-b border-black bg-white"></td>
                              <td colSpan={2} className="border border-black p-1.5 text-right font-bold pr-4 bg-gray-100 uppercase text-xs">Subtotal</td>
                              <td className="border border-black p-1.5 text-right font-extrabold bg-gray-100">{Number(printData.total_cost).toLocaleString('id-ID')}</td>
                           </tr>
                           <tr><td colSpan={3} className="border-l border-b border-transparent bg-white"></td>
                              <td colSpan={2} className="border border-black p-1.5 text-right font-extrabold pr-4 bg-gray-200 uppercase text-xs text-black">Grand Total</td>
                              <td className="border border-black p-1.5 text-right font-extrabold bg-gray-200 text-black text-sm">Rp {Number(printData.total_cost).toLocaleString('id-ID')}</td>
                           </tr>
                           <tr><td colSpan={3} className="border-l border-b border-transparent bg-white"></td>
                              <td colSpan={2} className="border-2 border-black p-2 text-right font-bold pr-4 bg-black text-white uppercase text-sm" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>TOTAL COST</td>
                              <td className="border-2 border-black p-1.5 text-right font-bold bg-black text-white text-sm" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Rp {Number(printData.total_cost).toLocaleString('id-ID')}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>

                  {/* ATTACHMENT */}
                  {printData.attachment_urls && printData.attachment_urls.some(u => u) && (
                     <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-400 page-break-inside-avoid">
                        <div className="font-bold text-xs uppercase tracking-wide mb-2">Lampiran (Attachments):</div>
                        <div className="grid grid-cols-2 gap-4">
                           {printData.attachment_urls.map((url, i) => url && (
                              <div key={i} className="flex justify-center w-full border border-gray-300 p-2 bg-gray-50">
                                 <img src={url} alt={`Lampiran ${i + 1}`} className="object-contain drop-shadow-sm" style={{ maxHeight: `${printImageSize}px` }} />
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            </div>
         )}

         {/* --- IMAGE VIEWER MODAL --- */}
         {isImageViewerOpen && (
            <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[150] overflow-hidden"
               onWheel={handleWheel}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}
               onMouseMove={handleMouseMove}>

               <div className="absolute top-4 right-4 z-50 flex gap-3 bg-black/50 p-2 rounded-lg border border-white/10 backdrop-blur-sm shadow-xl">
                  <div className="text-white flex items-center gap-3 px-3 text-sm font-bold">
                     <button onClick={() => setImageScale(p => Math.max(0.1, p - 0.2))} className="hover:text-[#FFE500] text-xl leading-none w-6 h-6 flex items-center justify-center">-</button>
                     <span className="w-10 text-center">{Math.round(imageScale * 100)}%</span>
                     <button onClick={() => setImageScale(p => Math.min(5, p + 0.2))} className="hover:text-[#FFE500] text-xl leading-none w-6 h-6 flex items-center justify-center">+</button>
                     <button onClick={() => { setImageScale(1); setImageTranslate({ x: 0, y: 0 }) }} className="ml-2 hover:text-[#FFE500] text-xs underline text-gray-300">Reset</button>
                  </div>
                  <div className="w-px h-6 bg-white/20"></div>
                  <button onClick={closeImageViewer} className="bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full font-bold flex items-center justify-center shadow-lg transition leading-none text-lg">×</button>
               </div>

               <div className="flex-1 w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing relative overflow-hidden"
                  onMouseDown={handleMouseDown}>
                  {(currentImageUrl.toLowerCase().endsWith('.pdf') || currentImageUrl.startsWith('data:application/pdf')) ? (
                     <iframe src={currentImageUrl} className="w-full h-full border-none bg-white" title="PDF Viewer" />
                  ) : (
                     <img
                        src={currentImageUrl}
                        alt="Viewer"
                        draggable={false}
                        className="max-w-full max-h-full object-contain transition-transform duration-75 ease-out select-none pointer-events-none"
                        style={{
                           transform: `translate(${imageTranslate.x}px, ${imageTranslate.y}px) scale(${imageScale})`,
                        }}
                     />
                  )}
               </div>
               <div className="text-white/50 text-[10px] mb-4 select-none font-medium text-center z-50 pointer-events-none drop-shadow-md">
                  {(currentImageUrl.toLowerCase().endsWith('.pdf') || currentImageUrl.startsWith('data:application/pdf')) ? 'Scroll untuk navigasi PDF' : 'Scroll (Mouse Wheel) untuk Zoom In/Out | Klik dan Tahan (Drag) untuk Menggeser'}
               </div>
            </div>
         )}

         <datalist id="list-tipe-barang">{dynamicOptions.tipeBarang.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-nama-toko">{dynamicOptions.namaToko.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-jenis-promo">{dynamicOptions.jenisPromo.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-jasa-kirim">{dynamicOptions.jasaKirim.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-status-service">{dynamicOptions.statusService.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-nama-barang">{dynamicOptions.tipeBarang.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-roles">{dynamicOptions.roles.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-budget-source">{dynamicOptions.budgetSource.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-catatan-peminjaman">{dynamicOptions.catatanPeminjaman.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-catatan-pengembalian">{dynamicOptions.catatanPengembalian.map(opt => <option key={opt} value={opt} />)}</datalist>

         {/* CONNECTION INDICATOR */}
         <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-lg border text-[10px] font-bold transition-all print:hidden">
            <div className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={dbStatus.connected ? 'text-gray-600' : 'text-red-600'}>
               Database: {dbStatus.message}
            </span>
            {!dbStatus.connected && (
               <button onClick={() => window.location.reload()} className="ml-1 text-blue-600 hover:underline">Refresh</button>
            )}
         </div>

      </>
   );
}
