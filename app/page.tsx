'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Akan diisi via .env.local
const supabase = createClient(supabaseUrl, supabaseKey);

// --- TYPES ---
interface Karyawan { id_karyawan?: string; username: string; password?: string; nama_karyawan: string; role: string; status_aktif: boolean; akses_halaman: string[]; created_at?: string; nomor_wa?: string; }
interface KonsumenData { nomor_wa: string; id_konsumen: string; nama_lengkap: string; status_langkah: string; alamat_rumah: string; created_at: string; nik?: string; kelurahan?: string; kecamatan?: string; kabupaten_kotamadya?: string; provinsi?: string; kodepos?: string; }
interface RiwayatPesan { id_pesan?: string; nomor_wa: string; nama_profil_wa: string; arah_pesan: 'IN' | 'OUT'; isi_pesan: string; waktu_pesan: string; bicara_dengan_cs?: boolean; created_at?: string; }
interface ClaimPromo { id_claim?: string; nomor_wa: string; nomor_seri: string; tipe_barang: string; tanggal_pembelian: string; nama_toko?: string; jenis_promosi?: string; validasi_by_mkt: string; validasi_by_fa: string; nama_jasa_pengiriman?: string; nomor_resi?: string; link_kartu_garansi?: string | File | null; link_nota_pembelian?: string | File | null; }
interface Garansi { id_garansi?: string; nomor_seri: string; tipe_barang: string; status_validasi: string; jenis_garansi: string; lama_garansi: string; link_kartu_garansi?: string | File | null; link_nota_pembelian?: string | File | null; }
interface Promosi { id_promo?: string; nama_promo: string; tipe_produk: { nama_produk: string }[]; tanggal_mulai: string; tanggal_selesai: string; status_aktif: boolean; created_at?: string; }
interface StatusService { id_service?: string; nomor_tanda_terima: string; nomor_seri: string; status_service: string; created_at?: string; }
interface BudgetItem { purpose: string; qty: number; cost_unit: number; value: number; petty_cash?: string; }
interface BudgetApproval { id_budget?: string; proposal_no: string; title: string; period: string; objectives: string; detail_activity: string; expected_result: string; total_cost: number; budget_source: string; drafter_name: string; mgt_comment_1?: string; mgt_comment_2?: string; mgt_consent?: string; finance_consent?: string; items: BudgetItem[]; created_at?: string; attachment_urls?: (string | File | null)[]; }

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
   const [consumersList, setConsumersList] = useState<KonsumenData[]>([]);

   // SEARCH STATES
   const [searchKonsumen, setSearchKonsumen] = useState('');
   const [searchChat, setSearchChat] = useState('');
   const [searchPromo, setSearchPromo] = useState('');
   const [searchClaim, setSearchClaim] = useState('');
   const [searchGaransi, setSearchGaransi] = useState('');
   const [searchService, setSearchService] = useState('');
   const [searchBudget, setSearchBudget] = useState('');
   const [searchKaryawan, setSearchKaryawan] = useState('');

   // UI STATES
   const [readStatus, setReadStatus] = useState<Record<string, string>>({});
   const [loading, setLoading] = useState(true);
   const [dbStatus, setDbStatus] = useState<{ connected: boolean; message: string }>({ connected: false, message: 'Menghubungkan...' });
   const [activeTab, setActiveTab] = useState('messages');
   const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: new Date().toISOString().split('T')[0] });
   const [msgTimeFilter, setMsgTimeFilter] = useState<'day' | 'week' | 'month'>('day');

   // MODAL STATES
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [modalAction, setModalAction] = useState<'create' | 'edit' | 'reset_pw'>('create');
   const [editingId, setEditingId] = useState<string | null>(null);
   const [selectedWa, setSelectedWa] = useState<string | null>(null);
   const [replyText, setReplyText] = useState('');
   const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
   const [newChatWa, setNewChatWa] = useState('');
   const [newChatMsg, setNewChatMsg] = useState('');

   // FORM STATES
   const [claimForm, setClaimForm] = useState<Partial<ClaimPromo>>({});
   const [warrantyForm, setWarrantyForm] = useState<Partial<Garansi>>({});
   const [promoForm, setPromoForm] = useState<Partial<Promosi>>({ tipe_produk: [] });
   const [serviceForm, setServiceForm] = useState<Partial<StatusService>>({});
   const [budgetForm, setBudgetForm] = useState<Partial<BudgetApproval>>({ items: [] });
   const [karyawanForm, setKaryawanForm] = useState<Partial<Karyawan>>({ role: 'Karyawan', status_aktif: true, akses_halaman: ['messages'] });

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

   // --- DYNAMIC DATALIST OPTIONS ---
   const dynamicOptions = useMemo(() => {
      return {
         tipeBarang: Array.from(new Set([
            ...claims.map(c => c.tipe_barang),
            ...warranties.map(w => w.tipe_barang),
            ...(promos.flatMap(p => p.tipe_produk?.map(tp => tp.nama_produk) || []))
         ].filter(Boolean))),
         namaToko: Array.from(new Set([
            ...claims.map(c => c.nama_toko)
         ].filter(Boolean))),
         jenisPromo: Array.from(new Set(promos.map(p => p.nama_promo).filter(Boolean))),
         jasaKirim: Array.from(new Set(claims.map(c => c.nama_jasa_pengiriman).filter(Boolean))),
         statusService: Array.from(new Set(services.map(s => s.status_service).filter(Boolean))),
         roles: Array.from(new Set(karyawans.map(k => k.role).filter(Boolean))),
         budgetSource: Array.from(new Set(budgets.map(b => b.budget_source).filter(Boolean)))
      };
   }, [claims, warranties, promos, services, karyawans, budgets]);

   // --- IMAGE VIEWER LOGIC ---
   const openImageViewer = (urlOrFile: string | File) => {
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

   // --- STORAGE HELPERS ---
   const uploadFileToStorage = async (file: File, prefix: string, serial: string) => {
      const ext = file.name.split('.').pop();
      const fileName = `${serial}_${prefix}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('whatsapp-uploads').upload(fileName, file, { upsert: true });
      if (error) throw error;
      return supabase.storage.from('whatsapp-uploads').getPublicUrl(fileName).data.publicUrl;
   };

   const deleteFileFromStorage = async (url: string) => {
      try {
         if (!url || !url.includes('/storage/v1/object/public/whatsapp-uploads/')) return;
         const fileName = url.split('/').pop();
         if (fileName) {
            await supabase.storage.from('whatsapp-uploads').remove([fileName]);
         }
      } catch (err) {
         console.error("Gagal hapus file dari storage:", err);
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
      if (currentUser?.role === 'Admin') fetchKaryawans();

      // Cek koneksi Supabase
      const checkConnection = async () => {
         try {
            if (!supabaseKey) {
               setDbStatus({ connected: false, message: 'Kunci API (Anon Key) tidak ditemukan di .env.local' });
               return;
            }
            const { error } = await supabase.from('karyawan').select('count', { count: 'exact', head: true });
            if (error) throw error;
            setDbStatus({ connected: true, message: 'Terhubung ke Database' });
         } catch (err: any) {
            setDbStatus({ connected: false, message: 'Gagal terhubung: ' + err.message });
         }
      };
      checkConnection();

      const subscription = supabase.channel('messages-channel')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_pesan' }, (payload) => {
            if (payload.eventType === 'INSERT') setMessages(prev => [payload.new as RiwayatPesan, ...prev]);
         }).subscribe();

      return () => { subscription.unsubscribe(); };
   }, [isLoggedIn, dateRange]);

   useEffect(() => {
      // Print handled manually via button in the print overlay
   }, [printData]);

   const handlePrintDocument = () => {
      window.print();
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

            const msg = `Halo ${data.nama_karyawan},\n\nPermintaan reset password Anda telah diterima. Password sementara Anda adalah: *${tempPw}*\n\nSilakan login dan segera ubah password Anda di dashboard.`;
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
      console.log("[INDICATOR DASHBOARD 1] Memulai fetchConsumers...");
      const map: Record<string, string> = {};
      const { data: konsumenData } = await supabase.from('konsumen').select('*').order('created_at', { ascending: false });
      if (konsumenData) {
         setConsumersList(konsumenData);
         konsumenData.forEach(k => { if (k.nama_lengkap) map[k.nomor_wa] = k.nama_lengkap; });
      }
      const { data: riwayatData, error: rErr } = await supabase.from('riwayat_pesan').select('nomor_wa, nama_profil_wa').neq('nama_profil_wa', 'Sistem Bot').order('created_at', { ascending: false }).limit(2000);
      if (rErr) console.error("[INDICATOR DASHBOARD 2] Error fetch riwayatData:", rErr);
      riwayatData?.forEach(r => { if (r.nomor_wa && !map[r.nomor_wa]) map[r.nomor_wa] = r.nama_profil_wa; });
      console.log("[INDICATOR DASHBOARD 3] Consumers map size:", Object.keys(map).length);
      setConsumers(map);
   };

   const fetchMessages = async () => {
      console.log("[INDICATOR DASHBOARD 4] Memulai fetchMessages. Range:", dateRange);
      const { data, error } = await supabase.from('riwayat_pesan').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false });
      if (error) {
         console.error("[INDICATOR DASHBOARD 5] Error fetchMessages:", error);
      } else {
         console.log("[INDICATOR DASHBOARD 6] Messages fetched count:", data?.length || 0);
      }
      setMessages(data || []);
   };
   const fetchClaims = async () => { const { data } = await supabase.from('claim_promo').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false }); setClaims(data || []); };
   const fetchWarranties = async () => { const { data } = await supabase.from('garansi').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false }); setWarranties(data || []); };
   const fetchPromos = async () => { const { data } = await supabase.from('promosi').select('*').order('created_at', { ascending: false }); setPromos(data || []); };
   const fetchServices = async () => { const { data } = await supabase.from('status_service').select('*').order('created_at', { ascending: false }); setServices(data || []); };
   const fetchBudgets = async () => { const { data } = await supabase.from('budget_approval').select('*').order('created_at', { ascending: false }); setBudgets(data || []); setLoading(false); };
   const fetchKaryawans = async () => { const { data } = await supabase.from('karyawan').select('*').order('created_at', { ascending: true }); setKaryawans(data || []); };


   // --- CSV CENTRAL TEMPLATE & IMPORT LOGIC ---
   const downloadTemplate = () => {
      const templates = {
         claim_promo: ['id_claim', 'nomor_wa', 'nomor_seri', 'tipe_barang', 'tanggal_pembelian', 'nama_toko', 'jenis_promosi', 'validasi_by_mkt', 'validasi_by_fa', 'nama_jasa_pengiriman', 'nomor_resi', 'link_kartu_garansi', 'link_nota_pembelian'],
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
                  obj[header] = val;
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

   const openModal = (action: 'create' | 'edit' | 'reset_pw', type: 'claim' | 'warranty' | 'promo' | 'service' | 'budget' | 'karyawan', item?: any) => {
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
      setIsModalOpen(true);
   };

   const closeModal = () => {
      setIsModalOpen(false);
      setClaimForm({});
      setWarrantyForm({});
      setPromoForm({ tipe_produk: [] });
      setServiceForm({});
      setBudgetForm({ items: [] });
      setKaryawanForm({});
      setEditingId(null);
   };

   // --- CRUD HANDLERS ---
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
            link_kartu_garansi: garansiUrl,
            link_nota_pembelian: notaUrl,
         };

         if (modalAction === 'create') await supabase.from('claim_promo').insert([dataToSave]);
         else await supabase.from('claim_promo').update(dataToSave).eq('id_claim', editingId);

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

            const msg = `Halo ${karyawanForm.nama_karyawan},\n\nAnda telah terdaftar sebagai karyawan di Alta Nikindo Dashboard.\n\nUsername: *${karyawanForm.username}*\nPassword: *${passwordToUse}*\n\nSilakan login dan segera ubah password Anda.`;
            await sendWhatsAppMessageViaFonnte(karyawanForm.nomor_wa, msg);
         } else {
            const updateData = { ...karyawanForm };
            if (!updateData.password) delete updateData.password;
            await supabase.from('karyawan').update(updateData).eq('id_karyawan', editingId);

            if (updateData.password && karyawanForm.nomor_wa) {
               const msg = `Halo ${karyawanForm.nama_karyawan},\n\nPassword akun Anda telah diperbarui oleh Admin.\n\nPassword baru: *${updateData.password}*`;
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
            const msg = `Halo ${karyawanForm.nama_karyawan},\n\nPassword akun Anda telah di-reset oleh Admin.\n\nPassword baru: *${karyawanForm.password}*`;
            await sendWhatsAppMessageViaFonnte(karyawanForm.nomor_wa, msg);
         }

         alert(`Password untuk ${karyawanForm.username} berhasil di-reset dan dikirim via WA!`);
         fetchKaryawans(); closeModal();
      } catch (err: any) { alert('Gagal: ' + err.message); }
      finally { setIsSubmitting(false); }
   };

   const handleDelete = async (type: 'claim' | 'warranty' | 'promo' | 'service' | 'budget' | 'karyawan', id: string) => {
      if (!window.confirm('Yakin menghapus data?')) return;
      if (type === 'claim') { await supabase.from('claim_promo').delete().eq('id_claim', id); fetchClaims(); }
      else if (type === 'warranty') { await supabase.from('garansi').delete().eq('id_garansi', id); fetchWarranties(); }
      else if (type === 'promo') { await supabase.from('promosi').delete().eq('id_promo', id); fetchPromos(); }
      else if (type === 'service') { await supabase.from('status_service').delete().eq('id_service', id); fetchServices(); }
      else if (type === 'karyawan') { await supabase.from('karyawan').delete().eq('id_karyawan', id); fetchKaryawans(); }
      else { await supabase.from('budget_approval').delete().eq('id_budget', id); fetchBudgets(); }
   };

   const handleSendReply = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedWa || !replyText.trim()) return;
      await sendWhatsAppMessageViaFonnte(selectedWa, replyText.trim());
      await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', selectedWa);
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: selectedWa, nama_profil_wa: getRealProfileName(selectedWa), arah_pesan: 'OUT', isi_pesan: replyText.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      setReplyText('');
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
      const msg = `Status Claim Promo Anda:\n\nNo Seri: ${c.nomor_seri}\nBarang: ${c.tipe_barang}\nStatus MKT: ${c.validasi_by_mkt}\nStatus FA: ${c.validasi_by_fa}\nJasa Kirim: ${c.nama_jasa_pengiriman || '-'}\nNo Resi: ${c.nomor_resi || '-'}\n\nTerima kasih.`;
      await sendWhatsAppMessageViaFonnte(c.nomor_wa, msg);
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: c.nomor_wa, nama_profil_wa: getRealProfileName(c.nomor_wa), arah_pesan: 'OUT', isi_pesan: msg, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      alert('Pesan status berhasil dikirim!');
      fetchMessages();
   };

   const handleKirimStatusGaransi = async (w: Garansi) => {
      const linked = claims.find(c => c.nomor_seri === w.nomor_seri);
      if (!linked || !linked.nomor_wa) return alert('Gagal: Tidak dapat menemukan Nomor WA (Barang ini tidak ada di tabel Claim Promo).');
      if (!window.confirm('Kirim status garansi ke WA konsumen?')) return;
      const msg = `Status Garansi Anda:\n\nNo Seri: ${w.nomor_seri}\nTipe Barang: ${w.tipe_barang}\nJenis Garansi: ${w.jenis_garansi}\nLama Garansi: ${w.lama_garansi}\nSisa Garansi: ${calculateSisaGaransi(linked.tanggal_pembelian, w.lama_garansi)}\n\nTerima kasih.`;
      await sendWhatsAppMessageViaFonnte(linked.nomor_wa, msg);
      await supabase.from('riwayat_pesan').insert([{ nomor_wa: linked.nomor_wa, nama_profil_wa: getRealProfileName(linked.nomor_wa), arah_pesan: 'OUT', isi_pesan: msg, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
      alert('Pesan status berhasil dikirim!');
      fetchMessages();
   };

   const handleSelesaiCS = async (nomor_wa: string) => {
      try {
         await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', nomor_wa);
         fetchMessages();
      } catch (error: any) {
         console.error('Gagal update CS:', error.message);
      }
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

   const uniqueTipeBarang = Array.from(new Set([...claims.map(c => c.tipe_barang), ...warranties.map(w => w.tipe_barang)])).filter(Boolean);
   const uniqueToko = Array.from(new Set(claims.map(c => c.nama_toko))).filter(Boolean);
   const uniqueJasa = Array.from(new Set(claims.map(c => c.nama_jasa_pengiriman))).filter(Boolean);
   const uniqueJenisPromo = Array.from(new Set([...claims.map(c => c.jenis_promosi), ...promos.map(p => p.nama_promo)])).filter(Boolean);
   const uniqueRoles = Array.from(new Set(karyawans.map(k => k.role))).filter(Boolean);

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

   const filteredContacts = useMemo(() => uniqueContacts.filter(c => {
      const name = getRealProfileName(c.nomor_wa).toLowerCase();
      const num = (c.nomor_wa || "").toLowerCase();
      const search = searchChat.toLowerCase();
      return name.includes(search) || num.includes(search);
   }), [uniqueContacts, searchChat, consumers, messages]);

   const currentChatThread = useMemo(() => {
      if (!selectedWa) return [];
      return messages
         .filter(m => m.nomor_wa === selectedWa)
         .sort((a, b) => {
            const dateA = new Date(a.waktu_pesan || a.created_at || 0).getTime();
            const dateB = new Date(b.waktu_pesan || b.created_at || 0).getTime();
            return dateA - dateB;
         });
   }, [selectedWa, messages]);

   const filteredPromos = useMemo(() => promos.filter(p => {
      const name = (p.nama_promo || "").toLowerCase();
      const start = (p.tanggal_mulai || "").toLowerCase();
      const end = (p.tanggal_selesai || "").toLowerCase();
      const search = searchPromo.toLowerCase();
      return name.includes(search) || start.includes(search) || end.includes(search);
   }), [promos, searchPromo]);

   const filteredClaims = useMemo(() => claims.filter(c => {
      const name = (consumers[c.nomor_wa] || c.nomor_wa || "").toLowerCase();
      const seri = (c.nomor_seri || "").toLowerCase();
      const promo = getNamaPromo(c.tipe_barang).toLowerCase();
      const mkt = (c.validasi_by_mkt || "").toLowerCase();
      const fa = (c.validasi_by_fa || "").toLowerCase();
      const search = searchClaim.toLowerCase();
      return name.includes(search) || seri.includes(search) || promo.includes(search) || mkt.includes(search) || fa.includes(search);
   }), [claims, searchClaim, consumers, promos]);

   const filteredWarranties = useMemo(() => warranties.filter(w => (w.nomor_seri || "").toLowerCase().includes(searchGaransi.toLowerCase())), [warranties, searchGaransi]);

   const filteredServices = useMemo(() => services.filter(s => {
      const ttr = (s.nomor_tanda_terima || "").toLowerCase();
      const seri = (s.nomor_seri || "").toLowerCase();
      const status = (s.status_service || "").toLowerCase();
      const search = searchService.toLowerCase();
      return ttr.includes(search) || seri.includes(search) || status.includes(search);
   }), [services, searchService]);

   const filteredBudgets = useMemo(() => budgets.filter(b => (b.title || "").toLowerCase().includes(searchBudget.toLowerCase())), [budgets, searchBudget]);

   const filteredKaryawans = useMemo(() => karyawans.filter(k => {
      const nama = (k.nama_karyawan || "").toLowerCase();
      const user = (k.username || "").toLowerCase();
      const search = searchKaryawan.toLowerCase();
      return nama.includes(search) || user.includes(search);
   }), [karyawans, searchKaryawan]);

   const ALL_TABS = [
      { id: 'messages', label: '💬 Pesan', count: messages.length },
      { id: 'konsumen', label: '👥 Konsumen', count: consumersList.length },
      { id: 'promos', label: '📢 Promo', count: promos.length },
      { id: 'claims', label: '🎫 Claim', count: claims.length },
      { id: 'warranties', label: '🛡️ Garansi', count: warranties.length },
      { id: 'services', label: '🔧 Service', count: services.length },
      { id: 'budgets', label: '💳 ProposalEvent', count: budgets.length },
      { id: 'import', label: '📦 Import Data', count: undefined },
      { id: 'userrole', label: '🔐 User Role', count: karyawans.length }
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
         <div className="flex items-center justify-center min-h-screen bg-black text-slate-900 relative overflow-hidden">
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#FFE500 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm relative z-10 border-t-4 border-[#FFE500]">
               <div className="text-center mb-8">
                  <div className="bg-black text-[#FFE500] font-black text-3xl tracking-tighter inline-block px-4 py-1 mb-3 -skew-x-6 shadow-md">NIKON</div>
                  <p className="text-sm text-slate-500 font-medium">Masuk untuk mengelola Bot & Data</p>
               </div>
               {loginError && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm mb-4 font-medium shadow-sm">{loginError}</div>}

               {!isForgotPw ? (
                  <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
                     <div>
                        <label className="block text-sm font-bold mb-1.5 text-slate-700">Username</label>
                        <input type="text" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} required className="w-full border-2 border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-black focus:ring-4 focus:ring-black/5 bg-slate-50 text-slate-900 transition-all" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold mb-1.5 text-slate-700">Password</label>
                        <input type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} required className="w-full border-2 border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-black focus:ring-4 focus:ring-black/5 bg-slate-50 text-slate-900 transition-all" />
                     </div>
                     <button type="submit" className="w-full bg-[#FFE500] hover:bg-[#E5CE00] text-black py-3 rounded-lg font-extrabold mt-4 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-[#FFE500]/30">MASUK</button>
                     <div className="text-center mt-5">
                        <button type="button" onClick={() => setIsForgotPw(true)} className="text-sm font-bold text-slate-500 hover:text-black transition-colors">Lupa Password?</button>
                     </div>
                  </form>
               ) : (
                  <form onSubmit={handleForgotPwSubmit} className="space-y-4 animate-fade-in">
                     {forgotPwMessage && <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded text-sm font-medium mb-4">{forgotPwMessage}</div>}
                     <div>
                        <label className="block text-sm font-bold mb-1 text-slate-700">Nomor WhatsApp Terdaftar</label>
                        <input type="text" value={forgotPwUsername} onChange={e => setForgotPwUsername(e.target.value)} required className="w-full border-2 border-slate-200 rounded-lg px-4 py-2.5 outline-none focus:border-black bg-slate-50 text-slate-900" placeholder="Contoh: 62812345678" />
                     </div>
                     <button type="submit" disabled={isSubmitting} className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-bold mt-2 transition disabled:opacity-50">{isSubmitting ? 'Mengirim...' : 'Kirim Password Baru'}</button>
                     <div className="text-center mt-4">
                        <button type="button" onClick={() => { setIsForgotPw(false); setForgotPwMessage(''); setForgotPwUsername(''); }} className="text-sm font-bold text-slate-500 hover:text-slate-800">Kembali ke Login</button>
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
         <div className={`min-h-screen bg-slate-50 pb-12 relative text-slate-900 ${printData ? 'hidden print:hidden' : 'print:hidden'}`}>

            <datalist id="list-tipe-barang">{uniqueTipeBarang.map(t => <option key={t} value={t} />)}</datalist>
            <datalist id="list-nama-toko">{uniqueToko.map(t => <option key={t} value={t} />)}</datalist>
            <datalist id="list-jasa-kirim">{uniqueJasa.map(t => <option key={t} value={t} />)}</datalist>
            <datalist id="list-jenis-promo">{uniqueJenisPromo.map(t => <option key={t} value={t} />)}</datalist>
            <datalist id="list-roles">{uniqueRoles.map(t => <option key={t} value={t} />)}</datalist>

            <header className="bg-black shadow-md border-b-4 border-[#FFE500] px-6 py-4 flex justify-between items-center text-white sticky top-0 z-20">
               <div className="flex items-center gap-4">
                  <div className="bg-[#FFE500] text-black font-black text-xl tracking-tighter px-3 py-1 -skew-x-6">NIKON</div>
                  <div>
                     <h1 className="text-lg font-bold tracking-wide">Alta Nikindo Dashboard</h1>
                     <p className="text-xs text-slate-400 font-medium">Role: <span className="text-[#FFE500]">{currentUser?.role}</span></p>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="hidden md:block text-right">
                     <span className="text-sm font-medium text-slate-300 block">Selamat datang kembali,</span>
                     <span className="text-sm font-bold text-[#FFE500]">{currentUser?.nama_karyawan} 🚀</span>
                  </div>
                  <button onClick={handleLogout} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">Logout</button>
               </div>
            </header>

            <div className="bg-slate-50 border-b border-slate-200 sticky top-[76px] z-10 px-6 w-full shadow-sm">
               <div className="flex flex-wrap gap-2 md:gap-3 justify-center max-w-7xl mx-auto py-3">
                  {visibleTabs.map(tab => (
                     <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-5 py-2 font-bold whitespace-nowrap transition-all rounded-full border ${activeTab === tab.id ? 'bg-[#FFE500] text-black border-[#FFE500] shadow-md transform scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100 hover:text-black'}`}>
                        {tab.label} {tab.count !== undefined && <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${activeTab === tab.id ? 'bg-black/10 text-black' : 'bg-slate-100 text-slate-500'}`}>{tab.count}</span>}
                     </button>
                  ))}
               </div>
            </div>

            <main className="max-w-7xl mx-auto px-6 py-8">

               {/* ======================= IMPORT DATA TAB ======================= */}
               {activeTab === 'import' && (
                  <div className="space-y-8 animate-fade-in text-slate-900">
                     <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Pusat Upload & Update Database</h2>
                        <p className="text-slate-600 mb-6 text-sm">Pilih tabel target, unduh template untuk menyesuaikan kolom, lalu unggah file CSV Anda. Sistem akan melakukan *Upsert* (Update jika data sudah ada, Insert jika data baru).</p>
                        <p>Urutan template yang diupload :</p>
                        <ul className="list-disc list-inside text-slate-600 text-sm mb-6">
                           <li>Template 1: Tabel Konsumen (Wajib jika data konsumen belum ada, jika sudah bisa lanjut ke upload yang lainnya)</li>
                           <li>Template 2: Tabel Claim Promo</li>
                           <li>Template 3: Tabel Garansi</li>
                           <li>Template 4: Tabel Status Service</li>
                        </ul>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                           <div>
                              <label className="block text-sm font-bold mb-2">1. Pilih Tabel Database</label>
                              <select value={importTarget} onChange={e => setImportTarget(e.target.value as any)} className="w-full border border-slate-300 p-3 rounded-md bg-white text-slate-900 outline-none focus:ring-2 focus:ring-black">
                                 <option value="claim_promo">Tabel Claim Promo</option>
                                 <option value="garansi">Tabel Garansi</option>
                                 <option value="konsumen">Tabel Konsumen</option>
                                 <option value="status_service">Tabel Status Service</option>
                              </select>
                           </div>
                           <div>
                              <button onClick={downloadTemplate} className="w-full bg-slate-800 text-white p-3 rounded-md font-bold hover:bg-slate-700 transition">
                                 📥 Unduh Template CSV
                              </button>
                           </div>
                        </div>

                        <div className="mt-10 p-10 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50">
                           <div className="mb-4 text-4xl">📄</div>
                           <h3 className="font-bold text-lg mb-1">Upload File CSV</h3>
                           <p className="text-slate-500 text-sm mb-6">Pastikan file bertipe .csv dan mengikuti format template.</p>
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
               {activeTab !== 'import' && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-wrap gap-4 justify-between items-center text-slate-900 mb-6">
                     <div className="flex gap-4">
                        {activeTab !== 'konsumen' && activeTab !== 'budgets' && activeTab !== 'userrole' && (
                           <>
                              <label className="text-sm font-bold">Dari: <input type="date" value={dateRange.start} onChange={e => setDateRange({ ...dateRange, start: e.target.value })} className="ml-2 border border-slate-300 bg-white text-slate-900 rounded p-1 outline-none focus:border-[#FFE500]" /></label>
                              <label className="text-sm font-bold">Sampai: <input type="date" value={dateRange.end} onChange={e => setDateRange({ ...dateRange, end: e.target.value })} className="ml-2 border border-slate-300 bg-white text-slate-900 rounded p-1 outline-none focus:border-[#FFE500]" /></label>
                           </>
                        )}
                     </div>
                     <div className="flex flex-wrap gap-2 items-center">
                        {activeTab === 'claims' && <button onClick={() => openModal('create', 'claim')} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-4 py-2 rounded-md font-bold text-sm transition shadow-sm">+ Tambah Claim</button>}
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
                  <div className="space-y-6 animate-fade-in text-slate-900">
                     <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                           <div>
                              <h3 className="text-lg font-bold">Interaksi Konsumen</h3>
                              <p className="text-sm text-slate-500">Jumlah konsumen unik yang melakukan chat berdasarkan periode</p>
                           </div>
                           <select value={msgTimeFilter} onChange={e => setMsgTimeFilter(e.target.value as any)} className="border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm font-bold outline-none">
                              <option value="day">Harian</option>
                              <option value="week">Mingguan</option>
                              <option value="month">Bulanan</option>
                           </select>
                        </div>
                        <div className="mb-4">
                           <div className="text-3xl font-extrabold text-black">{currentTotalConsumers} <span className="text-sm font-bold text-slate-500">Total Konsumen Unik</span></div>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                           <BarChart data={messageStats}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="periode" stroke="#64748b" tick={{ fontSize: 12 }} />
                              <YAxis stroke="#64748b" allowDecimals={false} />
                              <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Bar dataKey="jumlah_konsumen" name="Konsumen Unik" fill="#FFE500" radius={[4, 4, 0, 0]} />
                           </BarChart>
                        </ResponsiveContainer>
                     </div>

                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
                           <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white z-10">
                              <span className="font-bold">Percakapan</span>
                              <button onClick={() => setIsNewChatModalOpen(true)} className="bg-blue-100 text-black px-3 py-1 text-xs font-bold rounded hover:bg-blue-200 transition">+ Chat</button>
                           </div>
                           <div className="p-3 border-b border-slate-200 bg-slate-50 z-10">
                              <input type="text" placeholder="🔍 Cari nama / no WA..." value={searchChat} onChange={e => setSearchChat(e.target.value)} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-1.5 text-sm outline-none focus:border-[#FFE500] shadow-sm" />
                           </div>
                           <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                              {filteredContacts.map((c: any) => (
                                 <div key={c.nomor_wa} onClick={() => setSelectedWa(c.nomor_wa)} className={`p-4 cursor-pointer hover:bg-slate-50 transition ${selectedWa === c.nomor_wa ? 'border-l-4 border-[#FFE500] bg-[#FFE500]/10' : 'border-l-4 border-transparent'}`}>
                                    <div className="flex justify-between text-sm">
                                       <span className="font-bold truncate flex items-center gap-2">
                                          {getRealProfileName(c.nomor_wa)}
                                          {c.bicara_dengan_cs && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">🚨 Perlu CS</span>}
                                          {c.arah_pesan === 'IN' && (!readStatus[c.nomor_wa] || new Date(c.waktu_pesan || c.created_at) > new Date(readStatus[c.nomor_wa])) && (
                                             <span className="bg-blue-500 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded-full shadow-sm">Baru</span>
                                          )}
                                       </span>
                                       <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(c.waktu_pesan).toLocaleDateString('id-ID')}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 truncate mt-1">{c.isi_pesan}</div>
                                 </div>
                              ))}
                              {filteredContacts.length === 0 && <div className="p-8 text-center text-slate-400 text-sm font-medium">Tidak ada percakapan</div>}
                           </div>
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-slate-200 lg:col-span-2 flex flex-col h-full overflow-hidden relative">
                           {selectedWa ? (
                              <>
                                 <div className="p-4 border-b border-slate-200 bg-slate-50 z-10 flex justify-between items-center">
                                    <div>
                                       <h3 className="font-bold">{getRealProfileName(selectedWa)}</h3>
                                       <p className="text-xs font-bold text-slate-500">{selectedWa}</p>
                                    </div>
                                    {uniqueContacts.find(c => c.nomor_wa === selectedWa)?.bicara_dengan_cs && (
                                       <button onClick={() => handleSelesaiCS(selectedWa)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1 shadow-sm border border-emerald-300">✅ Tandai Selesai</button>
                                    )}
                                 </div>
                                 <div className="flex-1 p-4 overflow-y-auto space-y-4 relative scroll-smooth" style={{ backgroundColor: '#efeae2', backgroundImage: `url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')`, backgroundSize: '400px', backgroundRepeat: 'repeat' }}>
                                    {currentChatThread.map((msg: any) => (
                                       <div key={msg.id_pesan || Math.random().toString()} className={`flex ${msg.arah_pesan === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                                          <div className={`max-w-[75%] p-2.5 text-sm rounded-lg shadow-sm relative ${msg.arah_pesan === 'OUT' ? 'bg-[#d9fdd3] text-slate-900 font-medium rounded-tr-none' : 'bg-white text-slate-900 font-medium rounded-tl-none'}`}>
                                             {isImageUrl(msg.isi_pesan) ? (
                                                <div className="cursor-pointer" onClick={() => openImageViewer(msg.isi_pesan)}>
                                                   <img src={msg.isi_pesan} alt="Media" className="max-w-full rounded-md max-h-64 object-cover mb-1 hover:opacity-90 transition" />
                                                </div>
                                             ) : (
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.isi_pesan}</p>
                                             )}
                                             <div className="text-[10px] mt-1 text-right text-slate-600 font-bold">
                                                {(() => {
                                                   const d = new Date(msg.waktu_pesan || msg.created_at || 0);
                                                   return isNaN(d.getTime()) ? '-' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                                })()}
                                             </div>
                                          </div>
                                       </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                 </div>
                                 <button onClick={scrollToBottom} className="absolute bottom-20 right-6 bg-white p-2.5 rounded-full shadow-lg border border-slate-200 text-black hover:bg-blue-50 transition-colors z-20">⬇️</button>
                                 <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 flex gap-2 bg-slate-50 z-10 relative">
                                    <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Ketik pesan..." className="flex-1 border border-slate-300 bg-white text-slate-900 rounded-full px-5 py-2.5 text-sm outline-none focus:border-[#FFE500] shadow-sm font-medium" />
                                    <button type="submit" disabled={!replyText.trim()} className="bg-[#FFE500] hover:bg-[#E5CE00] text-black px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 transition shadow-sm">Kirim</button>
                                 </form>
                              </>
                           ) : (
                              <div className="flex-1 flex justify-center items-center text-slate-500 font-bold bg-slate-100">Pilih chat di samping</div>
                           )}
                        </div>
                     </div>
                  </div>
               )}

               {/* ======================= DATA KONSUMEN ======================= */}
               {activeTab === 'konsumen' && (
                  <div className="space-y-4 animate-fade-in text-slate-900">
                     <input type="text" placeholder="🔍 Cari berdasarkan Nama / No Whatsapp / ID Konsumen" value={searchKonsumen} onChange={e => setSearchKonsumen(e.target.value)} className="w-full p-4 border border-slate-300 bg-white text-slate-900 rounded-lg shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {consumersList.filter(k => k.nama_lengkap?.toLowerCase().includes(searchKonsumen.toLowerCase()) || k.nomor_wa.includes(searchKonsumen) || k.id_konsumen?.toLowerCase().includes(searchKonsumen.toLowerCase())).map(k => {
                           const userClaims = claims.filter(c => c.nomor_wa === k.nomor_wa);
                           return (
                              <div key={k.nomor_wa} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col hover:border-[#FFE500] transition">
                                 <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                                    <div>
                                       <h3 className="font-bold text-lg text-slate-800">{k.nama_lengkap || k.nomor_wa}</h3>
                                       <div className="text-sm font-bold text-slate-500 mt-1 flex gap-3">
                                          <span>📱 {k.nomor_wa}</span>
                                          {k.id_konsumen && <span className="text-black">ID: {k.id_konsumen}</span>}
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex-1">
                                    <h4 className="font-bold text-slate-700 text-sm mb-2">Riwayat Barang ({userClaims.length})</h4>
                                    {userClaims.length === 0 ? (
                                       <p className="text-xs font-bold text-slate-400 italic">Belum ada riwayat</p>
                                    ) : (
                                       <div className="space-y-3">
                                          {userClaims.map(c => {
                                             const w = warranties.find(wa => wa.nomor_seri === c.nomor_seri);
                                             const s = services.filter(se => se.nomor_seri === c.nomor_seri);
                                             return (
                                                <div key={c.id_claim} className="text-xs p-3 bg-slate-50 border border-slate-100 rounded-md">
                                                   <div className="font-extrabold text-slate-800 mb-1">{c.tipe_barang} <span className="text-slate-500 font-bold ml-1">(Seri: {c.nomor_seri})</span></div>
                                                   <div className="grid grid-cols-1 gap-1 font-medium text-slate-600 mt-2">
                                                      <div><span className="font-bold text-slate-700">🎫 Claim:</span> {c.validasi_by_mkt} / {c.validasi_by_fa}</div>
                                                      <div><span className="font-bold text-slate-700">🛡️ Garansi:</span> {w ? w.status_validasi : 'Belum Terdaftar'}</div>
                                                      <div><span className="font-bold text-slate-700">🔧 Service:</span> {s.length > 0 ? s.map(se => `[${se.nomor_tanda_terima}] ${se.status_service}`).join(', ') : 'Tidak ada riwayat'}</div>
                                                   </div>
                                                </div>
                                             )
                                          })}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  </div>
               )}

               {/* ======================= PROMOS ======================= */}
               {activeTab === 'promos' && (
                  <div className="space-y-4 animate-fade-in text-slate-900">
                     <input type="text" placeholder="🔍 Cari Nama Promo atau Periode Tanggal..." value={searchPromo} onChange={e => setSearchPromo(e.target.value)} className="w-full p-3 border border-slate-300 bg-white text-slate-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredPromos.map(p => (
                           <div key={p.id_promo} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col hover:border-[#FFE500] transition">
                              <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-3">
                                 <div>
                                    <h3 className="font-bold text-lg text-slate-800">{p.nama_promo}</h3>
                                    <div className="text-sm font-bold text-slate-500 mt-1">📅 {p.tanggal_mulai} s/d {p.tanggal_selesai}</div>
                                 </div>
                                 <span className={`px-2 py-1 rounded text-[10px] font-extrabold tracking-wide ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
                              </div>
                              <div className="flex-1">
                                 <h4 className="font-bold text-slate-700 text-sm mb-2">Tipe Produk Berlaku ({p.tipe_produk?.length || 0})</h4>
                                 {(!p.tipe_produk || p.tipe_produk.length === 0) ? (
                                    <p className="text-xs font-bold text-slate-400 italic">Belum ada produk</p>
                                 ) : (
                                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                                       {p.tipe_produk.map((prod, idx) => (
                                          <div key={idx} className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-md font-bold text-slate-700 flex items-center gap-2">
                                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>{prod.nama_produk}
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                              {currentUser?.role === 'Admin' && (
                                 <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3 justify-end">
                                    <button onClick={() => openModal('edit', 'promo', p)} className="text-black text-xs font-bold hover:underline">Edit Promo</button>
                                    <button onClick={() => handleDelete('promo', p.id_promo!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* ======================= CLAIMS ======================= */}
               {activeTab === 'claims' && (
                  <div className="space-y-4 animate-fade-in text-slate-900">
                     <input type="text" placeholder="🔍 Cari Nama / No Seri / Nama Promo / Status MKT / Status FA..." value={searchClaim} onChange={e => setSearchClaim(e.target.value)} className="w-full p-3 border border-slate-300 bg-white text-slate-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                 <th className="px-4 py-3 text-left font-bold">Nama</th>
                                 <th className="px-4 py-3 text-left font-bold">No Seri</th>
                                 <th className="px-4 py-3 text-left font-bold">Barang</th>
                                 <th className="px-4 py-3 text-left font-bold">Nama Promo</th>
                                 <th className="px-4 py-3 text-left font-bold">Tgl Beli</th>
                                 <th className="px-4 py-3 text-left font-bold">Toko</th>
                                 <th className="px-4 py-3 text-left font-bold">Nota/Garansi</th>
                                 <th className="px-4 py-3 text-left font-bold">MKT / FA</th>
                                 <th className="px-4 py-3 text-left font-bold">Aksi</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {filteredClaims.map(c => (
                                 <tr key={c.id_claim} className="whitespace-nowrap hover:bg-slate-50 font-medium">
                                    <td className="px-4 py-3 text-slate-800 font-bold">{consumers[c.nomor_wa] || c.nomor_wa}</td>
                                    <td className="px-4 py-3 font-mono">{c.nomor_seri}</td>
                                    <td className="px-4 py-3">{c.tipe_barang}</td>
                                    <td className="px-4 py-3 font-bold text-black">{getNamaPromo(c.tipe_barang)}</td>
                                    <td className="px-4 py-3">{c.tanggal_pembelian}</td>
                                    <td className="px-4 py-3">{c.nama_toko || '-'}</td>
                                    <td className="px-4 py-3 text-black font-bold text-xs flex flex-col gap-1 whitespace-normal">
                                       {c.link_nota_pembelian ? (
                                          <button type="button" onClick={() => openImageViewer(c.link_nota_pembelian as string)} className="hover:underline hover:text-blue-800 text-left">🔗 Lihat Nota</button>
                                       ) : (
                                          <span className="text-slate-500 italic">Tidak ada Nota</span>
                                       )}
                                       {c.link_kartu_garansi ? (
                                          <button type="button" onClick={() => openImageViewer(c.link_kartu_garansi as string)} className="hover:underline hover:text-blue-800 text-left">🔗 Lihat Garansi</button>
                                       ) : (
                                          <span className="text-slate-500 italic">Tidak ada Garansi</span>
                                       )}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-bold">{c.validasi_by_mkt} / {c.validasi_by_fa}</td>
                                    <td className="px-4 py-3">
                                       <div className="flex gap-3 items-center">
                                          <button onClick={() => handleKirimStatusClaim(c)} className="text-emerald-600 text-xs font-bold hover:underline" title="Kirim WA Status">Kirim Status</button>
                                          <div className="w-px h-3 bg-slate-300"></div>
                                          <button onClick={() => openModal('edit', 'claim', c)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                          <button onClick={() => handleDelete('claim', c.id_claim!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                       </div>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* ======================= WARRANTIES ======================= */}
               {activeTab === 'warranties' && (
                  <div className="space-y-4 animate-fade-in text-slate-900">
                     <input type="text" placeholder="🔍 Cari Nomor Seri..." value={searchGaransi} onChange={e => setSearchGaransi(e.target.value)} className="w-full p-3 border border-slate-300 bg-white text-slate-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                 <th className="px-4 py-3 text-left font-bold">No Seri</th>
                                 <th className="px-4 py-3 text-left font-bold">Barang</th>
                                 <th className="px-4 py-3 text-left font-bold">Nota/Garansi</th>
                                 <th className="px-4 py-3 text-left font-bold">Status</th>
                                 <th className="px-4 py-3 text-left font-bold">Jenis</th>
                                 <th className="px-4 py-3 text-left font-bold">Sisa Garansi</th>
                                 <th className="px-4 py-3 text-left font-bold">Aksi</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {filteredWarranties.map(w => {
                                 const linked = claims.find(c => c.nomor_seri === w.nomor_seri);
                                 const linkNota = w.link_nota_pembelian || linked?.link_nota_pembelian;
                                 const linkGaransi = w.link_kartu_garansi || linked?.link_kartu_garansi;
                                 return (
                                    <tr key={w.id_garansi} className="whitespace-nowrap hover:bg-slate-50 font-medium">
                                       <td className="px-4 py-3 font-mono font-bold">{w.nomor_seri}</td>
                                       <td className="px-4 py-3">{w.tipe_barang}</td>
                                       <td className="px-4 py-3 text-black font-bold text-xs flex flex-col gap-1 whitespace-normal">
                                          {linkNota ? (
                                             <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => openImageViewer(linkNota as string)} className="hover:underline hover:text-blue-800 text-left">🔗 Lihat Nota</button>
                                                {!w.link_nota_pembelian && linked?.link_nota_pembelian && (
                                                   <span className="bg-blue-100 text-blue-700 px-1 rounded-[2px] text-[9px] font-black uppercase">Claim</span>
                                                )}
                                             </div>
                                          ) : (
                                             <span className="text-slate-500 italic">Tidak ada Nota</span>
                                          )}
                                          {linkGaransi ? (
                                             <div className="flex items-center gap-1">
                                                <button type="button" onClick={() => openImageViewer(linkGaransi as string)} className="hover:underline hover:text-blue-800 text-left">🔗 Lihat Garansi</button>
                                                {!w.link_kartu_garansi && linked?.link_kartu_garansi && (
                                                   <span className="bg-blue-100 text-blue-700 px-1 rounded-[2px] text-[9px] font-black uppercase">Claim</span>
                                                )}
                                             </div>
                                          ) : (
                                             <span className="text-slate-500 italic">Tidak ada Garansi</span>
                                          )}
                                       </td>
                                       <td className="px-4 py-3">
                                          <span className={`px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${w.status_validasi === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{w.status_validasi}</span>
                                       </td>
                                       <td className="px-4 py-3">{w.jenis_garansi}</td>
                                       <td className="px-4 py-3 font-bold text-slate-700">{calculateSisaGaransi(linked?.tanggal_pembelian, w.lama_garansi)}</td>
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
                  </div>
               )}

               {/* ======================= SERVICES ======================= */}
               {activeTab === 'services' && (
                  <div className="space-y-4 animate-fade-in text-slate-900">
                     <input type="text" placeholder="🔍 Cari No Tanda Terima / No Seri / Status..." value={searchService} onChange={e => setSearchService(e.target.value)} className="w-full p-3 border border-slate-300 bg-white text-slate-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                 <th className="px-6 py-3 text-left font-bold">No Tanda Terima</th>
                                 <th className="px-6 py-3 text-left font-bold">No Seri Barang</th>
                                 <th className="px-6 py-3 text-left font-bold">Status Service</th>
                                 <th className="px-6 py-3 text-left font-bold">Tgl Update</th>
                                 <th className="px-6 py-3 text-left font-bold">Aksi</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {filteredServices.map(s => (
                                 <tr key={s.id_service} className="whitespace-nowrap hover:bg-slate-50 font-medium">
                                    <td className="px-6 py-3 font-mono font-bold text-slate-800">{s.nomor_tanda_terima}</td>
                                    <td className="px-6 py-3">{s.nomor_seri}</td>
                                    <td className="px-6 py-3">
                                       <span className="px-2 py-1 rounded text-[10px] tracking-wide font-extrabold bg-blue-100 text-blue-800 uppercase">{s.status_service}</span>
                                    </td>
                                    <td className="px-6 py-3 font-bold text-slate-500">{s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}</td>
                                    <td className="px-6 py-3 flex gap-3">
                                       <button onClick={() => openModal('edit', 'service', s)} className="text-black text-xs font-bold hover:underline">Edit</button>
                                       <button onClick={() => handleDelete('service', s.id_service!)} className="text-red-600 text-xs font-bold hover:underline">Hapus</button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

               {/* ======================= PROPOSAL EVENT ======================= */}
               {activeTab === 'budgets' && (
                  <div className="space-y-4 animate-fade-in text-slate-900">
                     <input type="text" placeholder="🔍 Cari Title Proposal..." value={searchBudget} onChange={e => setSearchBudget(e.target.value)} className="w-full p-3 border border-slate-300 bg-white text-slate-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                 <th className="px-6 py-3 text-left font-bold">Proposal No</th>
                                 <th className="px-6 py-3 text-left font-bold">Title</th>
                                 <th className="px-6 py-3 text-left font-bold">Period</th>
                                 <th className="px-6 py-3 text-left font-bold">Total Cost</th>
                                 <th className="px-6 py-3 text-left font-bold">Aksi</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {filteredBudgets.map(b => (
                                 <tr key={b.id_budget} className="whitespace-nowrap hover:bg-slate-50 font-medium">
                                    <td className="px-6 py-3 font-mono font-bold text-slate-800">{b.proposal_no}</td>
                                    <td className="px-6 py-3">{b.title}</td>
                                    <td className="px-6 py-3">{b.period}</td>
                                    <td className="px-6 py-3 font-bold text-slate-700">Rp {Number(b.total_cost).toLocaleString('id-ID')}</td>
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
                  </div>
               )}

               {/* ======================= USER ROLE ======================= */}
               {activeTab === 'userrole' && currentUser?.role === 'Admin' && (
                  <div className="space-y-4 animate-fade-in text-slate-900">
                     <input type="text" placeholder="🔍 Cari Username atau Nama Karyawan..." value={searchKaryawan} onChange={e => setSearchKaryawan(e.target.value)} className="w-full p-3 border border-slate-300 bg-white text-slate-900 rounded-md shadow-sm outline-none focus:border-[#FFE500] text-sm font-medium" />
                     <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="bg-slate-50 border-b border-slate-200 whitespace-nowrap">
                              <tr>
                                 <th className="px-6 py-3 text-left font-bold">Username</th>
                                 <th className="px-6 py-3 text-left font-bold">Nama Karyawan</th>
                                 <th className="px-6 py-3 text-left font-bold">Role</th>
                                 <th className="px-6 py-3 text-left font-bold">Status</th>
                                 <th className="px-6 py-3 text-left font-bold">Akses Halaman</th>
                                 <th className="px-6 py-3 text-left font-bold">Aksi</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200">
                              {filteredKaryawans.map(k => (
                                 <tr key={k.id_karyawan} className="whitespace-nowrap hover:bg-slate-50 font-medium">
                                    <td className="px-6 py-3 font-bold text-slate-800">{k.username}</td>
                                    <td className="px-6 py-3">{k.nama_karyawan}</td>
                                    <td className="px-6 py-3 font-bold text-black">{k.role}</td>
                                    <td className="px-6 py-3">
                                       <span className={`px-2 py-1 rounded text-[10px] tracking-wide font-extrabold ${k.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{k.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
                                    </td>
                                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{k.role === 'Admin' ? 'Semua Akses' : (k.akses_halaman || []).join(', ')}</td>
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
                  </div>
               )}

            </main>

            {/* --- MODALS NEW CHAT --- */}
            {isNewChatModalOpen && (
               <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 text-slate-900">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
                     <h2 className="text-lg font-bold">Pesan Baru</h2>
                     <input type="text" value={newChatWa} onChange={e => setNewChatWa(e.target.value)} placeholder="No WA (Contoh: 0812...)" className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                     <textarea rows={4} value={newChatMsg} onChange={e => setNewChatMsg(e.target.value)} placeholder="Isi pesan..." className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]"></textarea>
                     <div className="flex justify-end gap-3">
                        <button onClick={() => setIsNewChatModalOpen(false)} className="px-4 py-2 border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 rounded-md text-sm font-bold transition">Batal</button>
                        <button onClick={handleSendNewChat} className="px-4 py-2 bg-[#FFE500] hover:bg-[#E5CE00] text-black rounded-md text-sm font-bold transition disabled:opacity-50" disabled={!newChatWa || !newChatMsg}>Kirim</button>
                     </div>
                  </div>
               </div>
            )}

            {/* --- MODALS CREATE / EDIT --- */}
            {isModalOpen && (
               <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 text-slate-900">
                  <div className={`bg-white rounded-xl shadow-2xl w-full ${activeTab === 'budgets' ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden flex flex-col max-h-[90vh]`}>
                     <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold">{modalAction === 'create' ? 'Tambah' : modalAction === 'reset_pw' ? 'Reset Password' : 'Edit'} Data</h2>
                        <button onClick={closeModal} className="text-2xl text-slate-400 hover:text-slate-700 leading-none transition">×</button>
                     </div>

                     <div className="p-6 overflow-y-auto">

                        {activeTab === 'claims' && (
                           <form id="claimForm" onSubmit={handleSaveClaim} className="space-y-4">
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor WA</label>
                                 <input required type="text" value={claimForm.nomor_wa || ''} onChange={e => setClaimForm({ ...claimForm, nomor_wa: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor Seri</label>
                                 <input required type="text" value={claimForm.nomor_seri || ''} onChange={e => setClaimForm({ ...claimForm, nomor_seri: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Tipe Barang</label>
                                    <input type="text" list="list-tipe-barang" value={claimForm.tipe_barang || ''} onChange={e => setClaimForm({ ...claimForm, tipe_barang: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Tgl Pembelian</label>
                                    <input type="date" value={claimForm.tanggal_pembelian || ''} onChange={e => setClaimForm({ ...claimForm, tanggal_pembelian: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                              </div>

                              {(modalAction === 'edit' && (claimForm.link_kartu_garansi || claimForm.link_nota_pembelian)) && (
                                 <div className="bg-blue-50 p-3 rounded-md border border-blue-100 flex flex-col gap-2">
                                    <span className="text-xs font-bold text-blue-800">Dokumen Lampiran (Klik untuk Buka):</span>
                                    {claimForm.link_nota_pembelian ? (
                                       <button type="button" onClick={() => openImageViewer(claimForm.link_nota_pembelian as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Link Nota Pembelian</button>
                                    ) : (
                                       <span className="text-xs font-bold text-slate-500 italic">Tidak ada link Nota Pembelian</span>
                                    )}
                                    {claimForm.link_kartu_garansi ? (
                                       <button type="button" onClick={() => openImageViewer(claimForm.link_kartu_garansi as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Link Kartu Garansi</button>
                                    ) : (
                                       <span className="text-xs font-bold text-slate-500 italic">Tidak ada link Kartu Garansi</span>
                                    )}
                                 </div>
                              )}

                              {/* New file upload section for ClaimForm */}
                              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md space-y-3">
                                 <label className="block text-sm font-bold text-slate-900">Upload Nota Pembelian</label>
                                 <input type="file" accept="image/*,application/pdf" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) setClaimForm(prev => ({ ...prev, link_nota_pembelian: file as any }));
                                 }} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-1.5 text-sm" />
                                 {claimForm.link_nota_pembelian && (
                                    <div className="flex items-center gap-2 mt-2">
                                       <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                                          {claimForm.link_nota_pembelian instanceof File ? `File baru: ${claimForm.link_nota_pembelian.name}` : `URL: ${String(claimForm.link_nota_pembelian).substring(0, 30)}...`}
                                       </span>
                                       <button type="button" onClick={() => setClaimForm(prev => ({ ...prev, link_nota_pembelian: null as any }))} className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs hover:bg-red-200 transition">Hapus</button>
                                    </div>
                                 )}

                                 <label className="block text-sm font-bold text-slate-900 mt-4">Upload Kartu Garansi</label>
                                 <input type="file" accept="image/*,application/pdf" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) setClaimForm(prev => ({ ...prev, link_kartu_garansi: file as any }));
                                 }} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-1.5 text-sm" />
                                 {claimForm.link_kartu_garansi && (
                                    <div className="flex items-center gap-2 mt-2">
                                       <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                                          {claimForm.link_kartu_garansi instanceof File ? `File baru: ${claimForm.link_kartu_garansi.name}` : `URL: ${String(claimForm.link_kartu_garansi).substring(0, 30)}...`}
                                       </span>
                                       <button type="button" onClick={() => setClaimForm(prev => ({ ...prev, link_kartu_garansi: null as any }))} className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs hover:bg-red-200 transition">Hapus</button>
                                    </div>
                                 )}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Validasi MKT</label>
                                    <select value={claimForm.validasi_by_mkt || ''} onChange={e => setClaimForm({ ...claimForm, validasi_by_mkt: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Tidak Valid">Tidak Valid</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Validasi FA</label>
                                    <select value={claimForm.validasi_by_fa || ''} onChange={e => setClaimForm({ ...claimForm, validasi_by_fa: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Tidak Valid">Tidak Valid</option>
                                    </select>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-3 rounded-md">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Nama Toko</label>
                                    <input type="text" list="list-nama-toko" value={claimForm.nama_toko || ''} onChange={e => setClaimForm({ ...claimForm, nama_toko: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Ketik nama toko..." />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Jenis Promosi</label>
                                    <input type="text" list="list-jenis-promo" value={claimForm.jenis_promosi || ''} onChange={e => setClaimForm({ ...claimForm, jenis_promosi: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Ketik jenis promo..." />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Jasa Pengiriman</label>
                                    <input type="text" list="list-jasa-kirim" value={claimForm.nama_jasa_pengiriman || ''} onChange={e => setClaimForm({ ...claimForm, nama_jasa_pengiriman: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="JNE / J&T / dll" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Nomor Resi</label>
                                    <input type="text" value={claimForm.nomor_resi || ''} onChange={e => setClaimForm({ ...claimForm, nomor_resi: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Masukkan nomor resi..." />
                                 </div>
                              </div>
                           </form>
                        )}

                        {activeTab === 'warranties' && (
                           <form id="warrantyForm" onSubmit={handleSaveWarranty} className="space-y-4">
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor Seri</label>
                                 <input required type="text" value={warrantyForm.nomor_seri || ''} onChange={e => setWarrantyForm({ ...warrantyForm, nomor_seri: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Tipe Barang</label>
                                 <input required type="text" list="list-tipe-barang" value={warrantyForm.tipe_barang || ''} onChange={e => setWarrantyForm({ ...warrantyForm, tipe_barang: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
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
                                             {n ? <button type="button" onClick={() => openImageViewer(n as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Lihat Bukti Nota</button> : <span className="text-xs font-bold text-slate-500 italic">Tidak ada link Nota</span>}
                                             {g ? <button type="button" onClick={() => openImageViewer(g as string)} className="text-sm font-bold text-black hover:text-blue-800 hover:underline break-all text-left">🔗 Lihat Bukti Kartu Garansi</button> : <span className="text-xs font-bold text-slate-500 italic">Tidak ada link Kartu Garansi</span>}
                                          </>
                                       );
                                    })()}
                                 </div>
                              )}

                              {/* New file upload section for WarrantyForm */}
                              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md space-y-3">
                                 <label className="block text-sm font-bold text-slate-900">Upload Nota Pembelian</label>
                                 <input type="file" accept="image/*,application/pdf" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) setWarrantyForm(prev => ({ ...prev, link_nota_pembelian: file as any }));
                                 }} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-1.5 text-sm" />
                                 {warrantyForm.link_nota_pembelian && (
                                    <div className="flex items-center gap-2 mt-2">
                                       <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                                          {warrantyForm.link_nota_pembelian instanceof File ? `File baru: ${warrantyForm.link_nota_pembelian.name}` : `URL: ${String(warrantyForm.link_nota_pembelian).substring(0, 30)}...`}
                                       </span>
                                       <button type="button" onClick={() => setWarrantyForm(prev => ({ ...prev, link_nota_pembelian: null as any }))} className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs hover:bg-red-200 transition">Hapus</button>
                                    </div>
                                 )}

                                 <label className="block text-sm font-bold text-slate-900 mt-4">Upload Kartu Garansi</label>
                                 <input type="file" accept="image/*,application/pdf" onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) setWarrantyForm(prev => ({ ...prev, link_kartu_garansi: file as any }));
                                 }} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-1.5 text-sm" />
                                 {warrantyForm.link_kartu_garansi && (
                                    <div className="flex items-center gap-2 mt-2">
                                       <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                                          {warrantyForm.link_kartu_garansi instanceof File ? `File baru: ${warrantyForm.link_kartu_garansi.name}` : `URL: ${String(warrantyForm.link_kartu_garansi).substring(0, 30)}...`}
                                       </span>
                                       <button type="button" onClick={() => setWarrantyForm(prev => ({ ...prev, link_kartu_garansi: null as any }))} className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-xs hover:bg-red-200 transition">Hapus</button>
                                    </div>
                                 )}
                              </div>
                              <div className="grid grid-cols-3 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Status Validasi</label>
                                    <select value={warrantyForm.status_validasi || ''} onChange={e => setWarrantyForm({ ...warrantyForm, status_validasi: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="Menunggu">Menunggu</option>
                                       <option value="Valid">Valid</option>
                                       <option value="Tidak Valid">Tidak Valid</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Jenis Garansi</label>
                                    <select value={warrantyForm.jenis_garansi || ''} onChange={e => setWarrantyForm({ ...warrantyForm, jenis_garansi: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
                                       <option value="Jasa 30%">Jasa 30%</option>
                                       <option value="Extended to 2 Year">Extended to 2 Year</option>
                                    </select>
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Lama Garansi</label>
                                    <select value={warrantyForm.lama_garansi || ''} onChange={e => setWarrantyForm({ ...warrantyForm, lama_garansi: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]">
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
                                 <input required type="text" list="list-jenis-promo" value={promoForm.nama_promo || ''} onChange={e => setPromoForm({ ...promoForm, nama_promo: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Tgl Mulai</label>
                                    <input required type="date" value={promoForm.tanggal_mulai || ''} onChange={e => setPromoForm({ ...promoForm, tanggal_mulai: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Tgl Selesai</label>
                                    <input required type="date" value={promoForm.tanggal_selesai || ''} onChange={e => setPromoForm({ ...promoForm, tanggal_selesai: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                 </div>
                              </div>
                              <div>
                                 <label className="flex items-center gap-2">
                                    <input type="checkbox" checked={promoForm.status_aktif || false} onChange={e => setPromoForm({ ...promoForm, status_aktif: e.target.checked })} className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black" />
                                    <span className="text-sm font-bold text-slate-900">Promo Aktif</span>
                                 </label>
                              </div>

                              <div className="mt-4 border-t border-slate-200 pt-4 bg-slate-50 p-4 rounded-md">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-slate-900">Tipe Produk yang Berlaku</label>
                                    <button type="button" onClick={() => setPromoForm({ ...promoForm, tipe_produk: [...(promoForm.tipe_produk || []), { nama_produk: '' }] })} className="bg-white border border-slate-300 px-3 py-1 rounded text-xs font-bold hover:bg-slate-100 transition text-slate-900">+ Tambah Produk</button>
                                 </div>
                                 {promoForm.tipe_produk?.map((item, index) => (
                                    <div key={index} className="flex gap-2 mb-2 items-center">
                                       <div className="flex-1">
                                          <input type="text" list="list-tipe-barang" required value={item.nama_produk} onChange={e => { const newItems = [...(promoForm.tipe_produk || [])]; newItems[index].nama_produk = e.target.value; setPromoForm({ ...promoForm, tipe_produk: newItems }) }} className="w-full border border-slate-300 bg-white text-slate-900 rounded px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Ketik nama produk..." />
                                       </div>
                                       <button type="button" onClick={() => { const newItems = [...(promoForm.tipe_produk || [])]; newItems.splice(index, 1); setPromoForm({ ...promoForm, tipe_produk: newItems }); }} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-2 rounded text-sm transition border border-red-200">X</button>
                                    </div>
                                 ))}
                                 {(!promoForm.tipe_produk || promoForm.tipe_produk.length === 0) && <p className="text-xs font-bold text-slate-500 italic mt-2">Belum ada produk ditambahkan</p>}
                              </div>
                           </form>
                        )}

                        {activeTab === 'services' && (
                           <form id="serviceForm" onSubmit={handleSaveService} className="space-y-4">
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor Tanda Terima</label>
                                 <input required type="text" value={serviceForm.nomor_tanda_terima || ''} onChange={e => setServiceForm({ ...serviceForm, nomor_tanda_terima: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Masukkan ID/Resi service" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Nomor Seri</label>
                                 <input required type="text" value={serviceForm.nomor_seri || ''} onChange={e => setServiceForm({ ...serviceForm, nomor_seri: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Status Service</label>
                                 <input required type="text" list="list-status-service" value={serviceForm.status_service || ''} onChange={e => setServiceForm({ ...serviceForm, status_service: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Contoh: Menunggu Sparepart / Selesai" />
                              </div>
                           </form>
                        )}

                        {activeTab === 'budgets' && (
                           <form id="budgetForm" onSubmit={handleSaveBudget} className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Proposal No</label>
                                    <input required type="text" value={budgetForm.proposal_no || ''} onChange={e => setBudgetForm({ ...budgetForm, proposal_no: e.target.value })} className="w-full border border-slate-300 bg-slate-100 text-slate-900 rounded-md px-3 py-2 text-sm font-mono" readOnly />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Title</label>
                                    <input required type="text" value={budgetForm.title || ''} onChange={e => setBudgetForm({ ...budgetForm, title: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" />
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Period (Tanggal)</label>
                                    <input required type="date" value={budgetForm.period || ''} onChange={e => setBudgetForm({ ...budgetForm, period: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" />
                                 </div>
                                 <div>
                                    <label className="block text-sm font-bold mb-1">Budget Source</label>
                                    <input required type="text" list="list-budget-source" value={budgetForm.budget_source || ''} onChange={e => setBudgetForm({ ...budgetForm, budget_source: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" />
                                 </div>
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Objectives</label>
                                 <textarea required rows={2} value={budgetForm.objectives || ''} onChange={e => setBudgetForm({ ...budgetForm, objectives: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Detail of Activity</label>
                                 <textarea required rows={2} value={budgetForm.detail_activity || ''} onChange={e => setBudgetForm({ ...budgetForm, detail_activity: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" />
                              </div>
                              <div>
                                 <label className="block text-sm font-bold mb-1">Expected Result</label>
                                 <textarea required rows={2} value={budgetForm.expected_result || ''} onChange={e => setBudgetForm({ ...budgetForm, expected_result: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" />
                              </div>

                              <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-4">
                                 <label className="block text-sm font-bold text-slate-900 border-b border-slate-200 pb-2">Nama Penandatangan (Approval)</label>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                       <label className="block text-[11px] font-bold text-slate-600 mb-1">Proposed By</label>
                                       <input type="text" value={budgetForm.drafter_name || ''} onChange={e => setBudgetForm({ ...budgetForm, drafter_name: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" placeholder="Nama Pembuat" />
                                    </div>
                                    <div>
                                       <label className="block text-[11px] font-bold text-slate-600 mb-1">Mgt. Comment 1</label>
                                       <input type="text" value={budgetForm.mgt_comment_1 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_comment_1: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" placeholder="Kosongkan jika tidak perlu" />
                                    </div>
                                    <div>
                                       <label className="block text-[11px] font-bold text-slate-600 mb-1">Mgt. Comment 2</label>
                                       <input type="text" value={budgetForm.mgt_comment_2 || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_comment_2: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" placeholder="Kosongkan jika tidak perlu" />
                                    </div>
                                    <div>
                                       <label className="block text-[11px] font-bold text-slate-600 mb-1">Mgt. Consent</label>
                                       <input type="text" value={budgetForm.mgt_consent || ''} onChange={e => setBudgetForm({ ...budgetForm, mgt_consent: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" placeholder="Contoh: Larry Handra" />
                                    </div>
                                    <div>
                                       <label className="block text-[11px] font-bold text-slate-600 mb-1">Finance Consent</label>
                                       <input type="text" value={budgetForm.finance_consent || ''} onChange={e => setBudgetForm({ ...budgetForm, finance_consent: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm" placeholder="Nama Finance" />
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
                                             }} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-2 py-1 text-xs" />
                                             {budgetForm.attachment_urls?.[i] && (
                                                <button type="button" onClick={() => {
                                                   const newUrls = [...(budgetForm.attachment_urls || [])];
                                                   newUrls[i] = null;
                                                   setBudgetForm({ ...budgetForm, attachment_urls: newUrls });
                                                }} className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-[10px] hover:bg-red-200 transition">×</button>
                                             )}
                                          </div>
                                          {budgetForm.attachment_urls?.[i] && (
                                             <div className="border rounded p-1 bg-slate-50 text-center">
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
                              <div className="mt-6 border-t border-slate-200 pt-4 bg-slate-50 p-4 rounded-md">
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-bold text-slate-900">Rincian Budget (Items)</label>
                                    <button type="button" onClick={() => setBudgetForm({ ...budgetForm, items: [...(budgetForm.items || []), { purpose: '', qty: 1, cost_unit: 0, value: 0 }] })} className="bg-white border border-slate-300 px-3 py-1 rounded text-xs font-bold hover:bg-slate-100 transition text-slate-900">+ Tambah Item</button>
                                 </div>
                                 {budgetForm.items?.map((item, index) => (
                                    <div key={index} className="flex gap-2 mb-2 items-end">
                                       <div className="flex-1">
                                          <label className="text-xs font-bold text-slate-700">Purpose</label>
                                          <input type="text" value={item.purpose} onChange={e => { const newItems = [...(budgetForm.items || [])]; newItems[index].purpose = e.target.value; setBudgetForm({ ...budgetForm, items: newItems }) }} className="w-full border border-slate-300 bg-white text-slate-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                       <div className="w-16">
                                          <label className="text-xs font-bold text-slate-700">Qty</label>
                                          <input type="number" value={item.qty} onChange={e => { const newItems = [...(budgetForm.items || [])]; newItems[index].qty = Number(e.target.value); newItems[index].value = newItems[index].qty * newItems[index].cost_unit; setBudgetForm({ ...budgetForm, items: newItems }) }} className="w-full border border-slate-300 bg-white text-slate-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                       <div className="w-32">
                                          <label className="text-xs font-bold text-slate-700">Cost/Unit</label>
                                          <input type="number" value={item.cost_unit} onChange={e => { const newItems = [...(budgetForm.items || [])]; newItems[index].cost_unit = Number(e.target.value); newItems[index].value = newItems[index].qty * newItems[index].cost_unit; setBudgetForm({ ...budgetForm, items: newItems }) }} className="w-full border border-slate-300 bg-white text-slate-900 rounded px-2 py-1 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                       <div className="w-32">
                                          <label className="text-xs font-bold text-slate-700">Value (Auto)</label>
                                          <input type="number" readOnly value={item.value} className="w-full border border-slate-300 bg-slate-100 text-slate-600 rounded px-2 py-1 text-sm font-mono" />
                                       </div>
                                       <button type="button" onClick={() => { const newItems = [...(budgetForm.items || [])]; newItems.splice(index, 1); setBudgetForm({ ...budgetForm, items: newItems }); }} className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1.5 rounded text-sm mb-0.5 transition border border-red-200">X</button>
                                    </div>
                                 ))}
                                 <div className="flex justify-end items-center mt-4 gap-4">
                                    <button type="button" onClick={() => { const total = (budgetForm.items || []).reduce((acc, curr) => acc + curr.value, 0); setBudgetForm({ ...budgetForm, total_cost: total }); }} className="text-xs font-bold text-black hover:text-blue-800 hover:underline transition">Hitung Ulang Total</button>
                                    <div className="font-bold text-slate-900">Total Cost: Rp {Number(budgetForm.total_cost || 0).toLocaleString('id-ID')}</div>
                                 </div>
                              </div>
                           </form>
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
                                       <input required type="password" value={karyawanForm.password || ''} onChange={e => setKaryawanForm({ ...karyawanForm, password: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" placeholder="Minimal 6 karakter..." />
                                    </div>
                                 </>
                              ) : (
                                 <>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Nama Karyawan</label>
                                          <input required type="text" value={karyawanForm.nama_karyawan || ''} onChange={e => setKaryawanForm({ ...karyawanForm, nama_karyawan: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Nomor WhatsApp (Reset Pw)</label>
                                          <input required type="text" placeholder="62812345..." value={karyawanForm.nomor_wa || ''} onChange={e => setKaryawanForm({ ...karyawanForm, nomor_wa: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Username Login</label>
                                          <input required type="text" value={karyawanForm.username || ''} onChange={e => setKaryawanForm({ ...karyawanForm, username: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={karyawanForm.username === 'admin'} />
                                       </div>
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Password {modalAction === 'edit' && <span className="text-[10px] font-normal text-slate-500">(Kosongkan jika tidak diubah)</span>}</label>
                                          <input type="password" value={karyawanForm.password || ''} onChange={e => setKaryawanForm({ ...karyawanForm, password: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" />
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Role Akun</label>
                                          <input type="text" list="list-roles" value={karyawanForm.role || ''} onChange={e => setKaryawanForm({ ...karyawanForm, role: e.target.value })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={karyawanForm.username === 'admin'} placeholder="Ketik atau pilih role..." />
                                       </div>
                                       <div>
                                          <label className="block text-sm font-bold mb-1">Status Akun</label>
                                          <select value={karyawanForm.status_aktif ? 'true' : 'false'} onChange={e => setKaryawanForm({ ...karyawanForm, status_aktif: e.target.value === 'true' })} className="w-full border border-slate-300 bg-white text-slate-900 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FFE500]" disabled={karyawanForm.username === 'admin'}>
                                             <option value="true">Aktif</option>
                                             <option value="false">Tidak Aktif (Blokir)</option>
                                          </select>
                                       </div>
                                    </div>
                                    <div className="mt-4 border-t border-slate-200 pt-4 bg-slate-50 p-4 rounded-md">
                                       <label className="block text-sm font-bold text-slate-900 mb-2">Akses Halaman yang Diizinkan</label>
                                       <p className="text-xs font-bold text-slate-500 mb-3">Pilih tab mana saja yang boleh dilihat oleh karyawan ini.</p>
                                       <div className="grid grid-cols-2 gap-2">
                                          {[{ id: 'messages', label: 'Pesan' }, { id: 'konsumen', label: 'Konsumen' }, { id: 'promos', label: 'Promo' }, { id: 'claims', label: 'Claim' }, { id: 'warranties', label: 'Garansi' }, { id: 'services', label: 'Service' }, { id: 'budgets', label: 'ProposalEvent' }, { id: 'import', label: 'Import Data' }].map(tab => {
                                             const isChecked = (karyawanForm.akses_halaman || []).includes(tab.id) || karyawanForm.role === 'Admin';
                                             return (
                                                <label key={tab.id} className={`flex items-center gap-2 p-2 rounded border ${isChecked ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'} cursor-pointer`}>
                                                   <input type="checkbox" checked={isChecked} disabled={karyawanForm.role === 'Admin'} onChange={() => {
                                                      const current = karyawanForm.akses_halaman || [];
                                                      if (current.includes(tab.id)) setKaryawanForm({ ...karyawanForm, akses_halaman: current.filter(x => x !== tab.id) });
                                                      else setKaryawanForm({ ...karyawanForm, akses_halaman: [...current, tab.id] });
                                                   }} className="w-4 h-4 text-black rounded focus:ring-black" />
                                                   <span className="text-sm font-bold text-slate-700">{tab.label}</span>
                                                </label>
                                             )
                                          })}
                                       </div>
                                    </div>
                                 </>
                              )}
                           </form>
                        )}
                     </div>
                     <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                        <button onClick={closeModal} className="px-4 py-2 border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 rounded-md text-sm font-bold transition">Batal</button>
                        <button type="submit" form={activeTab === 'claims' ? 'claimForm' : activeTab === 'warranties' ? 'warrantyForm' : activeTab === 'services' ? 'serviceForm' : activeTab === 'promos' ? 'promoForm' : activeTab === 'userrole' ? 'karyawanForm' : 'budgetForm'} disabled={isSubmitting} className="px-4 py-2 bg-[#FFE500] hover:bg-[#E5CE00] text-black rounded-md text-sm font-bold transition disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</button>
                     </div>
                  </div>
               </div>
            )}

         </div>

         {/* =========================================================
          PRINT AREA (FORMAT PERSIS PDF MKTG)
      ========================================================= */}
         {printData && (
            <div className="flex flex-col absolute top-0 left-0 w-full bg-white text-black font-sans z-[100] min-h-screen pb-10 pt-6" style={{ fontSize: '13px', lineHeight: '1.4' }}>

               {/* PRINT CONTROL BAR */}
               <div className="print:hidden fixed top-4 right-4 flex flex-col gap-3 z-50 bg-white p-3 rounded-lg shadow-xl border border-slate-200">
                  <div className="flex gap-3 justify-end">
                     <button onClick={() => setPrintData(null)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-md transition text-sm">Kembali</button>
                     <button onClick={handlePrintDocument} className="px-4 py-2 bg-[#FFE500] hover:bg-[#E5CE00] text-black font-bold rounded-md transition shadow-md text-sm flex items-center gap-2">🖨️ Cetak PDF</button>
                  </div>
                  {printData.attachment_urls && printData.attachment_urls.some(u => u) && (
                     <div className="flex items-center gap-2 border-t border-slate-200 pt-2 mt-1">
                        <label className="text-xs font-bold text-slate-600">Ukuran Gambar:</label>
                        <input type="range" min="100" max="800" value={printImageSize} onChange={(e) => setPrintImageSize(Number(e.target.value))} className="w-32 accent-[#FFE500]" />
                        <span className="text-xs font-mono bg-slate-100 px-1 rounded">{printImageSize}px</span>
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
                           <tr>
                              <td colSpan={3} className="border-l border-b border-transparent bg-white"></td>
                              <td colSpan={2} className="border border-black p-1.5 text-right font-extrabold pr-4 bg-gray-200 uppercase text-xs text-black">Grand Total</td>
                              <td className="border border-black p-1.5 text-right font-extrabold bg-gray-200 text-black text-sm">Rp {Number(printData.total_cost).toLocaleString('id-ID')}</td>
                           </tr>
                           <tr>
                              <td colSpan={3} className="border-l border-b border-transparent bg-white"></td>
                              <td colSpan={2} className="border-2 border-black p-2 text-right font-bold pr-4 bg-black text-white uppercase text-sm">TOTAL COST</td>
                              <td className="border-2 border-black p-1.5 text-right font-bold bg-black text-white text-sm">Rp {Number(printData.total_cost).toLocaleString('id-ID')}</td>
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
                     <button onClick={() => { setImageScale(1); setImageTranslate({ x: 0, y: 0 }) }} className="ml-2 hover:text-[#FFE500] text-xs underline text-slate-300">Reset</button>
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
                        className="max-w-none transition-transform duration-75 ease-out select-none pointer-events-none"
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
         <datalist id="list-roles">{dynamicOptions.roles.map(opt => <option key={opt} value={opt} />)}</datalist>
         <datalist id="list-budget-source">{dynamicOptions.budgetSource.map(opt => <option key={opt} value={opt} />)}</datalist>

         {/* CONNECTION INDICATOR */}
         <div className="fixed bottom-4 right-4 z-[100] flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-lg border text-[10px] font-bold transition-all">
            <div className={`w-2 h-2 rounded-full ${dbStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={dbStatus.connected ? 'text-slate-600' : 'text-red-600'}>
               Supabase: {dbStatus.message}
            </span>
            {!dbStatus.connected && (
               <button onClick={() => window.location.reload()} className="ml-1 text-blue-600 hover:underline">Refresh</button>
            )}
         </div>

      </>
   );
}