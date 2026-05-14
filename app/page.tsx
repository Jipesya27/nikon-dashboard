'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';
import Link from 'next/link';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { chatbotTexts } from './chatbotTexts';
import { Karyawan, KonsumenData, RiwayatPesan, ClaimPromo, Garansi, Promosi, PengaturanBot, StatusService, BudgetApproval, BudgetItem, EventData, EventRegistration, PeminjamanBarang } from './index';
import Header from './Header';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-key-to-prevent-error'; // Akan diisi via .env.local
const supabase = createClient(supabaseUrl, supabaseKey);

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
function getEventClosedStatus(evt: { status: string; stock: number; date: string }, regCount: number): { closed: boolean; reason: string } {
   if (evt.status === 'close') return { closed: true, reason: 'Ditutup Admin' };
   if (evt.stock > 0 && regCount >= evt.stock) return { closed: true, reason: 'Kuota Penuh' };
   const evtDate = parseIdDate(evt.date);
   if (evtDate && evtDate < new Date()) return { closed: true, reason: 'Acara Selesai' };
   return { closed: false, reason: 'Aktif' };
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

export default function NikonDashboard() {
   // LOGIN & FORGOT PASSWORD STATES
   const [currentUser, setCurrentUser] = useState<Karyawan | null>(() => {
      if (typeof window === 'undefined') return null;
      try {
         const savedSession = localStorage.getItem('nikon_karyawan');
         return savedSession ? JSON.parse(savedSession) : null;
      } catch {
         return null;
      }
   });
   const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);
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

   const getClaimStatusColor = useCallback((c: ClaimPromo) => {
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
   }, []);

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
   const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
   const [readStatus, setReadStatus] = useState<Record<string, string>>(() => {
      if (typeof window !== 'undefined') {
         try {
            const savedStatus = localStorage.getItem('nikon_chat_read_status');
            if (savedStatus) return JSON.parse(savedStatus);
         } catch {}
      }
      return {};
   });
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState('dashboard');
   const [returnTab, setReturnTab] = useState<string | null>(null);
   const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: new Date().toISOString().split('T')[0] });

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
   const [registrationForm, setRegistrationForm] = useState<Partial<EventRegistration>>({});

   // IMPORT CSV STATES
   const [importTarget, setImportTarget] = useState<'claim_promo' | 'garansi' | 'konsumen' | 'status_service'>('claim_promo');

   // SPECIAL STATES
   const [printData, setPrintData] = useState<BudgetApproval | null>(null);
   const [isSubmitting, setIsSubmitting] = useState(false);

   // IMAGE VIEWER STATES

   const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
   const [currentImageUrl, setCurrentImageUrl] = useState('');
   const [imageScale, setImageScale] = useState(1);
   const [imageTranslate, setImageTranslate] = useState({ x: 0, y: 0 });
   const [isDragging, setIsDragging] = useState(false);
   const [startDragPosition, setStartDragPosition] = useState({ x: 0, y: 0 });

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
      localStorage.setItem('nikon_chat_read_status', JSON.stringify(readStatus));
   }, [readStatus]);
   useEffect(() => {
      if (selectedWa && messages.length > 0) {
         const contactMessages = messages.filter(m => m.nomor_wa === selectedWa);
         if (contactMessages.length > 0) {
            const latestTime = contactMessages[0].waktu_pesan || contactMessages[0].created_at;
            if (latestTime) {
               // eslint-disable-next-line react-hooks/set-state-in-effect
               setReadStatus(prev => {
                  const currentSaved = prev[selectedWa];
                  // Update only if we have a newer message
                  if (!currentSaved || new Date(latestTime) > new Date(currentSaved)) {
                     return { ...prev, [selectedWa]: latestTime as string };
                  }
                  return prev;
               });
            }
         }
      }
   }, [selectedWa, messages]);

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
         const { error } = await supabase.from('event_registrations').update({ is_attended: true }).eq('id', id);
         if (error) throw error;
         alert('✅ Kehadiran Berhasil Dikonfirmasi!');
         fetchEventRegistrations();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal konfirmasi kehadiran: ' + message);
      }
   }, [fetchEventRegistrations]);

   useEffect(() => {
      if (isScannerOpen) {
         const scanner = new Html5QrcodeScanner('reader', { qrbox: { width: 250, height: 250 }, fps: 5 }, false);
         scanner.render(
            async (decodedText) => {
               scanner.clear();
               setIsScannerOpen(false);
               await handleMarkAttendance(decodedText);
            },
            () => { /* ignore */ }
         );
         return () => { scanner.clear(); };
      }
   }, [isScannerOpen, handleMarkAttendance]);

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
   
   useEffect(() => {
      if (!isLoggedIn) return;

      const fetchAllData = async () => {
         setLoading(true);
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
               fetchBotSettings(),
               fetchEvents(),
               fetchEventRegistrations(),
            ];
            if (currentUser?.role === 'Admin') {
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
            if (!supabaseKey || supabaseKey === 'dummy-key-to-prevent-error') {
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

      const subscription = supabase.channel('messages-channel')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_pesan' }, (payload) => {
            if (payload.eventType === 'INSERT') setMessages(prev => [payload.new as RiwayatPesan, ...prev]);
         }).subscribe();

      return () => { subscription.unsubscribe(); };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isLoggedIn, dateRange, currentUser?.role]);
   
   // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

            const msg = chatbotTexts.forgotPassword(data.nama_karyawan, tempPw);
            await sendWhatsAppMessageViaFonnte(data.nomor_wa!, msg);

            setForgotPwMessage('Password baru telah dikirim ke WhatsApp Anda!');
         } else {
            setForgotPwMessage('Nomor WhatsApp tidak terdaftar!');
         }
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         setForgotPwMessage('Gagal memproses reset password: ' + message);
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleLogout = () => {
      localStorage.removeItem('nikon_karyawan');
      setIsLoggedIn(false);
      setCurrentUser(null);
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

            const { error } = await supabase.from(importTarget).upsert(result);
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
      return `MKTG/BA${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
   };

   const openModal = (action: 'create' | 'edit' | 'reset_pw' | 'return', type: 'claim' | 'warranty' | 'promo' | 'service' | 'budget' | 'karyawan' | 'lending' | 'konsumen' | 'botsettings' | 'event' | 'eventregistration', item?: ClaimPromo | Garansi | Promosi | StatusService | BudgetApproval | Karyawan | PeminjamanBarang | KonsumenData | PengaturanBot | EventData | EventRegistration) => {
      setModalAction(action);
      if (type === 'claim') {
         setClaimForm((item as ClaimPromo) || { validasi_by_mkt: 'Dalam Proses Verifikasi', validasi_by_fa: 'Dalam Proses Verifikasi' });
         setEditingId((item as ClaimPromo)?.id_claim || null);
         // Reset konsumen extra fields - akan auto-fill saat WA onBlur
         setKonsumenForm({});
         // Kalau edit, auto-fetch konsumen utk prefill konsumen section
         const itemAsClaim = item as ClaimPromo | undefined;
         if (itemAsClaim?.nomor_wa) {
            supabase.from('konsumen').select('*').eq('nomor_wa', itemAsClaim.nomor_wa).maybeSingle().then(({ data: kon }) => {
               if (kon) {
                  const clean = (v: string | null) => (!v || v === 'BELUM_DIISI') ? '' : v;
                  setKonsumenForm({
                     nomor_wa: kon.nomor_wa,
                     nama_lengkap: kon.nama_lengkap || '',
                     nik: clean(kon.nik),
                     alamat_rumah: clean(kon.alamat_rumah),
                     kelurahan: clean(kon.kelurahan),
                     kecamatan: clean(kon.kecamatan),
                     kabupaten_kotamadya: clean(kon.kabupaten_kotamadya),
                     provinsi: clean(kon.provinsi),
                     kodepos: clean(kon.kodepos),
                     status_langkah: kon.status_langkah,
                     id_konsumen: kon.id_konsumen,
                     created_at: kon.created_at,
                  });
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
      setEventForm({ status: 'aktif', stock: 0 });
      setRegistrationForm({ status: 'Pending Payment' });
      setEventImageFile(null);
      setEditingId(null);
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
            await supabase.from('konsumen').insert([konsumenForm]);
         } else {
            await supabase.from('konsumen').update(konsumenForm).eq('nomor_wa', editingId);
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
            const optFields = ['nik', 'alamat_rumah', 'kelurahan', 'kecamatan', 'kabupaten_kotamadya', 'provinsi', 'kodepos'] as const;
            optFields.forEach(f => {
               if (konsumenForm[f]) konsumenPayload[f] = konsumenForm[f];
            });
            // Cek apakah konsumen sudah ada
            const { data: existKon } = await supabase.from('konsumen').select('nomor_wa, id_konsumen').eq('nomor_wa', claimForm.nomor_wa).maybeSingle();
            if (existKon) {
               // Update field non-null saja (jangan timpa data yang sudah ada dgn null)
               const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
               Object.entries(konsumenPayload).forEach(([k, v]) => {
                  if (v && k !== 'nomor_wa') updatePayload[k] = v;
               });
               await supabase.from('konsumen').update(updatePayload).eq('nomor_wa', claimForm.nomor_wa);
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
               await supabase.from('konsumen').insert([fullPayload]);
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

         if (modalAction === 'create') await supabase.from('garansi').insert([dataToSave]);
         else await supabase.from('garansi').update(dataToSave).eq('id_garansi', editingId);

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
         if (modalAction === 'create') await supabase.from('promosi').insert([promoForm]);
         else await supabase.from('promosi').update(promoForm).eq('id_promo', editingId);
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
         if (modalAction === 'create') await supabase.from('status_service').insert([serviceForm]);
         else await supabase.from('status_service').update(serviceForm).eq('id_service', editingId);
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
         const { data: original } = await supabase.from('budget_approval').select('attachment_urls').eq('id_budget', editingId).single();
         const finalUrls = [...(budgetForm.attachment_urls || [])];

         for (let i = 0; i < finalUrls.length; i++) {
            const item = finalUrls[i];
            if (item instanceof File) {
               const uploadedUrl = await uploadFileToStorage(item, 'BudgetApproval', budgetForm.proposal_no || 'UNKN');
               // Hapus yang lama jika ada
               if (original?.attachment_urls?.[i]) await deleteFileFromStorage(original.attachment_urls[i] as string);
               finalUrls[i] = uploadedUrl;
            } else if (item === null && original?.attachment_urls?.[i]) {
               await deleteFileFromStorage(original.attachment_urls[i] as string);
            }
         }

         const dataToSave = { ...budgetForm, attachment_urls: finalUrls };
         if (modalAction === 'create') await supabase.from('budget_approval').insert([dataToSave]);
         else await supabase.from('budget_approval').update(dataToSave).eq('id_budget', editingId);

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
            await supabase.from('karyawan').insert([{ ...karyawanForm, password: passwordToUse }]);

            const msg = chatbotTexts.newKaryawan(karyawanForm.nama_karyawan!, karyawanForm.username!, passwordToUse);
            await sendWhatsAppMessageViaFonnte(karyawanForm.nomor_wa, msg);
         } else {
            const updateData = { ...karyawanForm };
            if (!updateData.password) delete updateData.password;
            await supabase.from('karyawan').update(updateData).eq('id_karyawan', editingId);

            if (updateData.password && karyawanForm.nomor_wa) {
               const msg = chatbotTexts.updatePasswordAdmin(karyawanForm.nama_karyawan!, updateData.password);
               await sendWhatsAppMessageViaFonnte(karyawanForm.nomor_wa, msg);
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
         await supabase.from('karyawan').update({ password: karyawanForm.password }).eq('id_karyawan', editingId);

         if (karyawanForm.nomor_wa) {
            const msg = chatbotTexts.resetPasswordAdmin(karyawanForm.nama_karyawan!, karyawanForm.password!);
            await sendWhatsAppMessageViaFonnte(karyawanForm.nomor_wa, msg);
         }

         alert(`Password untuk ${karyawanForm.username} berhasil di-reset dan dikirim via WA!`);
         fetchKaryawans(); closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal: ' + message);
      } finally {
         setIsSubmitting(false); }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
   const handleSaveLending = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         // 1. Pastikan konsumen ada atau buat baru
         const { error: consumerError } = await supabase.from('konsumen').select('nomor_wa').eq('nomor_wa', lendingForm.nomor_wa_peminjam!).single();
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
               if (originalLending?.link_ktp_peminjam) await deleteFileFromStorage(originalLending.link_ktp_peminjam as string);
            }
         } else if (modalAction === 'edit' && editingId && lendingForm.link_ktp_peminjam === null) {
            // Jika link_ktp_peminjam diatur null, hapus file lama dari storage
            const { data: originalLending } = await supabase.from('peminjaman_barang').select('link_ktp_peminjam').eq('id_peminjaman', editingId).single();
            if (originalLending?.link_ktp_peminjam) await deleteFileFromStorage(originalLending.link_ktp_peminjam as string);
         }

         const dataToSave: Partial<PeminjamanBarang> = { ...lendingForm, link_ktp_peminjam: ktpUrl };
         if (modalAction === 'create') {
            dataToSave.tanggal_peminjaman = new Date().toISOString();
            dataToSave.status_peminjaman = 'aktif';
         }
         // Saat edit, kalau tanggal estimasi diubah, reset reminder_sent_at agar reminder bisa dikirim ulang
         if (modalAction === 'edit' && editingId) {
            const { data: prev } = await supabase.from('peminjaman_barang').select('tanggal_estimasi_pengembalian').eq('id_peminjaman', editingId).single();
            if (prev && prev.tanggal_estimasi_pengembalian !== lendingForm.tanggal_estimasi_pengembalian) {
               dataToSave.reminder_sent_at = null;
            }
         }
         if (modalAction === 'create') await supabase.from('peminjaman_barang').insert([dataToSave]);
         else await supabase.from('peminjaman_barang').update(dataToSave).eq('id_peminjaman', editingId);

         // 3. Send WhatsApp message
         let message = chatbotTexts.lendingInitHeader(lendingForm.nama_peminjam!);
         lendingForm.items_dipinjam?.forEach((item, idx) => {
            message += chatbotTexts.lendingInitItem(idx, item.nama_barang, item.nomor_seri, item.catatan || '');
         });
         // The initial message for lending doesn't need return notes.
         message += chatbotTexts.lendingInitFooter();
         await sendWhatsAppMessageViaFonnte(lendingForm.nomor_wa_peminjam!, message);

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
            const { error } = await supabase.from('event_registrations').insert([payload]);
            if (error) throw error;
         } else {
            const { error } = await supabase.from('event_registrations').update(payload).eq('id', editingId);
            if (error) throw error;
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
         };
         if (eventImageFile) {
            const imageUrl = await uploadFileToStorage(eventImageFile, 'EventPoster', String(payload.event_title || 'poster').replace(/\s+/g, '_'));
            payload.event_image = imageUrl;
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
            await supabase.from('pengaturan_bot').insert([botSettingsForm]);
         } else {
            await supabase.from('pengaturan_bot').update(botSettingsForm).eq('id', editingId);
         }
         fetchBotSettings();
         closeModal();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal menyimpan pengaturan bot: ' + message);
      } finally {
         setIsSubmitting(false); }
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
      const msg = chatbotTexts.statusClaim(c.nomor_seri, c.tipe_barang, c.validasi_by_mkt, c.validasi_by_fa, c.nama_jasa_pengiriman || '-', c.nomor_resi || '-', c.catatan_mkt || '');
      await sendWhatsAppMessageViaFonnte(c.nomor_wa, msg);
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: c.nomor_wa, nama_profil_wa: getRealProfileName(c.nomor_wa), arah_pesan: 'OUT', isi_pesan: msg, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      alert('Pesan status berhasil dikirim!');
      fetchMessages();
   };

   const handleKirimStatusGaransi = async (w: Garansi) => {
      const linked = claims.find(c => c.nomor_seri === w.nomor_seri);
      if (!linked || !linked.nomor_wa) return alert('Gagal: Tidak dapat menemukan Nomor WA (Barang ini tidak ada di tabel Claim Promo).');
      if (!window.confirm('Kirim status garansi ke WA konsumen?')) return;
      const msg = chatbotTexts.statusGaransi(w.nomor_seri, w.tipe_barang, w.jenis_garansi, w.lama_garansi, calculateSisaGaransi(linked.tanggal_pembelian, w.lama_garansi));
      await sendWhatsAppMessageViaFonnte(linked.nomor_wa, msg);
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: linked.nomor_wa, nama_profil_wa: getRealProfileName(linked.nomor_wa), arah_pesan: 'OUT', isi_pesan: msg, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      alert('Pesan status berhasil dikirim!');
      fetchMessages();
   };

   const handleSendEventSuccessWA = async (reg: EventRegistration) => {
      if (!window.confirm(`Kirim notifikasi konfirmasi pembayaran ke ${reg.full_name}?`)) return;
      
      const namaReg = reg.full_name || reg.nama_lengkap || '';
      const waReg = reg.wa_number || reg.nomor_wa || '';
      const message = `Halo *${namaReg}*,\n\nPembayaran Anda untuk event *${reg.event_name}* telah kami validasi. ✅\n\nSilakan simpan pesan ini sebagai bukti pendaftaran resmi. Sampai jumpa di lokasi acara!\n\nSalam,\nNikon Indonesia`;

      try {
         await sendWhatsAppMessageViaFonnte(waReg, message);
         await supabase.from('riwayat_pesan').insert([{
            nomor_wa: waReg,
            nama_profil_wa: namaReg,
            arah_pesan: 'OUT', 
            isi_pesan: message, 
            waktu_pesan: new Date().toISOString(), 
            bicara_dengan_cs: false 
         }]);
         alert('Notifikasi berhasil dikirim!');
         fetchMessages();
      } catch (err: unknown) {
         const message = err instanceof Error ? err.message : String(err);
         alert('Gagal mengirim pesan: ' + message);
      }
   };

   const handleSelesaiCS = async (nomor_wa: string) => {
      try {
         await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', nomor_wa);
         await supabase.from('konsumen').update({ status_langkah: 'START' }).eq('nomor_wa', nomor_wa);
         fetchMessages();
      } catch (error: unknown) {
         const message = error instanceof Error ? error.message : String(error);
         console.error('Gagal update CS:', message);
      }
   };

   // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
            let message = chatbotTexts.lendingReturnHeader(lending.nama_peminjam);
            returnedItems.forEach((item, idx) => {
               message += chatbotTexts.lendingReturnItem(idx, item.nama_barang, item.nomor_seri, item.catatan_pengembalian || '');
            });
            message += chatbotTexts.lendingReturnFooter();
            await sendWhatsAppMessageViaFonnte(lending.nomor_wa_peminjam, message);
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
   }, [filteredPromos, sortConfigPromos, consumers, getSortFunction]);
   
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
   }), [claims, searchClaim, filterStatusWarna, consumers, getNamaPromo, getClaimStatusColor]); // Keep filteredClaims for search

   const sortedClaims = useMemo(() => {
      const sortableItems = [...filteredClaims];
      return sortableItems.sort(getSortFunction(sortConfigClaims, consumers));
   }, [filteredClaims, sortConfigClaims, consumers, getSortFunction]);

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
      const search = searchLending.toLowerCase();
      return name.includes(search) || wa.includes(search) || status.includes(search) || items.includes(search);
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
            { id: 'messages', label: '💬 Pesan', count: messages.length },
            { id: 'konsumen', label: '👥 Konsumen', count: consumersList.length },
         ]
      },
      {
         category: 'Operasional',
         tabs: [
            { id: 'promos', label: '📢 Promo', count: promos.length },
            { id: 'claims', label: '🎫 Claim', count: claims.length },
            { id: 'warranties', label: '🛡️ Garansi', count: warranties.length },
            { id: 'services', label: '🔧 Service', count: services.length },
            { id: 'lending', label: '📦 Peminjaman', count: lendingRecords.length },
         ]
      },
      {
         category: 'Event',
         tabs: [
            { id: 'events', label: '📅 Master Event', count: events.length },
            { id: 'eventregistrations', label: '👥 Data Peserta', count: eventRegistrations.length },
            { id: 'budgets', label: '💳 Proposal Event', count: budgets.length },
         ]
      },
      {
         category: 'Manajemen',
         tabs: [
            { id: 'import', label: '📤 Import Data', count: undefined },
            { id: 'userrole', label: '🔐 User Role', count: karyawans.length },
            { id: 'botsettings', label: '⚙️ Bot Settings', count: botSettings.length },
         ]
      }
   ], [messages.length, consumersList.length, promos.length, claims.length, warranties.length, services.length, budgets.length, lendingRecords.length, karyawans.length, botSettings.length, events.length, eventRegistrations.length]);

   const groupedVisibleTabs = useMemo(() => {
      return ALL_TABS_GROUPED.map(group => ({
         ...group,
         tabs: group.tabs.filter(tab => {
            if (currentUser?.role === 'Admin') return true;
            if (tab.id === 'userrole') return false;
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

   if (loading) return <div className="flex justify-center items-center h-screen bg-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

   return (
      <>
         <div className={`min-h-screen bg-gray-50 flex flex-col relative text-gray-900 ${printData ? 'hidden print:hidden' : 'print:hidden'}`}>

               <Header
                  sidebarOpen={sidebarOpen}
                  setSidebarOpen={setSidebarOpen}
                  currentUser={currentUser}
                  handleLogout={handleLogout}
               />

            <div className="flex flex-1 overflow-hidden relative">
               {/* MOBILE OVERLAY */}
               {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

               {/* SIDEBAR NAVIGATION */}
               <div className={`fixed md:relative z-20 md:z-auto top-0 left-0 h-full w-64 bg-white border-r border-gray-200 shadow-sm overflow-y-auto transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                  <div className="p-2 pt-20 md:pt-4">
                     {groupedVisibleTabs.map(group => (
                        <div key={group.category} className="mb-4">
                           <h3 className="px-4 pt-2 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider">{group.category}</h3>
                           <div className="space-y-1">
                              {group.tabs.map(tab => (
                                 <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-between group ${activeTab === tab.id ? 'bg-[#FFE500] text-black shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}>
                                    <span>{tab.label}</span>
                                    {tab.count !== undefined && <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${activeTab === tab.id ? 'bg-black/20' : 'bg-gray-200 text-gray-600'}`}>{tab.count}</span>}
                                 </button>
                              ))}
                           </div>
                        </div>
                     ))}

                     {/* ===== HALAMAN EKSTERNAL ===== */}
                     <div className="mb-4 mt-2 pt-3 border-t border-gray-200">
                        <h3 className="px-4 pt-2 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                           Halaman Lain
                        </h3>
                        <div className="space-y-1">
                           <Link href="/admin/events" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)} className="w-full text-left px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-gray-700 hover:bg-gray-100 group">
                              <span>📅 Admin Events</span>
                              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                           </Link>
                           <Link href="/admin/events/attendance" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)} className="w-full text-left px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-gray-700 hover:bg-gray-100 group">
                              <span>📋 Kehadiran Event</span>
                              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                           </Link>
                           <Link href="/admin/events/deposit" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)} className="w-full text-left px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-gray-700 hover:bg-gray-100 group">
                              <span>💰 Deposit & Refund</span>
                              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                           </Link>
                           <Link href="/claim" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)} className="w-full text-left px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-gray-700 hover:bg-gray-100 group">
                              <span>🎫 Form Claim (Publik)</span>
                              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                           </Link>
                           <Link href="/garansi" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)} className="w-full text-left px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-gray-700 hover:bg-gray-100 group">
                              <span>🛡️ Form Garansi (Publik)</span>
                              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                           </Link>
                           <Link href="/events/register" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)} className="w-full text-left px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-gray-700 hover:bg-gray-100 group">
                              <span>🎟️ Daftar Event (Publik)</span>
                              <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                           </Link>
                           {currentUser?.role === 'Admin' && (
                              <Link href="/admin/google-auth" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)} className="w-full text-left px-4 py-2.5 rounded-lg font-semibold transition-all text-sm flex items-center justify-between text-gray-700 hover:bg-gray-100 group">
                                 <span>🔐 Google Drive Auth</span>
                                 <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                              </Link>
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               {/* MAIN CONTENT */}
               <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8 space-y-6">

               {/* ======================= DASHBOARD OVERVIEW ======================= */}
               {activeTab === 'dashboard' && (
                  <div className="animate-fade-in space-y-6">
                     {/* WELCOME CARD */}
                     <div className="bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-8 text-white shadow-lg border border-gray-700">
                        <div className="flex justify-between items-start">
                           <div>
                              <h2 className="text-3xl font-bold mb-2">Selamat Datang Kembali! 👋</h2>
                              <p className="text-gray-300">Anda login sebagai <span className="font-bold text-[#FFE500]">{currentUser?.nama_karyawan}</span> ({currentUser?.role})</p>
                              <p className="text-gray-400 text-sm mt-2">Dashboard diperbarui untuk pengalaman yang lebih baik</p>
                           </div>
                           <div className="shadow-lg rounded-lg overflow-hidden">
                              <Image src="/nikon-logo.svg" alt="Nikon" width={150} height={64} className="h-16 w-auto" />
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
                           <li>Kolom ID adalah kunci utama. Jika ingin mengupdate data lama, sertakan ID aslinya.</li>
                           <li>Sistem secara otomatis akan mengisi <b>created_at</b>, <b>updated_at</b>, dan men-generate ID unik jika tidak diisi.</li>
                           <li>Gunakan aplikasi Excel atau Google Sheets untuk mengedit file template, lalu &quot;Save As&quot; sebagai CSV.</li>
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
                              <label className="text-sm font-bold">Dari: <input aria-label="Dari Tanggal" type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="ml-2 border border-gray-300 bg-white text-gray-900 rounded p-1 outline-none focus:border-[#FFE500]" /></label>
                              <label className="text-sm font-bold">Sampai: <input aria-label="Sampai Tanggal" type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="ml-2 border border-gray-300 bg-white text-gray-900 rounded p-1 outline-none focus:border-[#FFE500]" /></label>
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
                       {activeTab === 'eventregistrations' && <button onClick={() => setIsScannerOpen(true)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">📷 Scan QR Kehadiran</button>}
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
                     <div className={`w-full md:w-90 lg:w-105 border-r border-gray-100 flex flex-col bg-white shrink-0 ${selectedWa ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-5 bg-linear-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center shrink-0">
                           <h3 className="font-bold text-lg flex items-center gap-2">💬 Pesan</h3>
                           <button onClick={handleRunCleanup} disabled={isSubmitting} className="ml-auto mr-3 p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Bersihkan Sesi Inaktif" aria-label="Bersihkan Sesi Inaktif">
                              {isSubmitting ? '⏳' : '🧹'}
                           </button>
                           <button onClick={() => setIsNewChatModalOpen(true)} aria-label="Pesan Baru" className="w-10 h-10 flex items-center justify-center bg-[#FFE500] text-black rounded-lg shadow-md hover:bg-[#E5CE00] transition-all transform hover:scale-110">
                              <span className="text-xl font-bold">+</span>
                           </button>
                        </div>
                        <div className="p-4 bg-white shrink-0">
                           <div className="relative">
                              <input type="text" title="Cari chat" aria-label="Cari chat" placeholder="Cari chat..." value={searchChat} onChange={e => setSearchChat(e.target.value)} className="w-full border border-gray-200 bg-gray-50 rounded-lg px-10 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#FFE500] focus:border-transparent transition" />
                              <span className="absolute left-3 top-3 text-gray-400">🔍</span>
                           </div>
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
                           {filteredContacts.map((c: RiwayatPesan) => {
                              const isNew = c.arah_pesan === 'IN' && (!readStatus[c.nomor_wa] || new Date(c.waktu_pesan || c.created_at!) > new Date(readStatus[c.nomor_wa]));
                              const profileName = getRealProfileName(c.nomor_wa);
                              return (
                                 <div key={c.nomor_wa} onClick={() => setSelectedWa(c.nomor_wa)} className={`flex items-center gap-3 p-4 cursor-pointer transition-all hover:bg-gray-50 ${selectedWa === c.nomor_wa ? 'bg-yellow-50 border-l-4 border-[#FFE500]' : ''}`}>
                                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-[#FFE500] to-yellow-400 shrink-0 flex items-center justify-center font-bold text-black text-lg border border-yellow-200 uppercase shadow-sm">
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
                                    <button aria-label="Kembali" onClick={() => setSelectedWa(null)} className="md:hidden p-1 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full transition">
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
                              <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-3 relative scroll-smooth bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-size-[400px] bg-repeat">
                                 {currentChatThread.map((msg: RiwayatPesan, index: number) => (
                                    <div key={msg.id_pesan || index} className={`group flex ${msg.arah_pesan === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                                       <div className={`max-w-[85%] md:max-w-[70%] p-2.5 text-sm rounded-lg shadow-sm relative ${msg.arah_pesan === 'OUT' ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'}`}>
                                          <button
                                             onClick={() => setReplyToMessage(msg)}
                                             className={`absolute top-1 ${msg.arah_pesan === 'OUT' ? '-left-8' : '-right-8'} opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200`}
                                             title="Balas" aria-label="Balas"
                                          >
                                             <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a5 5 0 015 5v6M3 10l6 6M3 10l6-6" /></svg>
                                          </button>
                                          {isImageUrl(msg.isi_pesan) ? (
                                             <div className="cursor-pointer relative w-64 h-64" onClick={() => openImageViewer(msg.isi_pesan)}>
                                                <Image src={msg.isi_pesan} alt="Media" layout="fill" className="rounded-md object-cover mb-1" onLoadingComplete={scrollToBottom} />
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
                                       <button aria-label="Tutup Balasan" onClick={() => setReplyToMessage(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                       </button>
                                    </div>
                                 )}
                                 <form onSubmit={handleSendReply} className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 items-center">
                                    <div className="flex-1 relative">
                                       <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Ketik pesan..." className="w-full border-none bg-white text-gray-900 rounded-full px-5 py-2.5 text-sm outline-none shadow-inner focus:ring-2 focus:ring-[#FFE500]" />
                                    </div>
                                    <button type="submit" disabled={!replyText.trim()} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 transition shadow-md" aria-label="Kirim">
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
                        <div className="relative flex-1 min-w-[200px]">
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
                           <div className="text-5xl mb-3">{searchKonsumen ? '🔍' : '👥'}</div>
                           <p className="text-gray-900 font-bold mb-1">{searchKonsumen ? 'Tidak ada konsumen ditemukan' : 'Belum ada konsumen'}</p>
                           <p className="text-sm text-gray-700">{searchKonsumen ? 'Coba ubah kata kunci pencarian.' : 'Klik tombol "+ Tambah Konsumen" untuk menambah konsumen baru.'}</p>
                        </div>
                     )}

                     {/* TABLE VIEW */}
                     {viewMode === 'table' && sortedConsumers.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-gray-50 border-b-2 border-gray-200 sticky top-0 z-10 shadow-sm">
                                 <tr>
                                    <th className="px-4 py-3 text-center font-bold text-gray-900 w-12">#</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-900 cursor-pointer" onClick={() => handleSort(sortConfigKonsumen, setSortConfigKonsumen, 'nama_lengkap')}>Konsumen {sortConfigKonsumen.column === 'nama_lengkap' && (<span>{sortConfigKonsumen.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-900">Kontak</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-900">Alamat</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-900">NIK</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-900">Claim</th>
                                    <th className="px-4 py-3 text-left font-bold text-gray-900">Aksi</th>
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
                                                <div className={`w-9 h-9 rounded-full ${colorFor(k.nama_lengkap || '?')} text-white font-bold text-sm flex items-center justify-center shrink-0`}>{initials(k.nama_lengkap || '?')}</div>
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
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-bold">
                                                   {userClaims.length} claim
                                                </span>
                                             ) : (
                                                <span className="text-gray-500 italic text-xs">-</span>
                                             )}
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
                                          <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur text-white font-bold flex items-center justify-center text-lg shrink-0">{initials(k.nama_lengkap || '?')}</div>
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
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-[11px] font-bold">
                                                   ✓ {userClaims.length} claim
                                                </span>
                                             ) : (
                                                <span className="text-gray-500 italic text-[11px]">Belum ada claim</span>
                                             )}
                                          </div>
                                          <div className="flex gap-2">
                                             <button onClick={() => openModal('edit', 'konsumen', k)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                             <button onClick={() => handleDelete('konsumen', k.nomor_wa)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
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
                     <input type="text" title="Cari Promo" aria-label="Cari Promo" placeholder="🔍 Cari Nama Promo atau Periode Tanggal..." value={searchPromo} onChange={e => setSearchPromo(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
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
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
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
                        <input type="text" title="Cari Claim" aria-label="Cari Claim" placeholder="🔍 Cari Nama / No Seri / Promo / Status..." value={searchClaim} onChange={e => setSearchClaim(e.target.value)} className="flex-1 p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                        <select id="status-warna-filter" aria-label="Filter Status Warna" value={filterStatusWarna} onChange={e => setFilterStatusWarna(e.target.value)} className="p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium md:w-48">
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
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
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
                                       <td className="px-4 py-3 text-xs font-bold whitespace-normal max-w-37.5">{c.validasi_by_mkt} / {c.validasi_by_fa}</td>
                                       <td className="px-4 py-3 text-xs text-gray-700 whitespace-normal max-w-50">{c.catatan_mkt || '-'}</td>
                                       <td className="px-4 py-3">
                                          <div className="flex gap-3 items-center flex-wrap min-w-50">
                                             <div className="flex items-center gap-2">
                                                <button onClick={() => handlePrintLabelPengiriman(c, claimNumberMap.get(c.id_claim!))} className="text-blue-600 text-xs font-bold hover:underline">Print Label</button>
                                                <label className="flex items-center gap-1.5 cursor-pointer">
                                                   <input
                                                      type="checkbox"
                                                      title="Tandai Sudah Print"
                                                      aria-label="Tandai Sudah Print"
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
                                             title="Tandai Sudah Print"
                                             aria-label="Tandai Sudah Print"
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
                     <input type="text" title="Cari Garansi" aria-label="Cari Garansi" placeholder="🔍 Cari Nomor Seri..." value={searchGaransi} onChange={e => setSearchGaransi(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
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
                                                      <span className="bg-blue-100 text-blue-700 px-1 rounded-xs text-[9px] font-black uppercase">Claim</span>
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
                                                      <span className="bg-blue-100 text-blue-700 px-1 rounded-xs text-[9px] font-black uppercase">Claim</span>
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
                     <input type="text" title="Cari Service" aria-label="Cari Service" placeholder="🔍 Cari No Tanda Terima / No Seri / Status..." value={searchService} onChange={e => setSearchService(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
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
                     <input type="text" title="Cari Proposal" aria-label="Cari Proposal" placeholder="🔍 Cari Title Proposal..." value={searchBudget} onChange={e => setSearchBudget(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'proposal_no')}>Proposal No {sortConfigBudgets.column === 'proposal_no' && (<span>{sortConfigBudgets.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'title')}>Title {sortConfigBudgets.column === 'title' && (<span>{sortConfigBudgets.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'period')}>Period {sortConfigBudgets.column === 'period' && (<span>{sortConfigBudgets.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigBudgets, setSortConfigBudgets, 'total_cost')}>Total Cost {sortConfigBudgets.column === 'total_cost' && (<span>{sortConfigBudgets.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-6 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedBudgets.map((b: BudgetApproval) => (
                                    <tr key={b.id_budget} className="hover:bg-gray-50 font-medium">
                                       <td className="px-6 py-3 font-mono font-bold text-slate-800">{b.proposal_no}</td>
                                       <td className="px-6 py-3">{b.title}</td>
                                       <td className="px-6 py-3">{b.period}</td>
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
                        <input type="text" title="Cari Peminjaman" aria-label="Cari Peminjaman" placeholder="🔍 Cari Nama Peminjam / No WA / Nama Barang / No Seri..." value={searchLending} onChange={e => setSearchLending(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                        <div className="flex items-center gap-2">
                           <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'table' ? 'bg-[#FFE500] text-black shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📋Baris</button>
                           <button onClick={() => setViewMode('card')} className={`px-3 py-1.5 rounded-md text-sm font-bold transition ${viewMode === 'card' ? 'bg-[#FFE500] text-black shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>🪪Kartu</button>
                        </div>
                     </div>
                     <button onClick={() => openModal('create', 'lending')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Pinjam Barang</button>
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'nama_peminjam')}>Peminjam {sortConfigLending.column === 'nama_peminjam' && (<span>{sortConfigLending.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">KTP</th>{/* Not sortable as it's a button */}<th className="px-4 py-3 text-left font-bold">Barang Dipinjam</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'tanggal_peminjaman')}>Tgl Pinjam {sortConfigLending.column === 'tanggal_peminjaman' && (<span>{sortConfigLending.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'tanggal_estimasi_pengembalian')}>Estimasi Kembali</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'tanggal_pengembalian')}>Tgl Kembali {sortConfigLending.column === 'tanggal_pengembalian' && (<span>{sortConfigLending.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigLending, setSortConfigLending, 'status_peminjaman')}>Status {sortConfigLending.column === 'status_peminjaman' && (<span>{sortConfigLending.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Aksi</th></tr>
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
                                       <td className="px-4 py-3 font-bold text-gray-700">
                                          {l.tanggal_estimasi_pengembalian ? (
                                             <>
                                                {new Date(l.tanggal_estimasi_pengembalian).toLocaleDateString('id-ID')}
                                                {l.reminder_sent_at && <div className="text-[10px] text-green-600 font-bold mt-0.5">✓ Reminder terkirim</div>}
                                             </>
                                          ) : <span className="text-gray-400 italic">-</span>}
                                       </td>
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
                     <input type="text" title="Cari Peserta" aria-label="Cari Peserta" placeholder="🔍 Cari Nama Peserta atau Event..." value={searchRegistration} onChange={e => setSearchRegistration(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-6 py-3 text-left font-bold">Nama Lengkap</th><th className="px-6 py-3 text-left font-bold">Kontak (WA/Email)</th><th className="px-6 py-3 text-left font-bold">Event</th><th className="px-6 py-3 text-left font-bold">Status</th><th className="px-6 py-3 text-left font-bold">Kehadiran</th><th className="px-6 py-3 text-left font-bold">Bukti TF</th><th className="px-6 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {eventRegistrations.filter(r => {
                                    const q = searchRegistration.toLowerCase();
                                    const nama = (r.full_name || r.nama_lengkap || '').toLowerCase();
                                    const evt = (r.event_name || '').toLowerCase();
                                    return nama.includes(q) || evt.includes(q);
                                 }).map((reg: EventRegistration) => (
                                    <tr key={reg.id} className="hover:bg-gray-50 font-medium">
                                       <td className="px-6 py-3 font-bold text-slate-800">{reg.full_name || reg.nama_lengkap || '-'}<br /><span className="text-[10px] text-gray-500">{reg.camera_model || reg.tipe_kamera || '-'}</span></td>
                                       <td className="px-6 py-3">{reg.wa_number || reg.nomor_wa || '-'}<br/><span className="text-xs text-gray-500">{reg.email}</span></td>
                                       <td className="px-6 py-3 text-amber-600 font-bold">{reg.event_name}</td>
                                       <td className="px-6 py-3">
                                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${reg.status === 'Confirmed' ? 'bg-green-100 text-green-700' : reg.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{reg.status}</span>
                                       </td>
                                       <td className="px-6 py-3">
                                          {reg.is_attended ? <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-1 rounded">HADIR ✅</span> : <button onClick={() => handleMarkAttendance(reg.id!)} className="text-[10px] bg-gray-200 text-gray-700 hover:bg-gray-300 font-bold px-2 py-1 rounded border border-gray-300">Set Hadir</button>}
                                       </td>
                                       <td className="px-6 py-3">
                                          {reg.bukti_transfer_url ? <a href={reg.bukti_transfer_url} target="_blank" className="text-blue-500 hover:underline font-bold">Lihat Bukti</a> : <span className="text-gray-400">Belum Ada</span>}
                                       </td>
                                       <td className="px-6 py-3 flex gap-3">
                                          {reg.status === 'Confirmed' && (
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
                     <input type="text" title="Cari Event" aria-label="Cari Event" placeholder="🔍 Cari Judul Event..." value={searchEvent} onChange={e => setSearchEvent(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
                              <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                 <tr><th className="px-4 py-3 text-center font-bold w-12">No</th><th className="px-4 py-3 text-left font-bold">Gambar</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigEvents, setSortConfigEvents, 'title')}>Judul Event {sortConfigEvents.column === 'title' && (<span>{sortConfigEvents.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold cursor-pointer" onClick={() => handleSort(sortConfigEvents, setSortConfigEvents, 'date')}>Tanggal {sortConfigEvents.column === 'date' && (<span>{sortConfigEvents.direction === 'asc' ? '⬆️' : '⬇️'}</span>)}</th><th className="px-4 py-3 text-left font-bold">Detail Acara</th><th className="px-4 py-3 text-left font-bold">Harga</th><th className="px-4 py-3 text-left font-bold">Kuota/Status</th><th className="px-4 py-3 text-left font-bold">Peserta</th><th className="px-4 py-3 text-left font-bold">Aksi</th></tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                 {sortedEvents.map((evt: EventData) => {
                                    const detailPreview = evt.detail_acara ? (evt.detail_acara.length > 60 ? evt.detail_acara.substring(0, 60) + '...' : evt.detail_acara) : '-';
                                    return (
                                    <tr key={evt.id} className="hover:bg-gray-50 font-medium">
                                       <td className="px-4 py-3 text-center font-bold text-gray-600">{eventNumberMap.get(evt.id!)}</td>
                                       <td className="px-4 py-3"><Image src={evt.image} alt="poster" width={40} height={56} className="w-10 h-14 object-cover rounded" /></td>
                                       <td className="px-4 py-3 font-bold text-slate-800">{evt.title}</td>
                                       <td className="px-4 py-3 text-sm">{evt.date}</td>
                                       <td className="px-4 py-3 text-xs text-gray-600 max-w-50 whitespace-normal">{detailPreview}</td>
                                       <td className="px-4 py-3">{evt.price}</td>
                                       <td className="px-4 py-3">
                                          <span className="font-bold text-gray-700 text-sm">{eventRegistrationsCount[evt.title] || 0}/{evt.stock} slot</span>
                                          <br/>{(() => { const { closed, reason } = getEventClosedStatus(evt, eventRegistrationsCount[evt.title] || 0); return <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${closed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{reason}</span>; })()}
                                       </td>
                                       <td className="px-4 py-3 font-bold text-blue-600 text-sm">
                                          {eventRegistrationsCount[evt.title] || 0} orang
                                       </td>
                                       <td className="px-4 py-3 flex gap-2">
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
                              const detailPreview = evt.detail_acara ? (evt.detail_acara.length > 100 ? evt.detail_acara.substring(0, 100) + '...' : evt.detail_acara) : '-';
                              return (
                              <div key={evt.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col hover:border-[#FFE500] transition">
                                 <div className="border-b border-gray-100 pb-3 mb-3">
                                    <div className="flex items-center gap-2 mb-2">
                                       <span className="font-bold text-lg text-gray-600 bg-gray-100 rounded-full w-7 h-7 flex items-center justify-center text-center">{eventNumberMap.get(evt.id!)}</span>
                                       <Image src={evt.image} alt="poster" width={48} height={64} className="w-12 h-16 object-cover rounded" />
                                    </div>
                                    <h3 className="font-bold text-base text-slate-800">{evt.title}</h3>
                                    <p className="text-xs text-gray-500">{evt.date}</p>
                                 </div>
                                 <div className="space-y-2 text-xs flex-1">
                                    <p><span className="font-bold w-20 inline-block">Detail:</span> {detailPreview}</p>
                                    <p><span className="font-bold w-20 inline-block">Harga:</span> {evt.price}</p>
                                    <p><span className="font-bold w-20 inline-block">Kuota:</span> {eventRegistrationsCount[evt.title] || 0}/{evt.stock} slot</p>
                                    <p><span className="font-bold w-20 inline-block">Peserta:</span> {eventRegistrationsCount[evt.title] || 0} orang</p>
                                    <p><span className="font-bold w-20 inline-block">Status:</span> <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${evt.status === 'close' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{evt.status === 'close' ? 'Tutup' : 'Aktif'}</span></p>
                                    {evt.bank_info && <p className="bg-blue-50 border border-blue-100 rounded p-2 mt-2"><span className="font-bold">Rekening:</span> {evt.bank_info}</p>}
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2 justify-end">
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
                        <table className="w-full text-sm whitespace-normal wrap-break-word">
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
                     <input type="text" title="Cari Karyawan" aria-label="Cari Karyawan" placeholder="🔍 Cari Username atau Nama Karyawan..." value={searchKaryawan} onChange={e => setSearchKaryawan(e.target.value)} className="w-full p-3 border border-gray-300 bg-white text-gray-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     {viewMode === 'table' ? (
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-x-auto max-h-[70vh] overflow-y-auto relative">
                           <table className="w-full text-sm whitespace-normal wrap-break-word">
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
                                          <button onClick={() => handleDelete('karyawan', k.id_karyawan!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
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
                                    <p><span className="font-bold w-20 inline-block">Akses:</span> {k.role === 'Admin' ? 'Semua Akses' : (k.akses_halaman || []).join(', ')}</p>
                                 </div>
                                 <div className="mt-4 pt-3 border-t border-gray-100 flex gap-3 justify-end">
                                    <button onClick={() => openModal('edit', 'karyawan', k)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                    <button onClick={() => openModal('reset_pw', 'karyawan', k)} className="text-amber-600 text-xs font-bold hover:underline">Reset PW</button>
                                    <button onClick={() => handleDelete('karyawan', k.id_karyawan!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
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

         {/* MODALS */}
         {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                  <div className="p-5 border-b border-gray-200">
                     <h2 className="text-lg font-bold text-gray-900">
                        {modalAction === 'create' ? 'Tambah' : modalAction === 'edit' ? 'Edit' : modalAction === 'reset_pw' ? 'Reset Password' : 'Pengembalian'} Data
                     </h2>
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
                                    <option value="Admin">Admin</option>
                                    <option value="Karyawan">Karyawan</option>
                                    {/* Add other roles */}
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
                                    <option value="Diterima">Diterima — Barang sudah diterima Pusat Service</option>
                                    <option value="Pengecekan oleh Teknisi">Pengecekan oleh Teknisi</option>
                                    <option value="Menunggu Sparepart">Menunggu Sparepart</option>
                                    <option value="Dalam Pengerjaan">Dalam Pengerjaan</option>
                                    <option value="Quality Check">Quality Check</option>
                                    <option value="Siap Diambil">Siap Diambil — Konsumen bisa ambil barang</option>
                                    <option value="Selesai">Selesai — Sudah diambil konsumen</option>
                                    <option value="Tidak Bisa Diperbaiki">Tidak Bisa Diperbaiki</option>
                                    <option value="Dibatalkan">Dibatalkan</option>
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
                                             <input type="text" required value={registrationForm.nama_lengkap || ''} onChange={e => setRegistrationForm({ ...registrationForm, nama_lengkap: e.target.value })} className="input-form" />
                                          </div>
                                          <div>
                                             <label className="label-form">Nomor WhatsApp *</label>
                                             <input type="text" required value={registrationForm.nomor_wa || ''} onChange={e => setRegistrationForm({ ...registrationForm, nomor_wa: e.target.value })} className="input-form" placeholder="081234567890" />
                                          </div>
                                          <div>
                                             <label className="label-form">Email</label>
                                             <input type="email" value={registrationForm.email || ''} onChange={e => setRegistrationForm({ ...registrationForm, email: e.target.value })} className="input-form" placeholder="nama@email.com" />
                                          </div>
                                          <div>
                                             <label className="label-form">Tipe Kamera</label>
                                             <input type="text" value={registrationForm.tipe_kamera || ''} onChange={e => setRegistrationForm({ ...registrationForm, tipe_kamera: e.target.value })} className="input-form" placeholder="Contoh: Nikon Z50 II" />
                                          </div>
                                          <div>
                                             <label className="label-form">Kabupaten / Kota</label>
                                             <input type="text" value={registrationForm.kabupaten_kotamadya || ''} onChange={e => setRegistrationForm({ ...registrationForm, kabupaten_kotamadya: e.target.value })} className="input-form" />
                                          </div>
                                       </div>
                                    </div>

                                    {/* Section: Pembayaran & Status */}
                                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Pembayaran & Status Pendaftaran</h3>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                             <label className="label-form">Tipe Pembayaran</label>
                                             <select aria-label="Tipe pembayaran" value={registrationForm.payment_type || 'regular'} onChange={e => setRegistrationForm({ ...registrationForm, payment_type: e.target.value as 'regular' | 'deposit' })} className="input-form">
                                                <option value="regular">Regular (Non-refundable)</option>
                                                <option value="deposit">Deposit (Refundable)</option>
                                             </select>
                                          </div>
                                          <div>
                                             <label className="label-form">Status Pendaftaran *</label>
                                             <select aria-label="Status pendaftaran" required value={registrationForm.status_pendaftaran || 'menunggu_validasi'} onChange={e => setRegistrationForm({ ...registrationForm, status_pendaftaran: e.target.value as 'menunggu_validasi' | 'terdaftar' | 'ditolak' })} className="input-form">
                                                <option value="menunggu_validasi">Menunggu Validasi</option>
                                                <option value="terdaftar">Terdaftar (Approved)</option>
                                                <option value="ditolak">Ditolak</option>
                                             </select>
                                          </div>
                                          <div className="md:col-span-2">
                                             <label className="label-form">Bukti Transfer URL</label>
                                             <input type="url" value={registrationForm.bukti_transfer_url || ''} onChange={e => setRegistrationForm({ ...registrationForm, bukti_transfer_url: e.target.value })} className="input-form" placeholder="https://..." />
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
                                                <input type="url" value={registrationForm.ticket_url || ''} onChange={e => setRegistrationForm({ ...registrationForm, ticket_url: e.target.value })} className="input-form" placeholder="https://... (auto-generate via /api/generate-ticket)" />
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
                                                <input type="text" value={registrationForm.nama_bank || ''} onChange={e => setRegistrationForm({ ...registrationForm, nama_bank: e.target.value })} className="input-form" />
                                             </div>
                                             <div>
                                                <label className="label-form">Nomor Rekening</label>
                                                <input type="text" value={registrationForm.no_rekening || ''} onChange={e => setRegistrationForm({ ...registrationForm, no_rekening: e.target.value })} className="input-form" />
                                             </div>
                                             <div className="md:col-span-2">
                                                <label className="label-form">Nama Pemilik Rekening</label>
                                                <input type="text" value={registrationForm.nama_pemilik_rekening || ''} onChange={e => setRegistrationForm({ ...registrationForm, nama_pemilik_rekening: e.target.value })} className="input-form" />
                                             </div>
                                             <div>
                                                <label className="label-form">Status Refund</label>
                                                <select aria-label="Status refund" value={registrationForm.status_pengembalian_deposit || ''} onChange={e => setRegistrationForm({ ...registrationForm, status_pengembalian_deposit: e.target.value || null })} className="input-form">
                                                   <option value="">-- belum diproses --</option>
                                                   <option value="Diminta">Diminta Peserta</option>
                                                   <option value="Diproses">Sedang Diproses</option>
                                                   <option value="Sudah Dikembalikan">Sudah Dikembalikan</option>
                                                   <option value="Ditolak">Ditolak (Tidak hadir)</option>
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
                                 // Auto-calc value = qty * cost_unit
                                 if ('qty' in patch || 'cost_unit' in patch) {
                                    merged.value = (Number(merged.qty) || 0) * (Number(merged.cost_unit) || 0);
                                 }
                                 newItems[idx] = merged;
                                 // Auto-update total_cost
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
                                             <label className="label-form">Nomor Proposal *</label>
                                             <input type="text" required value={budgetForm.proposal_no || ''} onChange={e => setBudgetForm({ ...budgetForm, proposal_no: e.target.value })} className="input-form font-mono" />
                                          </div>
                                          <div>
                                             <label className="label-form">Drafter</label>
                                             <input type="text" value={budgetForm.drafter_name || ''} onChange={e => setBudgetForm({ ...budgetForm, drafter_name: e.target.value })} className="input-form" />
                                          </div>
                                          <div className="md:col-span-2">
                                             <label className="label-form">Judul Proposal *</label>
                                             <input type="text" required value={budgetForm.title || ''} onChange={e => setBudgetForm({ ...budgetForm, title: e.target.value })} className="input-form" placeholder="Contoh: Anggaran Event Photo Walk Q3 2026" />
                                          </div>
                                          <div>
                                             <label className="label-form">Periode</label>
                                             <input type="text" value={budgetForm.period || ''} onChange={e => setBudgetForm({ ...budgetForm, period: e.target.value })} className="input-form" placeholder="Contoh: Juli 2026 atau Q3 2026" />
                                          </div>
                                          <div>
                                             <label className="label-form">Sumber Dana</label>
                                             <select aria-label="Sumber dana" value={budgetForm.budget_source || 'Marketing Budget'} onChange={e => setBudgetForm({ ...budgetForm, budget_source: e.target.value })} className="input-form">
                                                <option value="Marketing Budget">Marketing Budget</option>
                                                <option value="Operational Budget">Operational Budget</option>
                                                <option value="Event Budget">Event Budget</option>
                                                <option value="Service Budget">Service Budget</option>
                                                <option value="Other">Other</option>
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

                                    {/* Section: Item Budget (auto-calc) */}
                                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                                       <div className="flex items-center justify-between mb-3">
                                          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Detail Item Anggaran</h3>
                                          <span className="text-[10px] text-gray-600 font-medium">{items.length} item · auto-calc</span>
                                       </div>
                                       <div className="space-y-3">
                                          {items.map((item, idx) => (
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
                                                <div className="grid grid-cols-3 gap-2">
                                                   <div>
                                                      <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Qty</label>
                                                      <input
                                                         type="number"
                                                         min={0}
                                                         step={1}
                                                         aria-label="Qty"
                                                         title="Quantity"
                                                         value={item.qty || ''}
                                                         onChange={e => updateItem(idx, { qty: parseInt(e.target.value) || 0 })}
                                                         className="input-form"
                                                      />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Cost/Unit</label>
                                                      <input
                                                         type="number"
                                                         min={0}
                                                         step={1000}
                                                         aria-label="Cost per unit"
                                                         title="Cost per unit"
                                                         value={item.cost_unit || ''}
                                                         onChange={e => updateItem(idx, { cost_unit: parseFloat(e.target.value) || 0 })}
                                                         className="input-form"
                                                      />
                                                   </div>
                                                   <div>
                                                      <label className="text-[10px] font-bold text-gray-600 uppercase block mb-1">Value (auto)</label>
                                                      <div className="px-3 py-2.5 rounded-lg border-2 border-gray-200 bg-gray-100 text-sm font-bold text-gray-900">
                                                         {fmtRp(Number(item.value) || 0)}
                                                      </div>
                                                   </div>
                                                </div>
                                                <input
                                                   type="text"
                                                   placeholder="Petty cash / nomor referensi (opsional)"
                                                   value={item.petty_cash || ''}
                                                   onChange={e => updateItem(idx, { petty_cash: e.target.value })}
                                                   className="input-form"
                                                />
                                             </div>
                                          ))}
                                          <button
                                             type="button"
                                             onClick={() => {
                                                const newItems = [...items, { purpose: '', qty: 0, cost_unit: 0, value: 0, petty_cash: '' }];
                                                setBudgetForm({ ...budgetForm, items: newItems });
                                             }}
                                             className="w-full py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-bold border-2 border-dashed border-yellow-300"
                                          >
                                             + Tambah Item Anggaran
                                          </button>
                                       </div>

                                       {/* Total */}
                                       <div className="mt-3 pt-3 border-t-2 border-yellow-300 flex items-center justify-between">
                                          <span className="text-sm font-bold text-gray-700">TOTAL COST</span>
                                          <span className="text-xl font-black text-gray-900">{fmtRp(totalCost)}</span>
                                       </div>
                                    </div>

                                    {/* Section: Approval & Comments */}
                                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                       <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Komentar Management & Persetujuan</h3>
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          <div>
                                             <label className="label-form">Mgt Comment 1</label>
                                             <textarea rows={2} value={budgetForm.mgt_comment_1 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_comment_1: e.target.value })} className="input-form resize-none" />
                                          </div>
                                          <div>
                                             <label className="label-form">Mgt Comment 2</label>
                                             <textarea rows={2} value={budgetForm.mgt_comment_2 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_comment_2: e.target.value })} className="input-form resize-none" />
                                          </div>
                                          <div>
                                             <label className="label-form">Persetujuan Management</label>
                                             <select aria-label="Persetujuan management" value={budgetForm.mgt_consent || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_consent: e.target.value })} className="input-form">
                                                <option value="">-- Belum diisi --</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Rejected">Rejected</option>
                                                <option value="Pending Review">Pending Review</option>
                                                <option value="Need Revision">Need Revision</option>
                                             </select>
                                          </div>
                                          <div>
                                             <label className="label-form">Persetujuan Finance</label>
                                             <select aria-label="Persetujuan finance" value={budgetForm.finance_consent || ''} onChange={e => setBudgetForm({ ...budgetForm, finance_consent: e.target.value })} className="input-form">
                                                <option value="">-- Belum diisi --</option>
                                                <option value="Approved">Approved</option>
                                                <option value="Rejected">Rejected</option>
                                                <option value="Pending Review">Pending Review</option>
                                                <option value="Need Revision">Need Revision</option>
                                             </select>
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
                                    <input type="text" value={warrantyForm.nomor_wa || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nomor_wa: e.target.value })} className="input-form" placeholder="62812345678 / 081234567890" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nomor WA Notifikasi Update</label>
                                    <input type="text" value={warrantyForm.nomor_wa_update || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nomor_wa_update: e.target.value })} className="input-form" placeholder="Kosongkan = pakai nomor pemilik" />
                                 </div>
                                 <div className="md:col-span-2">
                                    <label className="label-form">Nama Pendaftar</label>
                                    <input type="text" value={warrantyForm.nama_pendaftar || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nama_pendaftar: e.target.value })} className="input-form" />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Data Produk */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Data Produk & Pembelian</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Nomor Seri *</label>
                                    <input type="text" required value={warrantyForm.nomor_seri || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nomor_seri: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Tipe Barang *</label>
                                    <input type="text" required value={warrantyForm.tipe_barang || ''} onChange={e => setWarrantyForm({ ...warrantyForm, tipe_barang: e.target.value })} className="input-form" placeholder="Contoh: Nikon Z50 Kit 16-50mm" />
                                 </div>
                                 <div>
                                    <label className="label-form">Tanggal Pembelian</label>
                                    <input type="date" aria-label="Tanggal pembelian" title="Tanggal pembelian" value={warrantyForm.tanggal_pembelian?.substring(0, 10) || ''} onChange={e => setWarrantyForm({ ...warrantyForm, tanggal_pembelian: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nama Toko</label>
                                    <input type="text" value={warrantyForm.nama_toko || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nama_toko: e.target.value })} className="input-form" />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Spesifikasi Garansi */}
                           <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Spesifikasi Garansi</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Jenis Garansi *</label>
                                    <select aria-label="Jenis garansi" required value={warrantyForm.jenis_garansi || 'Jasa 30%'} onChange={e => setWarrantyForm({ ...warrantyForm, jenis_garansi: e.target.value })} className="input-form">
                                       <option value="Jasa 30%">Jasa 30%</option>
                                       <option value="Jasa 50%">Jasa 50%</option>
                                       <option value="Jasa 100%">Jasa 100%</option>
                                       <option value="Sparepart 30%">Sparepart 30%</option>
                                       <option value="Sparepart 50%">Sparepart 50%</option>
                                       <option value="Sparepart 100%">Sparepart 100%</option>
                                       <option value="Full">Full</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Lama Garansi *</label>
                                    <select aria-label="Lama garansi" required value={warrantyForm.lama_garansi || '1 Tahun'} onChange={e => setWarrantyForm({ ...warrantyForm, lama_garansi: e.target.value })} className="input-form">
                                       <option value="6 Bulan">6 Bulan</option>
                                       <option value="1 Tahun">1 Tahun</option>
                                       <option value="2 Tahun">2 Tahun</option>
                                       <option value="3 Tahun">3 Tahun</option>
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
                                       <option value="Menunggu">Menunggu</option>
                                       <option value="Proses Validasi">Proses Validasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Ditolak">Ditolak</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Validasi Marketing (MKT)</label>
                                    <select aria-label="Validasi MKT" value={warrantyForm.validasi_by_mkt || ''} onChange={e => setWarrantyForm({ ...warrantyForm, validasi_by_mkt: e.target.value || null })} className="input-form">
                                       <option value="">-- belum diisi --</option>
                                       <option value="Proses Validasi">Proses Validasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Ditolak">Ditolak</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Validasi Finance (FA)</label>
                                    <select aria-label="Validasi FA" value={warrantyForm.validasi_by_fa || ''} onChange={e => setWarrantyForm({ ...warrantyForm, validasi_by_fa: e.target.value || null })} className="input-form">
                                       <option value="">-- belum diisi --</option>
                                       <option value="Proses Validasi">Proses Validasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Ditolak">Ditolak</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Catatan MKT</label>
                                    <textarea rows={2} value={warrantyForm.catatan_mkt || ''} onChange={e => setWarrantyForm({ ...warrantyForm, catatan_mkt: e.target.value })} className="input-form resize-none" />
                                 </div>
                                 <div>
                                    <label className="label-form">Catatan FA</label>
                                    <textarea rows={2} value={warrantyForm.catatan_fa || ''} onChange={e => setWarrantyForm({ ...warrantyForm, catatan_fa: e.target.value })} className="input-form resize-none" />
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
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Dokumen Pendukung</h3>
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
                                       value={konsumenForm.nama_lengkap || ''}
                                       onChange={e => setKonsumenForm({ ...konsumenForm, nama_lengkap: e.target.value })}
                                       className="input-form"
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
                                       value={konsumenForm.alamat_rumah || ''}
                                       onChange={e => setKonsumenForm({ ...konsumenForm, alamat_rumah: e.target.value })}
                                       className="input-form resize-none"
                                       placeholder="Jalan, nomor rumah, RT/RW"
                                    />
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                       <label className="label-form">Kelurahan</label>
                                       <input type="text" value={konsumenForm.kelurahan || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kelurahan: e.target.value })} className="input-form" />
                                    </div>
                                    <div>
                                       <label className="label-form">Kecamatan</label>
                                       <input type="text" value={konsumenForm.kecamatan || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kecamatan: e.target.value })} className="input-form" />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="label-form">Kabupaten / Kotamadya</label>
                                    <input type="text" value={konsumenForm.kabupaten_kotamadya || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kabupaten_kotamadya: e.target.value })} className="input-form" />
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                       <label className="label-form">Provinsi</label>
                                       <input type="text" value={konsumenForm.provinsi || ''} onChange={e => setKonsumenForm({ ...konsumenForm, provinsi: e.target.value })} className="input-form" />
                                    </div>
                                    <div>
                                       <label className="label-form">Kode Pos</label>
                                       <input type="text" value={konsumenForm.kodepos || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kodepos: e.target.value })} className="input-form" pattern="[0-9]{5}|BELUM_DIISI" title="5 digit angka" />
                                    </div>
                                 </div>
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
                                    <option value="START">START (Menu Utama)</option>
                                    <option value="TALKING_TO_CS">TALKING_TO_CS (Bicara dgn CS)</option>
                                    <option value="MENUNGGU_UPLOAD_WEB">MENUNGGU_UPLOAD_WEB</option>
                                    <option value="MENUNGGU_UPLOAD_GARANSI_WEB">MENUNGGU_UPLOAD_GARANSI_WEB</option>
                                    <option value="TANYA_UPDATE_WA">TANYA_UPDATE_WA</option>
                                    <option value="TANYA_UPDATE_WA_INPUT">TANYA_UPDATE_WA_INPUT</option>
                                    <option value="OFFER_GARANSI_AFTER_CLAIM">OFFER_GARANSI_AFTER_CLAIM</option>
                                    <option value="MENUNGGU_SERI_CLAIM">MENUNGGU_SERI_CLAIM</option>
                                    <option value="MENUNGGU_SERI_GARANSI">MENUNGGU_SERI_GARANSI</option>
                                    <option value="MENUNGGU_RESI_SERVICE">MENUNGGU_RESI_SERVICE</option>
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
                        <form onSubmit={handleSaveClaim} className="space-y-4">
                           {/* Banner info combined form */}
                           <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                              <p className="text-xs text-gray-900 font-medium">
                                 💡 Form ini akan otomatis <strong>menambah/update konsumen</strong> di tabel konsumen sekaligus membuat claim baru. Cukup isi nomor WA — kalau sudah ada di sistem, data konsumen akan otomatis terisi.
                              </p>
                           </div>

                           {/* Section: Identitas Pendaftar */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
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
                                          // Auto-fetch konsumen by WA + prefill
                                          const { data: kon } = await supabase.from('konsumen').select('*').eq('nomor_wa', wa).maybeSingle();
                                          if (kon) {
                                             const clean = (v: string | null) => (!v || v === 'BELUM_DIISI') ? '' : v;
                                             setKonsumenForm({
                                                nomor_wa: kon.nomor_wa,
                                                nama_lengkap: kon.nama_lengkap || '',
                                                nik: clean(kon.nik),
                                                alamat_rumah: clean(kon.alamat_rumah),
                                                kelurahan: clean(kon.kelurahan),
                                                kecamatan: clean(kon.kecamatan),
                                                kabupaten_kotamadya: clean(kon.kabupaten_kotamadya),
                                                provinsi: clean(kon.provinsi),
                                                kodepos: clean(kon.kodepos),
                                                status_langkah: kon.status_langkah,
                                                id_konsumen: kon.id_konsumen,
                                                created_at: kon.created_at,
                                             });
                                             // Prefill nama_pendaftar kalau kosong
                                             if (!claimForm.nama_pendaftar) {
                                                setClaimForm(prev => ({ ...prev, nama_pendaftar: kon.nama_lengkap || '' }));
                                             }
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
                                    <input type="text" required value={claimForm.nama_pendaftar || ''} onChange={e => setClaimForm({ ...claimForm, nama_pendaftar: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nama Penerima Hadiah</label>
                                    <input type="text" value={claimForm.nama_penerima_claim || ''} onChange={e => setClaimForm({ ...claimForm, nama_penerima_claim: e.target.value })} className="input-form" placeholder="Kosongkan jika sama dgn pendaftar" />
                                 </div>
                              </div>
                              <div className="mt-3">
                                 <label className="label-form">Alamat Pengiriman Hadiah</label>
                                 <textarea rows={2} value={claimForm.alamat_pengiriman || ''} onChange={e => setClaimForm({ ...claimForm, alamat_pengiriman: e.target.value })} className="input-form resize-none" />
                              </div>
                           </div>

                           {/* Section: Data Konsumen (auto-sync ke tabel konsumen) */}
                           <div className="bg-purple-50 rounded-lg p-3 border-2 border-purple-200">
                              <div className="flex items-center justify-between mb-3">
                                 <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Data Konsumen (auto-sync)</h3>
                                 {konsumenForm.id_konsumen && (
                                    <span className="text-[10px] font-bold text-purple-800 bg-white px-2 py-0.5 rounded-md border border-purple-300">📌 {konsumenForm.id_konsumen}</span>
                                 )}
                              </div>
                              <div className="space-y-3">
                                 <div>
                                    <label className="label-form">NIK (Nomor KTP)</label>
                                    <input type="text" value={konsumenForm.nik || ''} onChange={e => setKonsumenForm({ ...konsumenForm, nik: e.target.value })} className="input-form" placeholder="16 digit" pattern="[0-9]{16}" />
                                 </div>
                                 <div>
                                    <label className="label-form">Alamat Rumah</label>
                                    <textarea rows={2} value={konsumenForm.alamat_rumah || ''} onChange={e => setKonsumenForm({ ...konsumenForm, alamat_rumah: e.target.value })} className="input-form resize-none" placeholder="Jalan, nomor, RT/RW" />
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="label-form">Kelurahan</label>
                                       <input type="text" value={konsumenForm.kelurahan || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kelurahan: e.target.value })} className="input-form" />
                                    </div>
                                    <div>
                                       <label className="label-form">Kecamatan</label>
                                       <input type="text" value={konsumenForm.kecamatan || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kecamatan: e.target.value })} className="input-form" />
                                    </div>
                                 </div>
                                 <div>
                                    <label className="label-form">Kabupaten / Kotamadya</label>
                                    <input type="text" value={konsumenForm.kabupaten_kotamadya || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kabupaten_kotamadya: e.target.value })} className="input-form" />
                                 </div>
                                 <div className="grid grid-cols-2 gap-3">
                                    <div>
                                       <label className="label-form">Provinsi</label>
                                       <input type="text" value={konsumenForm.provinsi || ''} onChange={e => setKonsumenForm({ ...konsumenForm, provinsi: e.target.value })} className="input-form" />
                                    </div>
                                    <div>
                                       <label className="label-form">Kode Pos</label>
                                       <input type="text" value={konsumenForm.kodepos || ''} onChange={e => setKonsumenForm({ ...konsumenForm, kodepos: e.target.value })} className="input-form" pattern="[0-9]{5}" />
                                    </div>
                                 </div>
                              </div>
                           </div>

                           {/* Section: Data Produk */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Data Produk & Pembelian</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Nomor Seri *</label>
                                    <input type="text" required value={claimForm.nomor_seri || ''} onChange={e => setClaimForm({ ...claimForm, nomor_seri: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Tipe Barang *</label>
                                    <input type="text" required value={claimForm.tipe_barang || ''} onChange={e => setClaimForm({ ...claimForm, tipe_barang: e.target.value })} className="input-form" placeholder="Contoh: Nikon Z50 Kit 16-50mm" />
                                 </div>
                                 <div>
                                    <label className="label-form">Tanggal Pembelian *</label>
                                    <input type="date" aria-label="Tanggal pembelian" title="Tanggal pembelian" required value={claimForm.tanggal_pembelian?.substring(0, 10) || ''} onChange={e => setClaimForm({ ...claimForm, tanggal_pembelian: e.target.value })} className="input-form" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nama Toko</label>
                                    <input type="text" value={claimForm.nama_toko || ''} onChange={e => setClaimForm({ ...claimForm, nama_toko: e.target.value })} className="input-form" />
                                 </div>
                                 <div className="md:col-span-2">
                                    <label className="label-form">Jenis Promosi</label>
                                    <input type="text" value={claimForm.jenis_promosi || ''} onChange={e => setClaimForm({ ...claimForm, jenis_promosi: e.target.value })} className="input-form" placeholder="Contoh: Cashback, Free Aksesori" />
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
                                       <option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Ditolak">Ditolak</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Validasi Finance (FA) *</label>
                                    <select aria-label="Validasi FA" required value={claimForm.validasi_by_fa || 'Dalam Proses Verifikasi'} onChange={e => setClaimForm({ ...claimForm, validasi_by_fa: e.target.value })} className="input-form">
                                       <option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Ditolak">Ditolak</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="label-form">Catatan MKT</label>
                                    <textarea rows={2} value={claimForm.catatan_mkt || ''} onChange={e => setClaimForm({ ...claimForm, catatan_mkt: e.target.value })} className="input-form resize-none" />
                                 </div>
                                 <div>
                                    <label className="label-form">Catatan FA</label>
                                    <textarea rows={2} value={claimForm.catatan_fa || ''} onChange={e => setClaimForm({ ...claimForm, catatan_fa: e.target.value })} className="input-form resize-none" />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Pengiriman Hadiah */}
                           <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Pengiriman Hadiah</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                    <label className="label-form">Jasa Pengiriman</label>
                                    <input type="text" value={claimForm.nama_jasa_pengiriman || ''} onChange={e => setClaimForm({ ...claimForm, nama_jasa_pengiriman: e.target.value })} className="input-form" placeholder="Contoh: JNE, J&T, Sicepat" />
                                 </div>
                                 <div>
                                    <label className="label-form">Nomor Resi</label>
                                    <input type="text" value={claimForm.nomor_resi || ''} onChange={e => setClaimForm({ ...claimForm, nomor_resi: e.target.value })} className="input-form" />
                                 </div>
                              </div>
                           </div>

                           {/* Section: Dokumen */}
                           <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">Dokumen Pendukung</h3>
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

                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Claim'}</button>
                           </div>
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
                                       <input type="text" required value={getVal('event_title', 'title')} onChange={e => setField('event_title', e.target.value)} className="input-form" placeholder="Contoh: Nikon On The Sport" />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="label-form">Tanggal *</label>
                                          <input type="text" required value={getVal('event_date', 'date')} onChange={e => setField('event_date', e.target.value)} className="input-form" placeholder="Contoh: 1 Juli 2026" />
                                          <p className="text-[10px] text-gray-500 mt-1">Format: D Bulan YYYY (Bahasa Indonesia)</p>
                                       </div>
                                       <div>
                                          <label className="label-form">Harga *</label>
                                          <input type="text" required value={getVal('event_price', 'price')} onChange={e => setField('event_price', e.target.value)} className="input-form" placeholder="Contoh: Rp 50.000" />
                                       </div>
                                    </div>
                                    <div>
                                       <label className="label-form">Deskripsi Event *</label>
                                       <textarea required rows={4} value={getVal('event_description', 'detail_acara')} onChange={e => setField('event_description', e.target.value)} className="input-form resize-none" placeholder="Detail acara, agenda, dll." />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="label-form">Kuota Peserta *</label>
                                          <input type="number" required min={0} value={getVal('event_partisipant_stock', 'stock')} onChange={e => setField('event_partisipant_stock', parseInt(e.target.value) || 0)} className="input-form" />
                                       </div>
                                       <div>
                                          <label className="label-form">Status</label>
                                          <select value={getVal('event_status', 'status') || 'In stock'} onChange={e => setField('event_status', e.target.value)} className="input-form">
                                             <option value="In stock">Aktif (In stock)</option>
                                             <option value="Out of stock">Habis (Out of stock)</option>
                                             <option value="close">Tutup (close)</option>
                                          </select>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="label-form">Speaker</label>
                                          <input type="text" value={getVal('event_speaker')} onChange={e => setField('event_speaker', e.target.value)} className="input-form" placeholder="Nama pembicara" />
                                       </div>
                                       <div>
                                          <label className="label-form">Genre Speaker</label>
                                          <input type="text" value={getVal('event_speaker_genre')} onChange={e => setField('event_speaker_genre', e.target.value)} className="input-form" placeholder="Wildlife, Landscape, dll." />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                       <div>
                                          <label className="label-form">Tipe Pembayaran</label>
                                          <select value={getVal('event_payment_tipe') || 'regular'} onChange={e => setField('event_payment_tipe', e.target.value)} className="input-form">
                                             <option value="regular">Regular (Non-refundable)</option>
                                             <option value="deposit">Deposit (Refundable setelah hadir)</option>
                                          </select>
                                       </div>
                                       <div>
                                          <label className="label-form">Jumlah Deposit (jika deposit)</label>
                                          <input type="text" value={getVal('deposit_amount')} onChange={e => setField('deposit_amount', e.target.value)} className="input-form" placeholder="Contoh: 50000" />
                                       </div>
                                    </div>
                                    <div>
                                       <label className="label-form">Info Rekening Pembayaran</label>
                                       <input type="text" value={getVal('bank_info')} onChange={e => setField('bank_info', e.target.value)} className="input-form" placeholder="Contoh: BCA 123456789 a.n. Nikon Indonesia" />
                                    </div>
                                    <div>
                                       <label className="label-form">Poster Event {getVal('event_image', 'image') ? '(Upload ulang akan mengganti)' : ''}</label>
                                       {getVal('event_image', 'image') && !eventImageFile && (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={getVal('event_image', 'image')} alt="Poster saat ini" className="w-32 h-44 object-cover rounded-lg border border-gray-200 mb-2" />
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

                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button
                                 type="button"
                                 onClick={() => handleReturnItems(lendingForm as PeminjamanBarang)}
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
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                 <label className="label-form">Nama Peminjam *</label>
                                 <input type="text" required value={lendingForm.nama_peminjam || ''} onChange={e => setLendingForm({ ...lendingForm, nama_peminjam: e.target.value })} className="input-form" />
                              </div>
                              <div>
                                 <label className="label-form">Nomor WhatsApp *</label>
                                 <input type="text" required value={lendingForm.nomor_wa_peminjam || ''} onChange={e => setLendingForm({ ...lendingForm, nomor_wa_peminjam: e.target.value })} className="input-form" placeholder="Contoh: 6281234567890" />
                              </div>
                           </div>
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
                                 <img src={lendingForm.link_ktp_peminjam} alt="KTP saat ini" className="w-32 h-20 object-cover rounded-lg border border-gray-200 mb-2" />
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
                                       <input type="text" required placeholder="Nama Barang (cth: Nikon Z50 II Body Only)" value={item.nama_barang} onChange={e => {
                                          const newItems = [...(lendingForm.items_dipinjam || [])];
                                          newItems[idx] = { ...newItems[idx], nama_barang: e.target.value };
                                          setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                       }} className="input-form" />
                                       <input type="text" required placeholder="Nomor Seri" value={item.nomor_seri} onChange={e => {
                                          const newItems = [...(lendingForm.items_dipinjam || [])];
                                          newItems[idx] = { ...newItems[idx], nomor_seri: e.target.value };
                                          setLendingForm({ ...lendingForm, items_dipinjam: newItems });
                                       }} className="input-form" />
                                       <input type="text" placeholder="Catatan (opsional)" value={item.catatan || ''} onChange={e => {
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
                           <div className="mt-6 flex justify-end gap-3">
                              <button type="button" onClick={closeModal} className="btn-secondary">Batal</button>
                              <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? 'Menyimpan...' : 'Simpan Peminjaman'}</button>
                           </div>
                        </form>
                     )}

                     {/* ============ FORM TAB LAIN: placeholder info (jika ada tab baru) ============ */}
                     {!['userrole', 'events', 'lending', 'claims', 'konsumen', 'warranties', 'promos', 'botsettings', 'budgets', 'eventregistrations', 'services'].includes(activeTab) && (
                        <div className="text-center py-12">
                           <div className="text-5xl mb-3">🚧</div>
                           <p className="text-gray-700 font-semibold mb-1">Form untuk tab ini belum tersedia</p>
                           <p className="text-sm text-gray-600 mb-4">Hubungi developer untuk implementasi form Create/Edit tab <span className="font-bold">{activeTab}</span>.</p>
                           <button onClick={closeModal} className="btn-secondary">Tutup</button>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* IMAGE VIEWER */}
         {isImageViewerOpen && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
               <button onClick={closeImageViewer} aria-label="Tutup" className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
               <div className="absolute inset-0 flex items-center justify-center overflow-hidden" onWheel={handleWheel} onMouseMove={handleMouseMove} onMouseDown={handleMouseDown}>
                  {currentImageUrl.toLowerCase().endsWith('.pdf') || currentImageUrl.startsWith('data:application/pdf') ? (
                     <iframe src={currentImageUrl} className="w-full h-full border-none" title="PDF Viewer" />
                     ) : (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img
                        src={currentImageUrl}
                        alt="Viewer"
                        className="max-w-full max-h-full object-contain cursor-grab"
                        style={{ transform: `scale(${imageScale}) translate(${imageTranslate.x}px, ${imageTranslate.y}px)`, transition: isDragging ? 'none' : 'transform 0.1s ease-out' }}
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
                        <input type="text" value={newChatWa} onChange={e => setNewChatWa(e.target.value)} className="input-form" placeholder="Contoh: 628123456789" required />
                     </div>
                     <div>
                        <label className="label-form">Isi Pesan</label>
                        <textarea value={newChatMsg} onChange={e => setNewChatMsg(e.target.value)} className="input-form" rows={4} required />
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
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative">
                  <button onClick={() => setIsScannerOpen(false)} aria-label="Tutup Scanner" className="absolute -top-3 -right-3 bg-white rounded-full p-1 shadow-lg z-10">
                     <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <div className="p-5 border-b border-gray-200">
                     <h2 className="text-lg font-bold text-gray-900">Scan QR Code Kehadiran</h2>
                  </div>
                  <div id="reader" className="p-4"></div>
               </div>
            </div>
         )}

         {/* PRINT VIEW */}
         {printData && (
            <div className="hidden print:block p-8 font-sans">
               {/* ... Print layout for budget approval ... */}
            </div>
         )}
      </>
   );
}
