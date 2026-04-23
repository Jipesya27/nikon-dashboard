'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const supabaseUrl = 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const FONNTE_TOKEN = process.env.NEXT_PUBLIC_FONNTE_TOKEN || 'xYsGrYetdkLXoK72dDtc'; 

// --- TYPES ---
interface Karyawan { username: string; nama_karyawan: string; role: string; }
interface RiwayatPesan { id_pesan?: string; nomor_wa: string; nama_profil_wa: string; arah_pesan: 'IN' | 'OUT'; isi_pesan: string; waktu_pesan: string; bicara_dengan_cs?: boolean; created_at?: string; }
interface ClaimPromo { id_claim?: string; nomor_wa: string; nomor_seri: string; tipe_barang: string; tanggal_pembelian: string; nama_toko?: string; jenis_promosi?: string; validasi_by_mkt: string; validasi_by_fa: string; nama_jasa_pengiriman?: string; nomor_resi?: string; link_kartu_garansi?: string; link_nota_pembelian?: string; }
interface Garansi { id_garansi?: string; nomor_seri: string; tipe_barang: string; status_validasi: string; jenis_garansi: string; lama_garansi: string; }
interface Promosi { id_promo?: string; nama_promo: string; tipe_produk: string; tanggal_mulai: string; tanggal_selesai: string; status_aktif: boolean; }

const sendWhatsAppMessageViaFonnte = async (targetWa: string, message: string) => {
  try {
    const formData = new FormData(); formData.append('target', targetWa); formData.append('message', message);
    await fetch('https://api.fonnte.com/send', { method: 'POST', headers: { 'Authorization': FONNTE_TOKEN }, body: formData });
  } catch (error) { console.error("Gagal mengirim Fonnte:", error); }
};

export default function NikonDashboard() {
  // LOGIN STATE
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<Karyawan | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // DASHBOARD STATE
  const [messages, setMessages] = useState<RiwayatPesan[]>([]);
  const [claims, setClaims] = useState<ClaimPromo[]>([]);
  const [warranties, setWarranties] = useState<Garansi[]>([]);
  const [promos, setPromos] = useState<Promosi[]>([]);
  const [consumers, setConsumers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');
  
  // PERBAIKAN: Default rentang ditarik jauh ke belakang agar semua data tampil
  const [dateRange, setDateRange] = useState({ 
    start: '2024-01-01', 
    end: new Date().toISOString().split('T')[0] 
  });

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
  const [promoForm, setPromoForm] = useState<Partial<Promosi>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedSession = localStorage.getItem('nikon_karyawan');
    if (savedSession) { setCurrentUser(JSON.parse(savedSession)); setIsLoggedIn(true); } 
    else { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    setLoading(true);
    fetchConsumers(); fetchMessages(); fetchClaims(); fetchWarranties(); fetchPromos();
    
    const subscription = supabase.channel('messages-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_pesan' }, (payload) => {
        if (payload.eventType === 'INSERT') setMessages(prev => [payload.new as RiwayatPesan, ...prev]);
      }).subscribe();
    return () => { subscription.unsubscribe(); };
  }, [isLoggedIn, dateRange]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoginError('');
    const { data } = await supabase.from('karyawan').select('username, nama_karyawan, role').eq('username', loginForm.username).eq('password', loginForm.password).single();
    if (data) { setCurrentUser(data); setIsLoggedIn(true); localStorage.setItem('nikon_karyawan', JSON.stringify(data)); } 
    else { setLoginError('Username atau Password salah!'); }
  };

  const handleLogout = () => { localStorage.removeItem('nikon_karyawan'); setIsLoggedIn(false); setCurrentUser(null); };

  const fetchConsumers = async () => { 
    const map: Record<string, string> = {};
    const { data: konsumenData } = await supabase.from('konsumen').select('nomor_wa, nama_lengkap');
    if (konsumenData) konsumenData.forEach(k => { if (k.nama_lengkap) map[k.nomor_wa] = k.nama_lengkap; });

    const { data: riwayatData } = await supabase.from('riwayat_pesan').select('nomor_wa, nama_profil_wa').neq('nama_profil_wa', 'Sistem Bot').order('created_at', { ascending: false }).limit(2000);
    if (riwayatData) riwayatData.forEach(r => { if (!map[r.nomor_wa] && r.nama_profil_wa && r.nama_profil_wa !== r.nomor_wa) map[r.nomor_wa] = r.nama_profil_wa; });
    setConsumers(map); 
  };

  // PERBAIKAN: Menambahkan Error Log jika koneksi / RLS gagal
  const fetchMessages = async () => { const { data, error } = await supabase.from('riwayat_pesan').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false }); if(error) console.error("Err Msg:", error); setMessages(data || []); };
  const fetchClaims = async () => { const { data, error } = await supabase.from('claim_promo').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false }); if(error) console.error("Err Claim:", error); setClaims(data || []); };
  const fetchWarranties = async () => { const { data, error } = await supabase.from('garansi').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false }); if(error) console.error("Err Warranty:", error); setWarranties(data || []); };
  const fetchPromos = async () => { const { data, error } = await supabase.from('promosi').select('*').order('created_at', { ascending: false }); if(error) console.error("Err Promo:", error); setPromos(data || []); setLoading(false); };

  const openModal = (action: 'create'|'edit', type: 'claim'|'warranty'|'promo', item?: any) => {
    setModalAction(action);
    if (type === 'claim') { setClaimForm(item || { validasi_by_mkt: 'Dalam Proses Verifikasi', validasi_by_fa: 'Dalam Proses Verifikasi' }); setEditingId(item?.id_claim || null); }
    else if (type === 'warranty') { setWarrantyForm(item || { status_validasi: 'Menunggu', jenis_garansi: 'Extended to 2 Year', lama_garansi: '1 Tahun' }); setEditingId(item?.id_garansi || null); }
    else if (type === 'promo') { setPromoForm(item || { status_aktif: true }); setEditingId(item?.id_promo || null); }
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setClaimForm({}); setWarrantyForm({}); setPromoForm({}); setEditingId(null); };

  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      if (modalAction === 'create') await supabase.from('claim_promo').insert([claimForm]);
      else await supabase.from('claim_promo').update(claimForm).eq('id_claim', editingId);

      if (claimForm.nomor_wa && claimForm.nomor_seri && window.confirm(`Kirim otomatis ke WA (${claimForm.nomor_wa}) mengenai Claim ini?`)) {
          const autoMessage = `Data ditemukan,\nNomor Seri : ${claimForm.nomor_seri}\nBarang : ${claimForm.tipe_barang || '-'}\nValidasi MKT : ${claimForm.validasi_by_mkt || '-'}\nJasa Kirim : ${claimForm.nama_jasa_pengiriman || '-'}\nNo Resi : ${claimForm.nomor_resi || '-'}`;
          await sendWhatsAppMessageViaFonnte(claimForm.nomor_wa, autoMessage);
          const profilName = getRealProfileName(claimForm.nomor_wa);
          await supabase.from('riwayat_pesan').insert([{ nomor_wa: claimForm.nomor_wa, nama_profil_wa: profilName, arah_pesan: 'OUT', isi_pesan: autoMessage, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: true }]);
      }
      fetchClaims(); closeModal();
    } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try { if (modalAction === 'create') await supabase.from('garansi').insert([warrantyForm]); else await supabase.from('garansi').update(warrantyForm).eq('id_garansi', editingId); fetchWarranties(); closeModal(); } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try { if (modalAction === 'create') await supabase.from('promosi').insert([promoForm]); else await supabase.from('promosi').update(promoForm).eq('id_promo', editingId); fetchPromos(); closeModal(); } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (type: 'claim'|'warranty'|'promo', id: string) => {
    if (!window.confirm('Yakin menghapus data?')) return;
    if (type === 'claim') { await supabase.from('claim_promo').delete().eq('id_claim', id); fetchClaims(); }
    else if (type === 'warranty') { await supabase.from('garansi').delete().eq('id_garansi', id); fetchWarranties(); }
    else { await supabase.from('promosi').delete().eq('id_promo', id); fetchPromos(); }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedWa || !replyText.trim()) return;
    await sendWhatsAppMessageViaFonnte(selectedWa, replyText.trim());
    const profilName = getRealProfileName(selectedWa);
    await supabase.from('riwayat_pesan').insert([{ nomor_wa: selectedWa, nama_profil_wa: profilName, arah_pesan: 'OUT', isi_pesan: replyText.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: true }]);
    setReplyText('');
  };

  const handleSendNewChat = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newChatWa || !newChatMsg.trim()) return;
    await sendWhatsAppMessageViaFonnte(newChatWa, newChatMsg.trim());
    const profilName = getRealProfileName(newChatWa);
    await supabase.from('riwayat_pesan').insert([{ nomor_wa: newChatWa, nama_profil_wa: profilName, arah_pesan: 'OUT', isi_pesan: newChatMsg.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: true }]);
    setIsNewChatModalOpen(false); setNewChatWa(''); setNewChatMsg(''); setSelectedWa(newChatWa);
  };

  const calculateSisaGaransi = (tgl: string | undefined, lama: string) => {
    if (!tgl || !lama || lama === 'Tidak Garansi') return 'Tidak Garansi';
    const beli = new Date(tgl); beli.setFullYear(beli.getFullYear() + (lama === '1 Tahun' ? 1 : 2));
    const diff = beli.getTime() - new Date().getTime();
    return diff < 0 ? 'Garansi Habis' : `${Math.ceil(diff / (1000 * 60 * 60 * 24))} Hari`;
  };

  const getRealProfileName = (nomorWa: string | null) => {
    if (!nomorWa) return 'Pelanggan';
    return consumers[nomorWa] || nomorWa;
  };

  const uniqueContacts = Array.from(messages.reduce((map, msg) => { if (!map.has(msg.nomor_wa)) map.set(msg.nomor_wa, msg); return map; }, new Map()).values());
  const currentChatThread = selectedWa ? messages.filter(m => m.nomor_wa === selectedWa).sort((a, b) => new Date(a.waktu_pesan).getTime() - new Date(b.waktu_pesan).getTime()) : [];
  
  const messagesByDate = Array.from(messages.reduce((acc, msg) => {
    const timestamp = msg.created_at || msg.waktu_pesan; 
    if (!timestamp) return acc; 
    const date = new Date(timestamp).toISOString().split('T')[0];
    const entry = acc.get(date) || { date, IN: 0, OUT: 0 }; msg.arah_pesan === 'IN' ? entry.IN++ : entry.OUT++; acc.set(date, entry); return acc;
  }, new Map()).values()).sort((a: any, b: any) => a.date.localeCompare(b.date));

  // --- TAMPILAN LOGIN ---
  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Nikon Admin</h1>
            <p className="text-sm text-slate-500">Masuk untuk mengelola Bot & Data</p>
          </div>
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
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-slate-900">🤖 Nikon Bot Dashboard</h1><p className="text-xs text-slate-500">Role: {currentUser?.role}</p></div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Hi, {currentUser?.nama_karyawan}</span>
          <button onClick={handleLogout} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-medium transition">Logout</button>
        </div>
      </header>
      
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6">
        <div className="flex gap-8 overflow-x-auto">
          {[{ id: 'messages', label: '💬 Pesan', count: messages.length }, { id: 'promos', label: '📢 Promo', count: promos.length }, { id: 'claims', label: '🎫 Claim', count: claims.length }, { id: 'warranties', label: '🛡️ Garansi', count: warranties.length }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-4 font-medium whitespace-nowrap transition ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab.label} <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{tab.count}</span></button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-4">
            <label className="text-sm font-medium">Dari: <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="ml-2 border rounded p-1 outline-none focus:border-blue-500"/></label>
            <label className="text-sm font-medium">Sampai: <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="ml-2 border rounded p-1 outline-none focus:border-blue-500"/></label>
          </div>
          <div className="flex gap-2">
            {activeTab === 'claims' && <button onClick={() => openModal('create', 'claim')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm transition">+ Claim</button>}
            {activeTab === 'warranties' && <button onClick={() => openModal('create', 'warranty')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm transition">+ Garansi</button>}
            {activeTab === 'promos' && currentUser?.role === 'Admin' && <button onClick={() => openModal('create', 'promo')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium text-sm transition">+ Promo</button>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {/* PESAN */}
        {activeTab === 'messages' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
              <div className="bg-white rounded-lg shadow-sm border flex flex-col h-full overflow-hidden">
                 <div className="p-4 border-b flex justify-between items-center bg-white z-10"><span className="font-bold">Percakapan</span><button onClick={() => setIsNewChatModalOpen(true)} className="bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium rounded hover:bg-blue-200 transition">+ Chat</button></div>
                 <div className="overflow-y-auto flex-1 divide-y">
                   {uniqueContacts.map((c: any) => (
                     <div key={c.nomor_wa} onClick={() => setSelectedWa(c.nomor_wa)} className={`p-4 cursor-pointer hover:bg-slate-50 transition ${selectedWa === c.nomor_wa ? 'border-l-4 border-blue-500 bg-blue-50/50' : 'border-l-4 border-transparent'}`}>
                       <div className="flex justify-between text-sm">
                         <span className="font-bold truncate">{getRealProfileName(c.nomor_wa)}</span>
                         <span className="text-[10px] text-slate-400 whitespace-nowrap">{new Date(c.waktu_pesan).toLocaleDateString('id-ID')}</span>
                       </div>
                       <div className="text-xs text-slate-500 truncate">{c.isi_pesan}</div>
                     </div>
                   ))}
                   {uniqueContacts.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Belum ada percakapan</div>}
                 </div>
              </div>
              
              {/* PERBAIKAN: Layout Chat Fixed dengan Background Pattern WhatsApp */}
              <div className="bg-white rounded-lg shadow-sm border lg:col-span-2 flex flex-col h-full overflow-hidden relative">
                 {selectedWa ? (
                    <>
                      <div className="p-4 border-b bg-slate-50 z-10">
                        <h3 className="font-bold">{getRealProfileName(selectedWa)}</h3>
                        <p className="text-xs text-slate-500">{selectedWa}</p>
                      </div>
                      
                      {/* Area Pesan Chat */}
                      <div 
                         className="flex-1 p-4 overflow-y-auto space-y-4"
                         style={{ 
                           backgroundColor: '#efeae2', 
                           backgroundImage: `url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')`, 
                           backgroundSize: '400px', 
                           backgroundRepeat: 'repeat' 
                         }}
                      >
                        {currentChatThread.map((msg: any) => (
                          <div key={msg.id_pesan || Math.random().toString()} className={`flex ${msg.arah_pesan === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                            {/* Styling Bubble Chat ala WA */}
                            <div className={`max-w-[75%] p-2.5 text-sm rounded-lg shadow-sm relative ${msg.arah_pesan === 'OUT' ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none'}`}>
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.isi_pesan}</p>
                              <div className="text-[10px] mt-1 text-right text-slate-500">{new Date(msg.waktu_pesan).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <form onSubmit={handleSendReply} className="p-4 border-t flex gap-2 bg-slate-50 z-10">
                        <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Ketik pesan..." className="flex-1 border border-slate-300 rounded-full px-5 py-2.5 text-sm outline-none focus:border-blue-500 shadow-sm" />
                        <button type="submit" disabled={!replyText.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-medium disabled:opacity-50 transition shadow-sm">Kirim</button>
                      </form>
                    </>
                 ) : <div className="flex-1 flex justify-center items-center text-slate-500 bg-slate-100">Pilih chat di samping untuk memulai percakapan</div>}
              </div>
            </div>
          </div>
        )}

        {/* PROMOS */}
        {activeTab === 'promos' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
            <table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-3 text-left">Nama Promo</th><th className="px-6 py-3 text-left">Produk</th><th className="px-6 py-3 text-left">Mulai - Selesai</th><th className="px-6 py-3 text-left">Status</th><th className="px-6 py-3 text-left">Aksi</th></tr></thead>
            <tbody className="divide-y">{promos.map(p => (
              <tr key={p.id_promo} className="hover:bg-slate-50"><td className="px-6 py-3 font-medium">{p.nama_promo}</td><td className="px-6 py-3">{p.tipe_produk}</td><td className="px-6 py-3">{p.tanggal_mulai} / {p.tanggal_selesai}</td><td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'Aktif' : 'Tidak Aktif'}</span></td>
              <td className="px-6 py-3 flex gap-3">{currentUser?.role === 'Admin' && <><button onClick={()=>openModal('edit','promo',p)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button><button onClick={()=>handleDelete('promo', p.id_promo!)} className="text-red-600 text-xs font-medium hover:underline">Hapus</button></>}</td></tr>
            ))}</tbody></table>
          </div>
        )}
        
        {/* CLAIMS & WARRANTIES */}
        {activeTab === 'claims' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
             <table className="w-full text-sm"><thead className="bg-slate-50 border-b whitespace-nowrap"><tr><th className="px-4 py-3 text-left">Nama</th><th className="px-4 py-3 text-left">No Seri</th><th className="px-4 py-3 text-left">Barang</th><th className="px-4 py-3 text-left">Tgl Beli</th><th className="px-4 py-3 text-left">Toko</th><th className="px-4 py-3 text-left">Nota/Garansi</th><th className="px-4 py-3 text-left">MKT / FA</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead>
             <tbody className="divide-y">{claims.map(c => (
               <tr key={c.id_claim} className="whitespace-nowrap hover:bg-slate-50"><td className="px-4 py-3 text-slate-700">{consumers[c.nomor_wa]||c.nomor_wa}</td><td className="px-4 py-3 font-mono">{c.nomor_seri}</td><td className="px-4 py-3">{c.tipe_barang}</td><td className="px-4 py-3">{c.tanggal_pembelian}</td><td className="px-4 py-3">{c.nama_toko || '-'}</td><td className="px-4 py-3 text-blue-500 font-medium">{c.link_nota_pembelian && <a href={c.link_nota_pembelian} target="_blank" rel="noreferrer" className="mr-3 hover:underline">Nota</a>} {c.link_kartu_garansi && <a href={c.link_kartu_garansi} target="_blank" rel="noreferrer" className="hover:underline">Garansi</a>}</td><td className="px-4 py-3 text-xs">{c.validasi_by_mkt} / {c.validasi_by_fa}</td>
               <td className="px-4 py-3 flex gap-2"><button onClick={()=>openModal('edit','claim',c)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button><button onClick={()=>handleDelete('claim',c.id_claim!)} className="text-red-600 text-xs font-medium hover:underline">Hapus</button></td></tr>
             ))}</tbody></table>
          </div>
        )}

        {activeTab === 'warranties' && (
           <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
             <table className="w-full text-sm"><thead className="bg-slate-50 border-b whitespace-nowrap"><tr><th className="px-4 py-3 text-left">No Seri</th><th className="px-4 py-3 text-left">Barang</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Jenis</th><th className="px-4 py-3 text-left">Sisa Garansi</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead>
             <tbody className="divide-y">{warranties.map(w => {
               const linked = claims.find(c => c.nomor_seri === w.nomor_seri);
               return (<tr key={w.id_garansi} className="whitespace-nowrap hover:bg-slate-50"><td className="px-4 py-3 font-mono">{w.nomor_seri}</td><td className="px-4 py-3">{w.tipe_barang}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${w.status_validasi === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{w.status_validasi}</span></td><td className="px-4 py-3">{w.jenis_garansi}</td><td className="px-4 py-3 font-bold text-slate-700">{calculateSisaGaransi(linked?.tanggal_pembelian, w.lama_garansi)}</td>
               <td className="px-4 py-3 flex gap-2"><button onClick={()=>openModal('edit','warranty',w)} className="text-blue-600 text-xs font-medium hover:underline">Edit</button><button onClick={()=>handleDelete('warranty',w.id_garansi!)} className="text-red-600 text-xs font-medium hover:underline">Hapus</button></td></tr>)
             })}</tbody></table>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
             <h2 className="text-lg font-bold">Pesan Baru</h2>
             <input type="text" value={newChatWa} onChange={e=>setNewChatWa(e.target.value)} placeholder="No WA (Contoh: 0812...)" className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" />
             <textarea rows={4} value={newChatMsg} onChange={e=>setNewChatMsg(e.target.value)} placeholder="Isi pesan..." className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"></textarea>
             <div className="flex justify-end gap-3"><button onClick={()=>setIsNewChatModalOpen(false)} className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-md text-sm font-medium transition">Batal</button><button onClick={handleSendNewChat} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50" disabled={!newChatWa || !newChatMsg}>Kirim</button></div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center"><h2 className="text-lg font-bold">{modalAction === 'create' ? 'Tambah' : 'Edit'} Data</h2><button onClick={closeModal} className="text-2xl text-slate-400 hover:text-slate-600 leading-none">×</button></div>
            <div className="p-6 overflow-y-auto">
               {activeTab === 'claims' && (<form id="claimForm" onSubmit={handleSaveClaim} className="space-y-4"><div><label className="block text-sm font-medium mb-1">Nomor WA</label><input required type="text" value={claimForm.nomor_wa || ''} onChange={e => setClaimForm({...claimForm, nomor_wa: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={claimForm.nomor_seri || ''} onChange={e => setClaimForm({...claimForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Tipe Barang</label><input type="text" value={claimForm.tipe_barang || ''} onChange={e => setClaimForm({...claimForm, tipe_barang: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div><label className="block text-sm font-medium mb-1">Tgl Pembelian</label><input type="date" value={claimForm.tanggal_pembelian || ''} onChange={e => setClaimForm({...claimForm, tanggal_pembelian: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Validasi MKT</label><select value={claimForm.validasi_by_mkt || ''} onChange={e => setClaimForm({...claimForm, validasi_by_mkt: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div><div><label className="block text-sm font-medium mb-1">Validasi FA</label><select value={claimForm.validasi_by_fa || ''} onChange={e => setClaimForm({...claimForm, validasi_by_fa: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div></div></form>)}
               {activeTab === 'warranties' && (<form id="warrantyForm" onSubmit={handleSaveWarranty} className="space-y-4"><div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={warrantyForm.nomor_seri || ''} onChange={e => setWarrantyForm({...warrantyForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Status Validasi</label><select value={warrantyForm.status_validasi || ''} onChange={e => setWarrantyForm({...warrantyForm, status_validasi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="Menunggu">Menunggu</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div><div><label className="block text-sm font-medium mb-1">Lama Garansi</label><select value={warrantyForm.lama_garansi || ''} onChange={e => setWarrantyForm({...warrantyForm, lama_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"><option value="1 Tahun">1 Tahun</option><option value="2 Tahun">2 Tahun</option><option value="Tidak Garansi">Tidak Garansi</option></select></div></div></form>)}
               {activeTab === 'promos' && (<form id="promoForm" onSubmit={handleSavePromo} className="space-y-4"><div><label className="block text-sm font-medium mb-1">Nama Promo</label><input required type="text" value={promoForm.nama_promo || ''} onChange={e => setPromoForm({...promoForm, nama_promo: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div><label className="block text-sm font-medium mb-1">Tipe Produk</label><input required type="text" value={promoForm.tipe_produk || ''} onChange={e => setPromoForm({...promoForm, tipe_produk: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Tgl Mulai</label><input required type="date" value={promoForm.tanggal_mulai || ''} onChange={e => setPromoForm({...promoForm, tanggal_mulai: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div><div><label className="block text-sm font-medium mb-1">Tgl Selesai</label><input required type="date" value={promoForm.tanggal_selesai || ''} onChange={e => setPromoForm({...promoForm, tanggal_selesai: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div></div></form>)}
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3"><button onClick={closeModal} className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 rounded-md text-sm font-medium transition">Batal</button><button type="submit" form={activeTab === 'claims' ? 'claimForm' : activeTab === 'warranties' ? 'warrantyForm' : 'promoForm'} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition disabled:opacity-50">{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}