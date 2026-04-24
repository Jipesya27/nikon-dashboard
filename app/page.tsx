'use client';

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const supabaseUrl = 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const FONNTE_TOKEN = process.env.NEXT_PUBLIC_FONNTE_TOKEN || 'xYsGrYetdkLXoK72dDtc'; 

// --- TYPES ---
interface Karyawan { username: string; nama_karyawan: string; role: string; }
interface KonsumenData { nomor_wa: string; id_konsumen: string; nama_lengkap: string; status_langkah: string; alamat_rumah: string; created_at: string; }
interface RiwayatPesan { id_pesan?: string; nomor_wa: string; nama_profil_wa: string; arah_pesan: 'IN' | 'OUT'; isi_pesan: string; waktu_pesan: string; bicara_dengan_cs?: boolean; created_at?: string; }
interface ClaimPromo { id_claim?: string; nomor_wa: string; nomor_seri: string; tipe_barang: string; tanggal_pembelian: string; nama_toko?: string; jenis_promosi?: string; validasi_by_mkt: string; validasi_by_fa: string; nama_jasa_pengiriman?: string; nomor_resi?: string; link_kartu_garansi?: string; link_nota_pembelian?: string; }
interface Garansi { id_garansi?: string; nomor_seri: string; tipe_barang: string; status_validasi: string; jenis_garansi: string; lama_garansi: string; }
interface StatusService { id_service?: string; nomor_tanda_terima: string; nomor_seri: string; status_service: string; created_at?: string; }
interface BudgetItem { purpose: string; qty: number; cost_unit: number; value: number; petty_cash?: string; }
interface BudgetApproval { id_budget?: string; proposal_no: string; title: string; period: string; objectives: string; detail_activity: string; expected_result: string; total_cost: number; budget_source: string; drafter_name: string; items: BudgetItem[]; created_at?: string; attachment_url?: string; }

// --- NEW PROMO TYPES ---
interface PromoProduk { nama_produk: string; }
interface Promosi { id_promo?: string; nama_promo: string; tipe_produk: PromoProduk[]; tanggal_mulai: string; tanggal_selesai: string; status_aktif: boolean; created_at?: string; }

const sendWhatsAppMessageViaFonnte = async (targetWa: string, message: string) => {
  try {
    const formData = new FormData(); formData.append('target', targetWa); formData.append('message', message);
    await fetch('https://api.fonnte.com/send', { method: 'POST', headers: { 'Authorization': FONNTE_TOKEN }, body: formData });
  } catch (error) { console.error("Gagal mengirim Fonnte:", error); }
};

export default function NikonDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [messages, setMessages] = useState<RiwayatPesan[]>([]);
  const [claims, setClaims] = useState<ClaimPromo[]>([]);
  const [warranties, setWarranties] = useState<Garansi[]>([]);
  const [promos, setPromos] = useState<Promosi[]>([]);
  const [services, setServices] = useState<StatusService[]>([]);
  const [budgets, setBudgets] = useState<BudgetApproval[]>([]);
  
  const [consumers, setConsumers] = useState<Record<string, string>>({});
  const [consumersList, setConsumersList] = useState<KonsumenData[]>([]);
  const [searchKonsumen, setSearchKonsumen] = useState('');
  const [searchChat, setSearchChat] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');
  const [dateRange, setDateRange] = useState({ start: '2024-01-01', end: new Date().toISOString().split('T')[0] });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedWa, setSelectedWa] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatWa, setNewChatWa] = useState('');
  const [newChatMsg, setNewChatMsg] = useState('');

  const [claimForm, setClaimForm] = useState<Partial<ClaimPromo>>({});
  const [warrantyForm, setWarrantyForm] = useState<Partial<Garansi>>({});
  const [promoForm, setPromoForm] = useState<Partial<Promosi>>({ tipe_produk: [] });
  const [serviceForm, setServiceForm] = useState<Partial<StatusService>>({});
  const [budgetForm, setBudgetForm] = useState<Partial<BudgetApproval>>({ items: [] });
  const [printData, setPrintData] = useState<BudgetApproval | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedSession = localStorage.getItem('nikon_karyawan');
    if (savedSession) { setCurrentUser(JSON.parse(savedSession)); setIsLoggedIn(true); } 
    else { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    fetchConsumers(); fetchMessages(); fetchClaims(); fetchWarranties(); fetchPromos(); fetchServices(); fetchBudgets();
    
    const subscription = supabase.channel('messages-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_pesan' }, (payload) => {
        if (payload.eventType === 'INSERT') setMessages(prev => [payload.new as RiwayatPesan, ...prev]);
      }).subscribe();
    return () => { subscription.unsubscribe(); };
  }, [isLoggedIn, dateRange]);

  useEffect(() => { if (printData) { setTimeout(() => { window.print(); }, 500); } }, [printData]);
  useEffect(() => { const handleAfterPrint = () => setPrintData(null); window.addEventListener('afterprint', handleAfterPrint); return () => window.removeEventListener('afterprint', handleAfterPrint); }, []);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  useEffect(() => { if (selectedWa) setTimeout(() => { scrollToBottom(); }, 300); }, [selectedWa]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    const { data } = await supabase.from('karyawan').select('username, nama_karyawan, role').eq('username', loginForm.username).eq('password', loginForm.password).single();
    if (data) { setCurrentUser(data); setIsLoggedIn(true); localStorage.setItem('nikon_karyawan', JSON.stringify(data)); } 
    else { setLoginError('Username atau Password salah!'); }
  };
  const handleLogout = () => { localStorage.removeItem('nikon_karyawan'); setIsLoggedIn(false); setCurrentUser(null); };

  const fetchConsumers = async () => { 
    const map: Record<string, string> = {};
    const { data: konsumenData } = await supabase.from('konsumen').select('*').order('created_at', { ascending: false });
    if (konsumenData) { setConsumersList(konsumenData); konsumenData.forEach(k => { if (k.nama_lengkap) map[k.nomor_wa] = k.nama_lengkap; }); }
    const { data: riwayatData } = await supabase.from('riwayat_pesan').select('nomor_wa, nama_profil_wa').neq('nama_profil_wa', 'Sistem Bot').order('created_at', { ascending: false }).limit(2000);
    if (riwayatData) riwayatData.forEach(r => { if (!map[r.nomor_wa] && r.nama_profil_wa && r.nama_profil_wa !== r.nomor_wa) map[r.nomor_wa] = r.nama_profil_wa; });
    setConsumers(map); 
  };

  const fetchMessages = async () => { const { data } = await supabase.from('riwayat_pesan').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false }); setMessages(data || []); };
  const fetchClaims = async () => { const { data } = await supabase.from('claim_promo').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false }); setClaims(data || []); };
  const fetchWarranties = async () => { const { data } = await supabase.from('garansi').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false }); setWarranties(data || []); };
  const fetchPromos = async () => { const { data } = await supabase.from('promosi').select('*').order('created_at', { ascending: false }); setPromos(data || []); };
  const fetchServices = async () => { const { data } = await supabase.from('status_service').select('*').order('created_at', { ascending: false }); setServices(data || []); };
  const fetchBudgets = async () => { const { data } = await supabase.from('budget_approval').select('*').order('created_at', { ascending: false }); setBudgets(data || []); setLoading(false); };

  const exportToCSV = () => {
    let dataToExport: any[] = []; let filename = '';
    if (activeTab === 'promos') { dataToExport = promos; filename = 'Data_Promo.csv'; }
    else if (activeTab === 'claims') { dataToExport = claims; filename = 'Data_Claim.csv'; }
    else if (activeTab === 'warranties') { dataToExport = warranties; filename = 'Data_Garansi.csv'; }
    else if (activeTab === 'services') { dataToExport = services; filename = 'Data_Service.csv'; }
    if (!dataToExport || dataToExport.length === 0) return alert('Tidak ada data untuk di-download');

    const headers = Object.keys(dataToExport[0]).filter(key => key !== 'created_at'); 
    const csvRows = []; csvRows.push(headers.join(','));
    for (const row of dataToExport) {
      const values = headers.map(header => { 
         let val = row[header];
         if (header === 'tipe_produk' || header === 'items') val = val ? JSON.stringify(val) : '[]';
         else val = val === null || val === undefined ? '' : String(val);
         return `"${String(val).replace(/"/g, '""')}"`; 
      });
      csvRows.push(values.join(','));
    }
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.setAttribute('href', url); a.setAttribute('download', filename); a.click(); window.URL.revokeObjectURL(url);
  };

  const importFromCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setIsSubmitting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string; const lines = text.split('\n'); const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const result = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const obj: any = {}; const currentline = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
          headers.forEach((header, j) => {
            let val: any = currentline[j] ? currentline[j].trim().replace(/^"|"$/g, '') : null;
            if (typeof val === 'string') val = val.replace(/""/g, '"');
            if (val === "") val = null; if (val === 'true') val = true; if (val === 'false') val = false; 
            if ((header === 'tipe_produk' || header === 'items') && val) { try { val = JSON.parse(val); } catch(e) { val = []; } }
            obj[header] = val;
          });
          if (obj.id_promo === null) delete obj.id_promo; if (obj.id_claim === null) delete obj.id_claim; if (obj.id_garansi === null) delete obj.id_garansi; if (obj.id_service === null) delete obj.id_service; delete obj.created_at; 
          result.push(obj);
        }
        let tableName = '';
        if (activeTab === 'promos') tableName = 'promosi'; else if (activeTab === 'claims') tableName = 'claim_promo'; else if (activeTab === 'warranties') tableName = 'garansi'; else if (activeTab === 'services') tableName = 'status_service';
        if (!tableName) throw new Error("Tab aktif tidak valid untuk update CSV");
        const { error } = await supabase.from(tableName).upsert(result); if (error) throw error;
        alert('Data CSV berhasil di-update ke Database Supabase!');
        if (activeTab === 'promos') fetchPromos(); if (activeTab === 'claims') fetchClaims(); if (activeTab === 'warranties') fetchWarranties(); if (activeTab === 'services') fetchServices();
      } catch (error: any) { alert('Gagal import CSV: ' + error.message); } finally { setIsSubmitting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
    }; reader.readAsText(file);
  };

  const openModal = (action: 'create'|'edit', type: 'claim'|'warranty'|'promo'|'service'|'budget', item?: any) => {
    setModalAction(action);
    if (type === 'claim') { setClaimForm(item || { validasi_by_mkt: 'Dalam Proses Verifikasi', validasi_by_fa: 'Dalam Proses Verifikasi' }); setEditingId(item?.id_claim || null); }
    else if (type === 'warranty') { setWarrantyForm(item || { status_validasi: 'Menunggu', jenis_garansi: 'Extended to 2 Year', lama_garansi: '1 Tahun' }); setEditingId(item?.id_garansi || null); }
    else if (type === 'promo') { setPromoForm(item || { status_aktif: true, tipe_produk: [] }); setEditingId(item?.id_promo || null); }
    else if (type === 'service') { setServiceForm(item || {}); setEditingId(item?.id_service || null); }
    else if (type === 'budget') { setBudgetForm(item || { total_cost: 0, items: [], drafter_name: currentUser?.nama_karyawan, budget_source: 'Marketing Budget' }); setEditingId(item?.id_budget || null); }
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setClaimForm({}); setWarrantyForm({}); setPromoForm({tipe_produk: []}); setServiceForm({}); setBudgetForm({items:[]}); setEditingId(null); };

  // --- CRUD HANDLERS ---
  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      if (modalAction === 'create') await supabase.from('claim_promo').insert([claimForm]); else await supabase.from('claim_promo').update(claimForm).eq('id_claim', editingId);
      if (claimForm.nomor_wa && claimForm.nomor_resi && claimForm.nomor_resi.trim() !== '') {
          if (window.confirm(`Nomor Resi terdeteksi. Kirim notifikasi otomatis ke WA (${claimForm.nomor_wa}) mengenai pengiriman barang ini?`)) {
            const autoMessage = `Data Claim Promo Anda telah selesai diproses,\n\nNomor Seri : ${claimForm.nomor_seri}\nBarang : ${claimForm.tipe_barang || '-'}\nValidasi MKT : ${claimForm.validasi_by_mkt || '-'}\nJasa Kirim : ${claimForm.nama_jasa_pengiriman || '-'}\nNo Resi : ${claimForm.nomor_resi}\n\nTerima kasih.`;
            await sendWhatsAppMessageViaFonnte(claimForm.nomor_wa, autoMessage);
            await supabase.from('riwayat_pesan').insert([{ nomor_wa: claimForm.nomor_wa, nama_profil_wa: getRealProfileName(claimForm.nomor_wa), arah_pesan: 'OUT', isi_pesan: autoMessage, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
          }
      }
      fetchClaims(); closeModal();
    } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleSaveWarranty = async (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); try { if (modalAction === 'create') await supabase.from('garansi').insert([warrantyForm]); else await supabase.from('garansi').update(warrantyForm).eq('id_garansi', editingId); fetchWarranties(); closeModal(); } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); } };
  const handleSavePromo = async (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); try { if (modalAction === 'create') await supabase.from('promosi').insert([promoForm]); else await supabase.from('promosi').update(promoForm).eq('id_promo', editingId); fetchPromos(); closeModal(); } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); } };
  const handleSaveService = async (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); try { if (modalAction === 'create') await supabase.from('status_service').insert([serviceForm]); else await supabase.from('status_service').update(serviceForm).eq('id_service', editingId); fetchServices(); closeModal(); } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); } };
  const handleSaveBudget = async (e: React.FormEvent) => { e.preventDefault(); setIsSubmitting(true); try { if (modalAction === 'create') await supabase.from('budget_approval').insert([budgetForm]); else await supabase.from('budget_approval').update(budgetForm).eq('id_budget', editingId); fetchBudgets(); closeModal(); } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); } };

  const handleDelete = async (type: 'claim'|'warranty'|'promo'|'service'|'budget', id: string) => {
    if (!window.confirm('Yakin menghapus data?')) return;
    if (type === 'claim') { await supabase.from('claim_promo').delete().eq('id_claim', id); fetchClaims(); }
    else if (type === 'warranty') { await supabase.from('garansi').delete().eq('id_garansi', id); fetchWarranties(); }
    else if (type === 'promo') { await supabase.from('promosi').delete().eq('id_promo', id); fetchPromos(); }
    else if (type === 'service') { await supabase.from('status_service').delete().eq('id_service', id); fetchServices(); }
    else { await supabase.from('budget_approval').delete().eq('id_budget', id); fetchBudgets(); }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedWa || !replyText.trim()) return;
    await sendWhatsAppMessageViaFonnte(selectedWa, replyText.trim());
    await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', selectedWa);
    await supabase.from('riwayat_pesan').insert([{ nomor_wa: selectedWa, nama_profil_wa: getRealProfileName(selectedWa), arah_pesan: 'OUT', isi_pesan: replyText.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
    setReplyText(''); fetchMessages(); scrollToBottom();
  };

  const handleSendNewChat = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newChatWa || !newChatMsg.trim()) return;
    await sendWhatsAppMessageViaFonnte(newChatWa, newChatMsg.trim());
    await supabase.from('riwayat_pesan').insert([{ nomor_wa: newChatWa, nama_profil_wa: getRealProfileName(newChatWa), arah_pesan: 'OUT', isi_pesan: newChatMsg.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: false }]);
    setIsNewChatModalOpen(false); setNewChatWa(''); setNewChatMsg(''); setSelectedWa(newChatWa); scrollToBottom();
  };

  const handleSelesaiCS = async (nomor_wa: string) => { try { await supabase.from('riwayat_pesan').update({ bicara_dengan_cs: false }).eq('nomor_wa', nomor_wa); fetchMessages(); } catch (error: any) { console.error('Gagal update CS:', error.message); } };
  const calculateSisaGaransi = (tgl: string | undefined, lama: string) => { if (!tgl || !lama || lama === 'Tidak Garansi') return 'Tidak Garansi'; const beli = new Date(tgl); beli.setFullYear(beli.getFullYear() + (lama === '1 Tahun' ? 1 : 2)); const diff = beli.getTime() - new Date().getTime(); return diff < 0 ? 'Garansi Habis' : `${Math.ceil(diff / (1000 * 60 * 60 * 24))} Hari`; };
  const getRealProfileName = (nomorWa: string | null) => { if (!nomorWa) return 'Pelanggan'; return consumers[nomorWa] || nomorWa; };
  
  // Mencocokkan Tipe Produk dari Array JSON
  const getNamaPromo = (tipeBarang: string) => { 
    if (!tipeBarang) return '-'; 
    const matchedPromo = promos.find(p => 
       p.tipe_produk && p.tipe_produk.some(prod => 
          tipeBarang.toLowerCase().includes(prod.nama_produk.toLowerCase()) || 
          prod.nama_produk.toLowerCase().includes(tipeBarang.toLowerCase())
       )
    ); 
    return matchedPromo ? matchedPromo.nama_promo : '-'; 
  };

  const uniqueContacts = Array.from(messages.reduce((map, msg) => { 
      if (!map.has(msg.nomor_wa)) map.set(msg.nomor_wa, { ...msg }); 
      else if (msg.bicara_dengan_cs) map.get(msg.nomor_wa)!.bicara_dengan_cs = true; 
      return map; 
  }, new Map()).values()) as RiwayatPesan[];

  const filteredContacts = uniqueContacts.filter(c => getRealProfileName(c.nomor_wa).toLowerCase().includes(searchChat.toLowerCase()) || c.nomor_wa.includes(searchChat) );
  const currentChatThread = selectedWa ? messages.filter(m => m.nomor_wa === selectedWa).sort((a, b) => new Date(a.waktu_pesan).getTime() - new Date(b.waktu_pesan).getTime()) : [];

  // --- TAMPILAN LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm">
          <div className="text-center mb-6"><h1 className="text-2xl font-bold text-slate-900">Nikon Admin</h1><p className="text-sm text-slate-500">Masuk untuk mengelola Bot & Data</p></div>
          {loginError && <div className="bg-red-100 text-red-700 p-3 rounded text-sm mb-4">{loginError}</div>}
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="block text-sm font-medium mb-1">Username</label><input type="text" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} required className="w-full border rounded px-3 py-2 outline-none focus:border-blue-500"/></div>
            <div><label className="block text-sm font-medium mb-1">Password</label><input type="password" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} required className="w-full border rounded px-3 py-2 outline-none focus:border-blue-500"/></div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium mt-2 transition">Login</button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12 print:hidden relative">
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-900">Alta Nikindo Dashboard</h1><p className="text-xs text-slate-500">Role: {currentUser?.role}</p></div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Hi, {currentUser?.nama_karyawan}</span>
          <button onClick={handleLogout} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-medium transition">Logout</button>
        </div>
      </header>
      
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6">
        <div className="flex gap-8 overflow-x-auto justify-center max-w-7xl mx-auto">
          {[
            { id: 'messages', label: '💬 Pesan', count: messages.length }, 
            { id: 'konsumen', label: '👥 Konsumen', count: consumersList.length },
            { id: 'promos', label: '📢 Promo', count: promos.length }, 
            { id: 'claims', label: '🎫 Claim', count: claims.length }, 
            { id: 'warranties', label: '🛡️ Garansi', count: warranties.length },
            { id: 'services', label: '🔧 Service', count: services.length },
            { id: 'budgets', label: '💳 Budget', count: budgets.length }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-4 font-medium whitespace-nowrap transition ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab.label} <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{tab.count}</span></button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-4">
            {activeTab !== 'konsumen' && activeTab !== 'budgets' && (
              <>
                <label className="text-sm font-medium">Dari: <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="ml-2 border rounded p-1 outline-none focus:border-blue-500"/></label>
                <label className="text-sm font-medium">Sampai: <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="ml-2 border rounded p-1 outline-none focus:border-blue-500"/></label>
              </>
            )}
          </div>
          <div className="flex gap-2 items-center">
            {['promos', 'claims', 'warranties', 'services'].includes(activeTab) && (
              <>
                <button onClick={exportToCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm flex items-center gap-2"><span>⬇️</span> Download CSV</button>
                <button onClick={() => fileInputRef.current?.click()} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm flex items-center gap-2" disabled={isSubmitting}><span>⬆️</span> Update CSV</button>
                <input type="file" accept=".csv" ref={fileInputRef} onChange={importFromCSV} className="hidden" />
                <div className="w-px h-6 bg-slate-300 mx-2"></div>
              </>
            )}

            {activeTab === 'claims' && <button onClick={() => openModal('create', 'claim')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm">+ Tambah Claim</button>}
            {activeTab === 'warranties' && <button onClick={() => openModal('create', 'warranty')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm">+ Tambah Garansi</button>}
            {activeTab === 'services' && <button onClick={() => openModal('create', 'service')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm">+ Tambah Service</button>}
            {activeTab === 'budgets' && <button onClick={() => openModal('create', 'budget')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm">+ Buat Budget Approval</button>}
            {activeTab === 'promos' && currentUser?.role === 'Admin' && <button onClick={() => openModal('create', 'promo')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium text-sm transition shadow-sm">+ Tambah Promo</button>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* ======================= PESAN ======================= */}
        {activeTab === 'messages' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
              <div className="bg-white rounded-lg shadow-sm border flex flex-col h-full overflow-hidden">
                 <div className="p-4 border-b flex justify-between items-center bg-white z-10"><span className="font-bold">Percakapan</span><button onClick={() => setIsNewChatModalOpen(true)} className="bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium rounded hover:bg-blue-200 transition">+ Chat</button></div>
                 <div className="p-3 border-b bg-slate-50 z-10"><input type="text" placeholder="🔍 Cari nama / no WA..." value={searchChat} onChange={e => setSearchChat(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm outline-none focus:border-blue-500 shadow-sm" /></div>
                 <div className="overflow-y-auto flex-1 divide-y">
                   {filteredContacts.map((c: any) => (
                     <div key={c.nomor_wa} onClick={() => setSelectedWa(c.nomor_wa)} className={`p-4 cursor-pointer hover:bg-slate-50 transition ${selectedWa === c.nomor_wa ? 'border-l-4 border-blue-500 bg-blue-50/50' : 'border-l-4 border-transparent'}`}>
                       <div className="flex justify-between text-sm">
                         <span className="font-bold truncate flex items-center gap-2">{getRealProfileName(c.nomor_wa)}{c.bicara_dengan_cs && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">🚨 Perlu CS</span>}</span>
                         <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(c.waktu_pesan).toLocaleDateString('id-ID')}</span>
                       </div>
                       <div className="text-xs text-slate-500 truncate mt-1">{c.isi_pesan}</div>
                     </div>
                   ))}
                 </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border lg:col-span-2 flex flex-col h-full overflow-hidden relative">
                 {selectedWa ? (
                    <>
                      <div className="p-4 border-b bg-slate-50 z-10 flex justify-between items-center">
                        <div><h3 className="font-bold">{getRealProfileName(selectedWa)}</h3><p className="text-xs text-slate-500">{selectedWa}</p></div>
                        {uniqueContacts.find(c => c.nomor_wa === selectedWa)?.bicara_dengan_cs && (
                           <button onClick={() => handleSelesaiCS(selectedWa)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1 shadow-sm">✅ Tandai Selesai</button>
                        )}
                      </div>
                      <div className="flex-1 p-4 overflow-y-auto space-y-4 relative scroll-smooth" style={{ backgroundColor: '#efeae2', backgroundImage: `url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')`, backgroundSize: '400px', backgroundRepeat: 'repeat' }}>
                        {currentChatThread.map((msg: any) => (
                          <div key={msg.id_pesan || Math.random().toString()} className={`flex ${msg.arah_pesan === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-2.5 text-sm rounded-lg shadow-sm relative ${msg.arah_pesan === 'OUT' ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.isi_pesan}</p>
                              <div className="text-[10px] mt-1 text-right text-slate-500">{new Date(msg.waktu_pesan).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                      <button onClick={scrollToBottom} className="absolute bottom-20 right-6 bg-white p-2.5 rounded-full shadow-lg border border-slate-200 text-blue-600 hover:bg-blue-50 transition-colors z-20" title="Ke pesan terbaru">⬇️</button>
                      <form onSubmit={handleSendReply} className="p-4 border-t flex gap-2 bg-slate-50 z-10 relative">
                        <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Ketik pesan..." className="flex-1 border border-slate-300 rounded-full px-5 py-2.5 text-sm outline-none focus:border-blue-500 shadow-sm" />
                        <button type="submit" disabled={!replyText.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-medium disabled:opacity-50 transition shadow-sm">Kirim</button>
                      </form>
                    </>
                 ) : <div className="flex-1 flex justify-center items-center text-slate-500 bg-slate-100">Pilih chat di samping</div>}
              </div>
            </div>
          </div>
        )}

        {/* ======================= DATA KONSUMEN ======================= */}
        {activeTab === 'konsumen' && (
          <div className="space-y-4 animate-fade-in"><input type="text" placeholder="🔍 Cari berdasarkan Nama / No Whatsapp / ID Konsumen" value={searchKonsumen} onChange={e => setSearchKonsumen(e.target.value)} className="w-full p-4 border border-slate-300 rounded-lg shadow-sm outline-none focus:border-blue-500 text-sm" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {consumersList.filter(k => k.nama_lengkap?.toLowerCase().includes(searchKonsumen.toLowerCase()) || k.nomor_wa.includes(searchKonsumen) || k.id_konsumen?.toLowerCase().includes(searchKonsumen.toLowerCase())).map(k => {
                  const userClaims = claims.filter(c => c.nomor_wa === k.nomor_wa);
                  return (
                    <div key={k.nomor_wa} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col hover:border-blue-300 transition">
                      <div className="flex justify-between items-start border-b pb-3 mb-3"><div><h3 className="font-bold text-lg text-slate-800">{k.nama_lengkap || k.nomor_wa}</h3><div className="text-sm text-slate-500 mt-1 flex gap-3"><span>📱 {k.nomor_wa}</span>{k.id_konsumen && <span className="font-medium text-blue-600">ID: {k.id_konsumen}</span>}</div></div></div>
                      <div className="flex-1"><h4 className="font-semibold text-slate-700 text-sm mb-2">Riwayat Barang ({userClaims.length})</h4>{userClaims.length === 0 ? <p className="text-xs text-slate-400 italic">Belum ada riwayat</p> : (<div className="space-y-3">{userClaims.map(c => { const w = warranties.find(wa => wa.nomor_seri === c.nomor_seri); const s = services.filter(se => se.nomor_seri === c.nomor_seri); return ( <div key={c.id_claim} className="text-xs p-3 bg-slate-50 border border-slate-100 rounded-md"><div className="font-bold text-slate-800 mb-1">{c.tipe_barang} <span className="text-slate-500 font-normal ml-1">(Seri: {c.nomor_seri})</span></div><div className="grid grid-cols-1 gap-1 text-slate-600 mt-2"><div><span className="font-medium text-slate-700">🎫 Claim:</span> {c.validasi_by_mkt} / {c.validasi_by_fa}</div><div><span className="font-medium text-slate-700">🛡️ Garansi:</span> {w ? w.status_validasi : 'Belum Terdaftar'}</div><div><span className="font-medium text-slate-700">🔧 Service:</span> {s.length > 0 ? s.map(se => `[${se.nomor_tanda_terima}] ${se.status_service}`).join(', ') : 'Tidak ada riwayat'}</div></div></div> ) })}</div>)}</div>
                    </div>
                  )
               })}
            </div>
          </div>
        )}

        {/* ======================= PROMOS (GRID CARD) ======================= */}
        {activeTab === 'promos' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
             {promos.map(p => (
               <div key={p.id_promo} className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col hover:border-blue-300 transition">
                 <div className="flex justify-between items-start border-b pb-3 mb-3">
                    <div>
                       <h3 className="font-bold text-lg text-slate-800">{p.nama_promo}</h3>
                       <div className="text-sm text-slate-500 mt-1">📅 {p.tanggal_mulai} s/d {p.tanggal_selesai}</div>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'AKTIF' : 'NONAKTIF'}</span>
                 </div>
                 <div className="flex-1">
                    <h4 className="font-semibold text-slate-700 text-sm mb-2">Tipe Produk Berlaku ({p.tipe_produk?.length || 0})</h4>
                    {(!p.tipe_produk || p.tipe_produk.length === 0) ? <p className="text-xs text-slate-400 italic">Belum ada produk</p> : (
                       <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                          {p.tipe_produk.map((prod, idx) => (
                             <div key={idx} className="text-xs p-2 bg-slate-50 border border-slate-100 rounded-md font-medium text-slate-700 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 block"></span>{prod.nama_produk}
                             </div>
                          ))}
                       </div>
                    )}
                 </div>
                 {currentUser?.role === 'Admin' && (
                    <div className="mt-4 pt-3 border-t flex gap-3 justify-end">
                       <button onClick={()=>openModal('edit','promo',p)} className="text-blue-600 text-xs font-medium hover:underline">Edit Promo</button>
                       <button onClick={()=>handleDelete('promo', p.id_promo!)} className="text-red-600 text-xs font-medium hover:underline">Hapus</button>
                    </div>
                 )}
               </div>
             ))}
          </div>
        )}
        
        {/* ======================= CLAIMS ======================= */}
        {activeTab === 'claims' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
             <table className="w-full text-sm"><thead className="bg-slate-50 border-b whitespace-nowrap"><tr><th className="px-4 py-3 text-left">Nama</th><th className="px-4 py-3 text-left">No Seri</th><th className="px-4 py-3 text-left">Barang</th><th className="px-4 py-3 text-left">Nama Promo</th><th className="px-4 py-3 text-left">Tgl Beli</th><th className="px-4 py-3 text-left">Toko</th><th className="px-4 py-3 text-left">Nota/Garansi</th><th className="px-4 py-3 text-left">MKT / FA</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead>
             <tbody className="divide-y">{claims.map(c => (
               <tr key={c.id_claim} className="whitespace-nowrap hover:bg-slate-50">
                 <td className="px-4 py-3 text-slate-700">{consumers[c.nomor_wa]||c.nomor_wa}</td><td className="px-4 py-3 font-mono">{c.nomor_seri}</td><td className="px-4 py-3">{c.tipe_barang}</td><td className="px-4 py-3 font-medium text-blue-700">{getNamaPromo(c.tipe_barang)}</td><td className="px-4 py-3">{c.tanggal_pembelian}</td><td className="px-4 py-3">{c.nama_toko || '-'}</td><td className="px-4 py-3 text-blue-500 font-medium">{c.link_nota_pembelian && <a href={c.link_nota_pembelian} target="_blank" rel="noreferrer" className="mr-3 hover:underline">Nota</a>} {c.link_kartu_garansi && <a href={c.link_kartu_garansi} target="_blank" rel="noreferrer" className="hover:underline">Garansi</a>}</td><td className="px-4 py-3 text-xs">{c.validasi_by_mkt} / {c.validasi_by_fa}</td>
                 <td className="px-4 py-3 flex gap-2"><button onClick={()=>openModal('edit','claim',c)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button><button onClick={()=>handleDelete('claim',c.id_claim!)} className="text-red-600 text-xs font-medium hover:underline">Hapus</button></td>
               </tr>
             ))}</tbody></table>
          </div>
        )}

        {/* ======================= WARRANTIES ======================= */}
        {activeTab === 'warranties' && (
           <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
             <table className="w-full text-sm"><thead className="bg-slate-50 border-b whitespace-nowrap"><tr><th className="px-4 py-3 text-left">No Seri</th><th className="px-4 py-3 text-left">Barang</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Jenis</th><th className="px-4 py-3 text-left">Sisa Garansi</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead>
             <tbody className="divide-y">{warranties.map(w => {
               const linked = claims.find(c => c.nomor_seri === w.nomor_seri);
               return (<tr key={w.id_garansi} className="whitespace-nowrap hover:bg-slate-50"><td className="px-4 py-3 font-mono">{w.nomor_seri}</td><td className="px-4 py-3">{w.tipe_barang}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${w.status_validasi === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{w.status_validasi}</span></td><td className="px-4 py-3">{w.jenis_garansi}</td><td className="px-4 py-3 font-bold text-slate-700">{calculateSisaGaransi(linked?.tanggal_pembelian, w.lama_garansi)}</td><td className="px-4 py-3 flex gap-2"><button onClick={()=>openModal('edit','warranty',w)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button><button onClick={()=>handleDelete('warranty',w.id_garansi!)} className="text-red-600 text-xs font-medium hover:underline">Hapus</button></td></tr>)
             })}</tbody></table>
          </div>
        )}

        {/* ======================= SERVICES ======================= */}
        {activeTab === 'services' && (
           <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
             <table className="w-full text-sm"><thead className="bg-slate-50 border-b whitespace-nowrap"><tr><th className="px-6 py-3 text-left">No Tanda Terima</th><th className="px-6 py-3 text-left">No Seri Barang</th><th className="px-6 py-3 text-left">Status Service</th><th className="px-6 py-3 text-left">Tgl Update</th><th className="px-6 py-3 text-left">Aksi</th></tr></thead>
             <tbody className="divide-y">{services.map(s => (
               <tr key={s.id_service} className="whitespace-nowrap hover:bg-slate-50"><td className="px-6 py-3 font-mono font-medium text-slate-800">{s.nomor_tanda_terima}</td><td className="px-6 py-3">{s.nomor_seri}</td><td className="px-6 py-3"><span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800 font-medium">{s.status_service}</span></td><td className="px-6 py-3 text-slate-500">{s.created_at ? new Date(s.created_at).toLocaleDateString('id-ID') : '-'}</td><td className="px-6 py-3 flex gap-3"><button onClick={()=>openModal('edit','service',s)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button><button onClick={()=>handleDelete('service',s.id_service!)} className="text-red-600 text-xs font-medium hover:underline">Hapus</button></td></tr>
             ))}</tbody></table>
          </div>
        )}

        {/* ======================= BUDGETS ======================= */}
        {activeTab === 'budgets' && (
           <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
             <table className="w-full text-sm"><thead className="bg-slate-50 border-b whitespace-nowrap"><tr><th className="px-6 py-3 text-left">Proposal No</th><th className="px-6 py-3 text-left">Title</th><th className="px-6 py-3 text-left">Period</th><th className="px-6 py-3 text-left">Total Cost</th><th className="px-6 py-3 text-left">Aksi</th></tr></thead>
             <tbody className="divide-y">{budgets.map(b => (
               <tr key={b.id_budget} className="whitespace-nowrap hover:bg-slate-50"><td className="px-6 py-3 font-mono font-medium text-slate-800">{b.proposal_no}</td><td className="px-6 py-3">{b.title}</td><td className="px-6 py-3">{b.period}</td><td className="px-6 py-3 font-bold text-slate-700">Rp {Number(b.total_cost).toLocaleString('id-ID')}</td>
               <td className="px-6 py-3 flex gap-3">
                 <button onClick={() => setPrintData(b)} className="text-emerald-600 text-xs font-medium hover:underline">Print PDF</button>
                 <button onClick={()=>openModal('edit','budget',b)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button>
                 <button onClick={()=>handleDelete('budget',b.id_budget!)} className="text-red-600 text-xs font-medium hover:underline">Hapus</button>
               </td></tr>
             ))}</tbody></table>
          </div>
        )}
      </div>

      {/* --- MODALS CREATE / EDIT --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl shadow-xl w-full ${activeTab === 'budgets' ? 'max-w-4xl' : 'max-w-2xl'} overflow-hidden flex flex-col max-h-[90vh]`}>
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center"><h2 className="text-lg font-bold">{modalAction === 'create' ? 'Tambah' : 'Edit'} Data</h2><button onClick={closeModal} className="text-2xl text-slate-400 hover:text-slate-600 leading-none">×</button></div>
            <div className="p-6 overflow-y-auto">
               
               {activeTab === 'claims' && (<form id="claimForm" onSubmit={handleSaveClaim} className="space-y-4"><div><label className="block text-sm font-medium mb-1">Nomor WA</label><input required type="text" value={claimForm.nomor_wa || ''} onChange={e => setClaimForm({...claimForm, nomor_wa: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={claimForm.nomor_seri || ''} onChange={e => setClaimForm({...claimForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Tipe Barang</label><input type="text" value={claimForm.tipe_barang || ''} onChange={e => setClaimForm({...claimForm, tipe_barang: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div><label className="block text-sm font-medium mb-1">Tgl Pembelian</label><input type="date" value={claimForm.tanggal_pembelian || ''} onChange={e => setClaimForm({...claimForm, tanggal_pembelian: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Validasi MKT</label><select value={claimForm.validasi_by_mkt || ''} onChange={e => setClaimForm({...claimForm, validasi_by_mkt: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div><div><label className="block text-sm font-medium mb-1">Validasi FA</label><select value={claimForm.validasi_by_fa || ''} onChange={e => setClaimForm({...claimForm, validasi_by_fa: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div></div><div className="grid grid-cols-2 gap-4 p-3 bg-blue-50 border border-blue-100 rounded-md"><div className="col-span-2"><p className="text-xs text-blue-700 font-medium mb-2">*Catatan: Notifikasi pengiriman WA HANYA aktif jika Anda mengisi Nomor Resi di bawah ini.</p></div><div><label className="block text-sm font-medium mb-1">Jasa Pengiriman</label><input type="text" value={claimForm.nama_jasa_pengiriman || ''} onChange={e => setClaimForm({...claimForm, nama_jasa_pengiriman: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="JNE / J&T / dll" /></div><div><label className="block text-sm font-medium mb-1">Nomor Resi</label><input type="text" value={claimForm.nomor_resi || ''} onChange={e => setClaimForm({...claimForm, nomor_resi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Masukkan nomor resi..." /></div></div></form>)}
               
               {activeTab === 'warranties' && (
                 <form id="warrantyForm" onSubmit={handleSaveWarranty} className="space-y-4">
                   <div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={warrantyForm.nomor_seri || ''} onChange={e => setWarrantyForm({...warrantyForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                   <div><label className="block text-sm font-medium mb-1">Tipe Barang</label><input required type="text" value={warrantyForm.tipe_barang || ''} onChange={e => setWarrantyForm({...warrantyForm, tipe_barang: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                   <div className="grid grid-cols-3 gap-4">
                     <div><label className="block text-sm font-medium mb-1">Status Validasi</label><select value={warrantyForm.status_validasi || ''} onChange={e => setWarrantyForm({...warrantyForm, status_validasi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="Menunggu">Menunggu</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div>
                     <div><label className="block text-sm font-medium mb-1">Jenis Garansi</label><select value={warrantyForm.jenis_garansi || ''} onChange={e => setWarrantyForm({...warrantyForm, jenis_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="Jasa 30%">Jasa 30%</option><option value="Extended to 2 Year">Extended to 2 Year</option></select></div>
                     <div><label className="block text-sm font-medium mb-1">Lama Garansi</label><select value={warrantyForm.lama_garansi || ''} onChange={e => setWarrantyForm({...warrantyForm, lama_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="1 Tahun">1 Tahun</option><option value="2 Tahun">2 Tahun</option><option value="Tidak Garansi">Tidak Garansi</option></select></div>
                   </div>
                 </form>
               )}
               
               {activeTab === 'promos' && (
                 <form id="promoForm" onSubmit={handleSavePromo} className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1">Nama Promo</label><input required type="text" value={promoForm.nama_promo || ''} onChange={e => setPromoForm({...promoForm, nama_promo: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="block text-sm font-medium mb-1">Tgl Mulai</label><input required type="date" value={promoForm.tanggal_mulai || ''} onChange={e => setPromoForm({...promoForm, tanggal_mulai: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                       <div><label className="block text-sm font-medium mb-1">Tgl Selesai</label><input required type="date" value={promoForm.tanggal_selesai || ''} onChange={e => setPromoForm({...promoForm, tanggal_selesai: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                    </div>
                    <div><label className="flex items-center gap-2"><input type="checkbox" checked={promoForm.status_aktif || false} onChange={e => setPromoForm({...promoForm, status_aktif: e.target.checked})} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" /> <span className="text-sm font-medium text-slate-700">Promo Aktif</span></label></div>
                    
                    {/* BUILDER TIPE PRODUK UNTUK PROMO */}
                    <div className="mt-4 border-t pt-4">
                       <div className="flex justify-between items-center mb-2">
                         <label className="block text-sm font-medium">Tipe Produk yang Berlaku</label>
                         <button type="button" onClick={() => setPromoForm({...promoForm, tipe_produk: [...(promoForm.tipe_produk || []), {nama_produk: ''}]})} className="bg-slate-200 px-3 py-1 rounded text-xs font-medium hover:bg-slate-300 transition">+ Tambah Produk</button>
                       </div>
                       {promoForm.tipe_produk?.map((item, index) => (
                         <div key={index} className="flex gap-2 mb-2 items-center">
                            <div className="flex-1">
                               <input type="text" required value={item.nama_produk} onChange={e => { const newItems = [...(promoForm.tipe_produk||[])]; newItems[index].nama_produk = e.target.value; setPromoForm({...promoForm, tipe_produk: newItems})}} className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Contoh: Nikon Z6 III / Lensa Z 50mm"/>
                            </div>
                            <button type="button" onClick={() => { const newItems = [...(promoForm.tipe_produk||[])]; newItems.splice(index, 1); setPromoForm({...promoForm, tipe_produk: newItems}); }} className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-2 rounded text-sm transition">X</button>
                         </div>
                       ))}
                       {(!promoForm.tipe_produk || promoForm.tipe_produk.length === 0) && <p className="text-xs text-slate-400 italic">Belum ada produk ditambahkan</p>}
                    </div>
                 </form>
               )}
               
               {activeTab === 'services' && (<form id="serviceForm" onSubmit={handleSaveService} className="space-y-4"><div><label className="block text-sm font-medium mb-1">Nomor Tanda Terima</label><input required type="text" value={serviceForm.nomor_tanda_terima || ''} onChange={e => setServiceForm({...serviceForm, nomor_tanda_terima: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Masukkan ID/Resi service" /></div><div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={serviceForm.nomor_seri || ''} onChange={e => setServiceForm({...serviceForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div><label className="block text-sm font-medium mb-1">Status Service</label><input required type="text" value={serviceForm.status_service || ''} onChange={e => setServiceForm({...serviceForm, status_service: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Contoh: Menunggu Sparepart / Selesai" /></div></form>)}

               {activeTab === 'budgets' && (
                 <form id="budgetForm" onSubmit={handleSaveBudget} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Proposal No</label><input required type="text" value={budgetForm.proposal_no || ''} onChange={e => setBudgetForm({...budgetForm, proposal_no: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="MKTG-2025..." /></div><div><label className="block text-sm font-medium mb-1">Title</label><input required type="text" value={budgetForm.title || ''} onChange={e => setBudgetForm({...budgetForm, title: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div></div>
                    <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Period (Tanggal)</label><input required type="text" value={budgetForm.period || ''} onChange={e => setBudgetForm({...budgetForm, period: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium mb-1">Budget Source</label><input required type="text" value={budgetForm.budget_source || ''} onChange={e => setBudgetForm({...budgetForm, budget_source: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div></div>
                    <div><label className="block text-sm font-medium mb-1">Objectives</label><textarea required rows={2} value={budgetForm.objectives || ''} onChange={e => setBudgetForm({...budgetForm, objectives: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium mb-1">Detail of Activity</label><textarea required rows={2} value={budgetForm.detail_activity || ''} onChange={e => setBudgetForm({...budgetForm, detail_activity: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium mb-1">Expected Result</label><textarea required rows={2} value={budgetForm.expected_result || ''} onChange={e => setBudgetForm({...budgetForm, expected_result: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div>
                    <div><label className="block text-sm font-medium mb-1">Lampiran Poster (Link URL Gambar)</label><input type="url" value={budgetForm.attachment_url || ''} onChange={e => setBudgetForm({...budgetForm, attachment_url: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" placeholder="https://contoh.com/gambar.jpg" /></div>
                    
                    <div className="mt-6 border-t pt-4">
                       <div className="flex justify-between items-center mb-2"><label className="block text-sm font-medium">Rincian Budget (Items)</label><button type="button" onClick={() => setBudgetForm({...budgetForm, items: [...(budgetForm.items || []), {purpose: '', qty: 1, cost_unit: 0, value: 0}]})} className="bg-slate-200 px-3 py-1 rounded text-xs font-medium hover:bg-slate-300 transition">+ Tambah Item</button></div>
                       {budgetForm.items?.map((item, index) => (
                         <div key={index} className="flex gap-2 mb-2 items-end">
                            <div className="flex-1"><label className="text-xs text-slate-500">Purpose</label><input type="text" value={item.purpose} onChange={e => { const newItems = [...(budgetForm.items||[])]; newItems[index].purpose = e.target.value; setBudgetForm({...budgetForm, items: newItems})}} className="w-full border rounded px-2 py-1 text-sm outline-none focus:border-blue-500"/></div>
                            <div className="w-16"><label className="text-xs text-slate-500">Qty</label><input type="number" value={item.qty} onChange={e => { const newItems = [...(budgetForm.items||[])]; newItems[index].qty = Number(e.target.value); newItems[index].value = newItems[index].qty * newItems[index].cost_unit; setBudgetForm({...budgetForm, items: newItems})}} className="w-full border rounded px-2 py-1 text-sm outline-none focus:border-blue-500"/></div>
                            <div className="w-32"><label className="text-xs text-slate-500">Cost/Unit</label><input type="number" value={item.cost_unit} onChange={e => { const newItems = [...(budgetForm.items||[])]; newItems[index].cost_unit = Number(e.target.value); newItems[index].value = newItems[index].qty * newItems[index].cost_unit; setBudgetForm({...budgetForm, items: newItems})}} className="w-full border rounded px-2 py-1 text-sm outline-none focus:border-blue-500"/></div>
                            <div className="w-32"><label className="text-xs text-slate-500">Value (Auto)</label><input type="number" readOnly value={item.value} className="w-full border bg-slate-50 rounded px-2 py-1 text-sm"/></div>
                            <button type="button" onClick={() => { const newItems = [...(budgetForm.items||[])]; newItems.splice(index, 1); setBudgetForm({...budgetForm, items: newItems}); }} className="bg-red-100 hover:bg-red-200 text-red-600 px-2 py-1 rounded text-sm mb-0.5 transition">X</button>
                         </div>
                       ))}
                       <div className="flex justify-end items-center mt-4 gap-4">
                          <button type="button" onClick={() => { const total = (budgetForm.items || []).reduce((acc, curr) => acc + curr.value, 0); setBudgetForm({...budgetForm, total_cost: total}); }} className="text-xs text-blue-600 hover:text-blue-800 underline transition">Hitung Ulang Total</button>
                          <div className="font-bold">Total Cost: Rp {Number(budgetForm.total_cost || 0).toLocaleString('id-ID')}</div>
                       </div>
                    </div>
                 </form>
               )}
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3"><button onClick={closeModal} className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-md text-sm font-medium transition">Batal</button><button type="submit" form={activeTab === 'claims' ? 'claimForm' : activeTab === 'warranties' ? 'warrantyForm' : activeTab === 'services' ? 'serviceForm' : activeTab === 'promos' ? 'promoForm' : 'budgetForm'} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</button></div>
          </div>
        </div>
      )}

      {/* =========================================================
          PRINT AREA (FORMAT PERSIS PDF MKTG)
      ========================================================= */}
      {printData && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white text-black font-sans z-[100] min-h-screen pb-10" style={{ fontSize: '13px' }}>
          
          <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-4">
             <div className="flex items-center gap-4">
               <div className="font-extrabold text-xl tracking-tight">
                 ■BUDGET APPROVAL <br/>
                 <span className="font-normal text-sm">(SALES/MARKETING/SERVICE)</span>
               </div>
             </div>
             
             <div className="border-2 border-black">
                <div className="flex border-b border-black">
                   <div className="w-24 p-1 border-r border-black font-bold">Section:</div>
                   <div className="w-32 p-1 font-bold">MARKETING</div>
                </div>
                <div className="flex">
                   <div className="w-24 p-1 border-r border-black">No. of pages:</div>
                   <div className="w-32 p-1">1</div>
                </div>
             </div>
          </div>

          <div className="flex gap-2 mb-4 text-center">
             <div className="border-2 border-black w-48 flex flex-col">
                <div className="border-b-2 border-black p-1 font-bold bg-gray-50">Proposed/Prepared by</div>
                <div className="flex-1 flex items-end justify-center pb-2 font-bold">{printData.drafter_name || 'Firza'}</div>
                <div className="border-t border-black flex text-xs divide-x divide-black bg-gray-50">
                   <div className="p-1 w-1/2 text-left">Sign</div>
                   <div className="p-1 w-1/2 text-left">Date:</div>
                </div>
             </div>
             
             <div className="border-2 border-black flex-1 flex flex-col relative pt-5">
                <div className="absolute top-0 left-0 bg-white px-2 text-sm font-bold ml-2 -mt-2.5">PT Alta Nikindo</div>
                <div className="border-b border-black p-1 font-bold bg-gray-50">Management Approval</div>
                <div className="flex-1 flex divide-x divide-black min-h-[70px]">
                   <div className="flex-1 flex flex-col justify-end p-2 relative">
                      <div className="border-b border-dotted border-black w-full absolute bottom-4"></div>
                   </div>
                   <div className="flex-1 flex items-end justify-center pb-2 font-bold">Larry Handra</div>
                </div>
                <div className="border-t border-black flex text-xs divide-x divide-black bg-gray-50">
                   <div className="p-1 w-1/2 text-left font-bold border-b border-black">Comment</div>
                   <div className="p-1 w-1/2 text-left font-bold border-b border-black">Consent</div>
                </div>
                <div className="flex text-xs divide-x divide-black">
                   <div className="p-1 w-1/2 text-right">Date:</div>
                   <div className="p-1 w-1/2 text-right">Date:</div>
                </div>
             </div>

             <div className="border-2 border-black w-48 flex flex-col">
                <div className="border-b-2 border-black p-1 font-bold bg-gray-50">Finance Accounting Dept</div>
                <div className="flex-1 flex items-end justify-center pb-2"></div>
                <div className="border-t border-black text-xs p-1 text-left font-bold border-b border-black bg-gray-50">Consent</div>
                <div className="text-xs p-1 text-right">Date:</div>
             </div>
          </div>

          <div className="border-2 border-black mb-4">
             <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Title:</div><div className="p-1.5 flex-1 font-bold">{printData.title}</div></div>
             <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Proposal No:</div><div className="p-1.5 flex-1">{printData.proposal_no}</div></div>
             <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Period:</div><div className="p-1.5 flex-1">{printData.period}</div></div>
             <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Objectives:</div><div className="p-1.5 flex-1 whitespace-pre-wrap">{printData.objectives}</div></div>
             <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Detail of Activity:</div><div className="p-1.5 flex-1 whitespace-pre-wrap min-h-[30px]">{printData.detail_activity}</div></div>
             <div className="flex border-b border-black"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Expected Result:</div><div className="p-1.5 flex-1 whitespace-pre-wrap">{printData.expected_result}</div></div>
             <div className="flex"><div className="w-40 font-bold p-1.5 border-r border-black bg-gray-50">Total Cost:</div><div className="p-1.5 flex-1 font-bold">Rp {Number(printData.total_cost).toLocaleString('id-ID')}</div></div>
          </div>

          <div className="mb-4">
             <table className="w-full border-collapse border-2 border-black">
                <thead>
                   <tr className="bg-gray-50">
                      <th className="border border-black p-1 w-10 text-center font-bold">No</th>
                      <th className="border border-black p-1 text-center font-bold">Purpose</th>
                      <th className="border border-black p-1 w-16 text-center font-bold">Qty</th>
                      <th className="border border-black p-1 w-32 text-center font-bold">Cost / Unit</th>
                      <th className="border border-black p-1 w-32 text-center font-bold">Petty Cash</th>
                      <th className="border border-black p-1 w-32 text-center font-bold">Value</th>
                   </tr>
                </thead>
                <tbody>
                   {printData.items && printData.items.length > 0 ? (
                      printData.items.map((item, idx) => (
                        <tr key={idx}>
                           <td className="border border-black p-1 text-center">{idx + 1}</td>
                           <td className="border border-black p-1 text-left">{item.purpose}</td>
                           <td className="border border-black p-1 text-center">{item.qty}</td>
                           <td className="border border-black p-1 text-right">{Number(item.cost_unit).toLocaleString('id-ID')}</td>
                           <td className="border border-black p-1 text-center"></td>
                           <td className="border border-black p-1 text-right">{Number(item.value).toLocaleString('id-ID')}</td>
                        </tr>
                      ))
                   ) : (
                      <tr><td colSpan={6} className="border border-black py-4 text-center text-gray-500">Tidak ada rincian item</td></tr>
                   )}
                   <tr>
                      <td colSpan={3} className="border-l border-b border-black bg-white"></td>
                      <td colSpan={2} className="border border-black p-1 text-right font-bold pr-4 bg-gray-50">Subtotal</td>
                      <td className="border border-black p-1 text-right font-bold bg-gray-50">{Number(printData.total_cost).toLocaleString('id-ID')}</td>
                   </tr>
                   <tr>
                      <td colSpan={3} className="border-l border-b border-black bg-white"></td>
                      <td colSpan={2} className="border border-black p-1 text-right font-bold pr-4 bg-gray-50">Total</td>
                      <td className="border border-black p-1 text-right font-bold bg-gray-50">{Number(printData.total_cost).toLocaleString('id-ID')}</td>
                   </tr>
                </tbody>
             </table>
          </div>

          <div className="font-bold text-sm mb-4">
             <div>Budget Source: <span className="font-normal ml-2">{printData.budget_source || 'Marketing Budget'}</span></div>
             <div className="mt-1">Attachment(s):</div>
          </div>

          {printData.attachment_url && (
             <div className="mt-4 flex justify-center w-full max-h-[400px] overflow-hidden border border-gray-300 p-2">
                 <img src={printData.attachment_url} alt="Lampiran Budget Approval" className="object-contain max-h-[380px]" />
             </div>
          )}
        </div>
      )}

    </div>
  );
}