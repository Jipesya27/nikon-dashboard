'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// PENGATURAN SUPABASE BARU
const supabaseUrl = 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// PENGATURAN FONNTE (Ganti token di file .env.local)
const FONNTE_TOKEN = process.env.NEXT_PUBLIC_FONNTE_TOKEN || 'xYsGrYetdkLXoK72dDtc'; 

// --- TYPES ---
interface RiwayatPesan {
  id_pesan?: string; nomor_wa: string; nama_profil_wa: string;
  arah_pesan: 'IN' | 'OUT'; isi_pesan: string; waktu_pesan: string; bicara_dengan_cs?: boolean; created_at?: string;
}
interface ClaimPromo {
  id_claim?: string; nomor_wa: string; nomor_seri: string; tipe_barang: string; tanggal_pembelian: string;
  nama_toko?: string; jenis_promosi?: string; validasi_by_mkt: string; validasi_by_fa: string;
  nama_jasa_pengiriman?: string; nomor_resi?: string; link_kartu_garansi?: string; link_nota_pembelian?: string;
}
interface Garansi {
  id_garansi?: string; nomor_seri: string; tipe_barang: string; status_validasi: string;
  jenis_garansi: string; lama_garansi: string;
}
interface Promosi {
  id_promo?: string; nama_promo: string; tipe_produk: string; tanggal_mulai: string; tanggal_selesai: string; status_aktif: boolean;
}

// --- UTILS FONNTE SENDER DARI WEB ---
const sendWhatsAppMessageViaFonnte = async (targetWa: string, message: string) => {
  try {
    const formData = new FormData();
    formData.append('target', targetWa);
    formData.append('message', message);

    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': FONNTE_TOKEN },
      body: formData
    });
  } catch (error) { console.error("Gagal mengirim via Fonnte API:", error); }
};

export default function NikonDashboard() {
  const [messages, setMessages] = useState<RiwayatPesan[]>([]);
  const [claims, setClaims] = useState<ClaimPromo[]>([]);
  const [warranties, setWarranties] = useState<Garansi[]>([]);
  const [promos, setPromos] = useState<Promosi[]>([]);
  const [consumers, setConsumers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    fetchConsumers(); fetchMessages(); fetchClaims(); fetchWarranties(); fetchPromos();
    const subscription = supabase.channel('messages-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_pesan' }, (payload) => {
        if (payload.eventType === 'INSERT') setMessages(prev => [payload.new as RiwayatPesan, ...prev]);
      }).subscribe();
    return () => { subscription.unsubscribe(); };
  }, [dateRange]);

  const fetchConsumers = async () => {
    const { data } = await supabase.from('konsumen').select('nomor_wa, nama_lengkap');
    const map = (data || []).reduce((acc, curr) => ({ ...acc, [curr.nomor_wa]: curr.nama_lengkap }), {});
    setConsumers(map);
  };
  const fetchMessages = async () => {
    const { data } = await supabase.from('riwayat_pesan').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false });
    setMessages(data || []);
  };
  const fetchClaims = async () => {
    const { data } = await supabase.from('claim_promo').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false });
    setClaims(data || []);
  };
  const fetchWarranties = async () => {
    const { data } = await supabase.from('garansi').select('*').gte('created_at', `${dateRange.start}T00:00:00`).lte('created_at', `${dateRange.end}T23:59:59`).order('created_at', { ascending: false });
    setWarranties(data || []);
  };
  const fetchPromos = async () => {
    const { data } = await supabase.from('promosi').select('*').order('created_at', { ascending: false });
    setPromos(data || []); setLoading(false);
  };

  const openModal = (action: 'create'|'edit', type: 'claim'|'warranty'|'promo', item?: any) => {
    setModalAction(action);
    if (type === 'claim') { setClaimForm(item || { validasi_by_mkt: 'Dalam Proses Verifikasi', validasi_by_fa: 'Dalam Proses Verifikasi' }); setEditingId(item?.id_claim || null); }
    else if (type === 'warranty') { setWarrantyForm(item || { status_validasi: 'Menunggu', jenis_garansi: 'Extended to 2 Year', lama_garansi: '1 Tahun' }); setEditingId(item?.id_garansi || null); }
    else if (type === 'promo') { setPromoForm(item || { status_aktif: true }); setEditingId(item?.id_promo || null); }
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setClaimForm({}); setWarrantyForm({}); setPromoForm({}); setEditingId(null); };

  // --- SUBMITS ---
  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      if (modalAction === 'create') await supabase.from('claim_promo').insert([claimForm]);
      else await supabase.from('claim_promo').update(claimForm).eq('id_claim', editingId);

      if (claimForm.nomor_wa && claimForm.nomor_seri) {
        if (window.confirm(`Kirim otomatis ke WA (${claimForm.nomor_wa}) mengenai data Claim Promo ini?`)) {
          const autoMessage = `Data ditemukan,\nNomor Seri : ${claimForm.nomor_seri}\nNama Barang : ${claimForm.tipe_barang || '-'}\nStatus Validasi MKT : ${claimForm.validasi_by_mkt || '-'}\nJasa Pengiriman : ${claimForm.nama_jasa_pengiriman || '-'}\nNomor Resi : ${claimForm.nomor_resi || '-'}`;
          await sendWhatsAppMessageViaFonnte(claimForm.nomor_wa, autoMessage);
          await supabase.from('riwayat_pesan').insert([{
            nomor_wa: claimForm.nomor_wa, nama_profil_wa: consumers[claimForm.nomor_wa] || claimForm.nomor_wa,
            arah_pesan: 'OUT', isi_pesan: autoMessage, waktu_pesan: new Date().toISOString(), bicara_dengan_cs: true
          }]);
        }
      }
      fetchClaims(); closeModal();
    } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      if (modalAction === 'create') await supabase.from('garansi').insert([warrantyForm]);
      else await supabase.from('garansi').update(warrantyForm).eq('id_garansi', editingId);
      fetchWarranties(); closeModal();
    } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      if (modalAction === 'create') await supabase.from('promosi').insert([promoForm]);
      else await supabase.from('promosi').update(promoForm).eq('id_promo', editingId);
      fetchPromos(); closeModal();
    } catch (err: any) { alert('Gagal: ' + err.message); } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (type: 'claim'|'warranty'|'promo', id: string) => {
    if (!window.confirm('Yakin menghapus data?')) return;
    if (type === 'claim') { await supabase.from('claim_promo').delete().eq('id_claim', id); fetchClaims(); }
    else if (type === 'warranty') { await supabase.from('garansi').delete().eq('id_garansi', id); fetchWarranties(); }
    else { await supabase.from('promosi').delete().eq('id_promo', id); fetchPromos(); }
  };

  // --- CHAT FUNCTIONS ---
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedWa || !replyText.trim()) return;
    await sendWhatsAppMessageViaFonnte(selectedWa, replyText.trim());
    await supabase.from('riwayat_pesan').insert([{
      nomor_wa: selectedWa, nama_profil_wa: consumers[selectedWa] || selectedWa,
      arah_pesan: 'OUT', isi_pesan: replyText.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: true
    }]);
    setReplyText('');
  };

  const handleSendNewChat = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newChatWa || !newChatMsg.trim()) return;
    await sendWhatsAppMessageViaFonnte(newChatWa, newChatMsg.trim());
    await supabase.from('riwayat_pesan').insert([{
      nomor_wa: newChatWa, nama_profil_wa: consumers[newChatWa] || newChatWa,
      arah_pesan: 'OUT', isi_pesan: newChatMsg.trim(), waktu_pesan: new Date().toISOString(), bicara_dengan_cs: true
    }]);
    setIsNewChatModalOpen(false); setNewChatWa(''); setNewChatMsg(''); setSelectedWa(newChatWa);
  };

  const calculateSisaGaransi = (tanggalPembelian: string | undefined, lamaGaransi: string) => {
    if (!tanggalPembelian || !lamaGaransi || lamaGaransi === 'Tidak Garansi') return 'Tidak Garansi';
    const beliDate = new Date(tanggalPembelian);
    beliDate.setFullYear(beliDate.getFullYear() + (lamaGaransi === '1 Tahun' ? 1 : 2));
    const diffTime = beliDate.getTime() - new Date().getTime();
    return diffTime < 0 ? 'Garansi Habis' : `${Math.ceil(diffTime / (1000 * 60 * 60 * 24))} Hari`;
  };

  const uniqueContacts = Array.from(messages.reduce((map, msg) => { if (!map.has(msg.nomor_wa)) map.set(msg.nomor_wa, msg); return map; }, new Map()).values());
  const currentChatThread = selectedWa ? messages.filter(m => m.nomor_wa === selectedWa).sort((a, b) => new Date(a.waktu_pesan).getTime() - new Date(b.waktu_pesan).getTime()) : [];
  const messagesByDate = Array.from(messages.reduce((acc, msg) => {
    if (!msg.created_at) return acc;
    const date = new Date(msg.created_at).toISOString().split('T')[0];
    const entry = acc.get(date) || { date, IN: 0, OUT: 0 };
    msg.arah_pesan === 'IN' ? entry.IN++ : entry.OUT++; acc.set(date, entry); return acc;
  }, new Map()).values()).sort((a: any, b: any) => a.date.localeCompare(b.date));

  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4"><h1 className="text-3xl font-bold text-slate-900">🤖 Nikon Bot Dashboard</h1></header>
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6">
        <div className="flex gap-8 overflow-x-auto">
          {[{ id: 'messages', label: '💬 Pesan', count: messages.length }, { id: 'promos', label: '📢 Promo Berlangsung', count: promos.length }, { id: 'claims', label: '🎫 Claim Promo', count: claims.length }, { id: 'warranties', label: '🛡️ Garansi', count: warranties.length }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-4 font-medium whitespace-nowrap ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-600 hover:text-slate-900'}`}>{tab.label} <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">{tab.count}</span></button>
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
            {activeTab === 'claims' && <button onClick={() => openModal('create', 'claim')} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm">+ Claim Promo</button>}
            {activeTab === 'warranties' && <button onClick={() => openModal('create', 'warranty')} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm">+ Garansi</button>}
            {activeTab === 'promos' && <button onClick={() => openModal('create', 'promo')} className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium text-sm">+ Promosi</button>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">
        {activeTab === 'messages' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-lg p-6 shadow-sm border h-72">
                <ResponsiveContainer width="100%" height="100%"><LineChart data={messagesByDate}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="date"/><YAxis/><Tooltip/><Line type="monotone" dataKey="IN" stroke="#3b82f6" name="Masuk"/><Line type="monotone" dataKey="OUT" stroke="#10b981" name="Keluar"/></LineChart></ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[550px]">
              <div className="bg-white rounded-lg shadow-sm border flex flex-col">
                 <div className="p-4 border-b flex justify-between items-center"><span className="font-bold">Percakapan</span><button onClick={() => setIsNewChatModalOpen(true)} className="bg-blue-100 text-blue-700 px-3 py-1 text-xs font-medium rounded hover:bg-blue-200">+ Pesan Baru</button></div>
                 <div className="overflow-y-auto flex-1 divide-y">
                   {uniqueContacts.map((c: any) => (
                     <div key={c.nomor_wa} onClick={() => setSelectedWa(c.nomor_wa)} className={`p-4 cursor-pointer hover:bg-slate-50 ${selectedWa === c.nomor_wa ? 'border-l-4 border-blue-500 bg-blue-50/50' : 'border-l-4 border-transparent'}`}>
                       <div className="flex justify-between text-sm"><span className="font-bold truncate">{consumers[c.nomor_wa] || c.nama_profil_wa || c.nomor_wa}</span></div>
                       <div className="text-xs text-slate-500 truncate">{c.isi_pesan}</div>
                     </div>
                   ))}
                 </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border lg:col-span-2 flex flex-col">
                 {selectedWa ? (
                    <>
                      <div className="p-4 border-b bg-slate-50"><h3 className="font-bold">{consumers[selectedWa] || 'Pelanggan'}</h3><p className="text-xs text-slate-500">{selectedWa}</p></div>
                      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
                        {currentChatThread.map((msg: any) => (
                          <div key={msg.id_pesan || Math.random().toString()} className={`flex ${msg.arah_pesan === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-3 text-sm rounded-lg ${msg.arah_pesan === 'OUT' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border rounded-bl-none'}`}>
                              <p className="whitespace-pre-wrap">{msg.isi_pesan}</p>
                              <div className="text-[10px] mt-1 text-right opacity-70">{new Date(msg.waktu_pesan).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'})}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleSendReply} className="p-4 border-t flex gap-2">
                        <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Balas pesan..." className="flex-1 border rounded-full px-4 py-2 text-sm outline-none focus:border-blue-500" />
                        <button type="submit" disabled={!replyText.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-medium disabled:opacity-50">Kirim</button>
                      </form>
                    </>
                 ) : <div className="flex-1 flex justify-center items-center text-slate-400">Pilih kontak untuk mulai percakapan</div>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'promos' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
            <table className="w-full text-sm"><thead className="bg-slate-50 border-b"><tr><th className="px-4 py-3 text-left">Nama Promo</th><th className="px-4 py-3 text-left">Produk</th><th className="px-4 py-3 text-left">Tgl Mulai</th><th className="px-4 py-3 text-left">Tgl Selesai</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead>
            <tbody className="divide-y">{promos.map(p => (
              <tr key={p.id_promo} className="hover:bg-slate-50"><td className="px-4 py-3 font-medium">{p.nama_promo}</td><td className="px-4 py-3">{p.tipe_produk}</td><td className="px-4 py-3">{p.tanggal_mulai}</td><td className="px-4 py-3">{p.tanggal_selesai}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${p.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{p.status_aktif ? 'Aktif' : 'Tidak Aktif'}</span></td>
              <td className="px-4 py-3 flex gap-2"><button onClick={()=>openModal('edit','promo',p)} className="text-blue-600 hover:underline text-xs">Edit</button><button onClick={()=>handleDelete('promo', p.id_promo!)} className="text-red-600 hover:underline text-xs">Hapus</button></td></tr>
            ))}</tbody></table>
          </div>
        )}
        
        {activeTab === 'claims' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
             <table className="w-full text-sm"><thead className="bg-slate-50 border-b whitespace-nowrap"><tr><th className="px-4 py-3 text-left">Nama Konsumen</th><th className="px-4 py-3 text-left">No Seri</th><th className="px-4 py-3 text-left">Barang</th><th className="px-4 py-3 text-left">Tgl Pembelian</th><th className="px-4 py-3 text-left">Nama Toko</th><th className="px-4 py-3 text-left">Link Garansi</th><th className="px-4 py-3 text-left">Link Nota</th><th className="px-4 py-3 text-left">Promosi</th><th className="px-4 py-3 text-left">MKT</th><th className="px-4 py-3 text-left">FA</th><th className="px-4 py-3 text-left">Jasa Kirim</th><th className="px-4 py-3 text-left">No Resi</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead>
             <tbody className="divide-y">{claims.map(c => (
               <tr key={c.id_claim} className="whitespace-nowrap hover:bg-slate-50"><td className="px-4 py-3 text-slate-700">{consumers[c.nomor_wa]||c.nomor_wa}</td><td className="px-4 py-3 font-mono">{c.nomor_seri}</td><td className="px-4 py-3">{c.tipe_barang}</td><td className="px-4 py-3">{c.tanggal_pembelian}</td><td className="px-4 py-3">{c.nama_toko || '-'}</td><td className="px-4 py-3 text-blue-500">{c.link_kartu_garansi ? <a href={c.link_kartu_garansi} target="_blank">Lihat</a> : '-'}</td><td className="px-4 py-3 text-blue-500">{c.link_nota_pembelian ? <a href={c.link_nota_pembelian} target="_blank">Lihat</a> : '-'}</td><td className="px-4 py-3">{c.jenis_promosi || '-'}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${c.validasi_by_mkt === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{c.validasi_by_mkt}</span></td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${c.validasi_by_fa === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{c.validasi_by_fa}</span></td><td className="px-4 py-3">{c.nama_jasa_pengiriman || '-'}</td><td className="px-4 py-3">{c.nomor_resi || '-'}</td>
               <td className="px-4 py-3 flex gap-2"><button onClick={()=>openModal('edit','claim',c)} className="text-blue-600 hover:underline text-xs">Edit</button><button onClick={()=>handleDelete('claim',c.id_claim!)} className="text-red-600 hover:underline text-xs">Hapus</button></td></tr>
             ))}</tbody></table>
          </div>
        )}

        {activeTab === 'warranties' && (
          <div className="bg-white rounded-lg shadow-sm border overflow-x-auto animate-fade-in">
             <table className="w-full text-sm"><thead className="bg-slate-50 border-b whitespace-nowrap"><tr><th className="px-4 py-3 text-left">No Seri</th><th className="px-4 py-3 text-left">Barang</th><th className="px-4 py-3 text-left">Tgl Pembelian</th><th className="px-4 py-3 text-left">Link Garansi</th><th className="px-4 py-3 text-left">Link Nota</th><th className="px-4 py-3 text-left">Status Validasi</th><th className="px-4 py-3 text-left">Jenis Garansi</th><th className="px-4 py-3 text-left">Lama Garansi</th><th className="px-4 py-3 text-left">Sisa Garansi</th><th className="px-4 py-3 text-left">Aksi</th></tr></thead>
             <tbody className="divide-y">{warranties.map(w => {
               const linked = claims.find(c => c.nomor_seri === w.nomor_seri);
               return (<tr key={w.id_garansi} className="whitespace-nowrap hover:bg-slate-50"><td className="px-4 py-3 font-mono">{w.nomor_seri}</td><td className="px-4 py-3">{w.tipe_barang}</td><td className="px-4 py-3">{linked?.tanggal_pembelian||'-'}</td><td className="px-4 py-3 text-blue-500">{linked?.link_kartu_garansi ? <a href={linked.link_kartu_garansi} target="_blank">Lihat</a> : '-'}</td><td className="px-4 py-3 text-blue-500">{linked?.link_nota_pembelian ? <a href={linked.link_nota_pembelian} target="_blank">Lihat</a> : '-'}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${w.status_validasi === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{w.status_validasi}</span></td><td className="px-4 py-3">{w.jenis_garansi}</td><td className="px-4 py-3">{w.lama_garansi}</td><td className="px-4 py-3 font-bold">{calculateSisaGaransi(linked?.tanggal_pembelian, w.lama_garansi)}</td>
               <td className="px-4 py-3 flex gap-2"><button onClick={()=>openModal('edit','warranty',w)} className="text-blue-600 hover:underline text-xs">Edit</button><button onClick={()=>handleDelete('warranty',w.id_garansi!)} className="text-red-600 hover:underline text-xs">Hapus</button></td></tr>)
             })}</tbody></table>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden p-6 space-y-4">
             <h2 className="text-lg font-bold">Pesan Baru</h2>
             <input type="text" value={newChatWa} onChange={e=>setNewChatWa(e.target.value)} placeholder="No WA (Contoh: 0812...)" className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500" />
             <textarea rows={4} value={newChatMsg} onChange={e=>setNewChatMsg(e.target.value)} placeholder="Isi pesan..." className="w-full border rounded px-3 py-2 text-sm outline-none focus:border-blue-500"></textarea>
             <div className="flex justify-end gap-3"><button onClick={()=>setIsNewChatModalOpen(false)} className="px-4 py-2 border rounded-md text-sm font-medium">Batal</button><button onClick={handleSendNewChat} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium">Kirim</button></div>
           </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center"><h2 className="text-lg font-bold">{modalAction === 'create' ? 'Tambah' : 'Edit'} Data</h2><button onClick={closeModal} className="text-xl">&times;</button></div>
            <div className="p-6 overflow-y-auto">
              {activeTab === 'promos' && (
                <form id="promoForm" onSubmit={handleSavePromo} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Nama Promo</label><input required type="text" value={promoForm.nama_promo || ''} onChange={e => setPromoForm({...promoForm, nama_promo: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Tipe Produk</label><input required type="text" value={promoForm.tipe_produk || ''} onChange={e => setPromoForm({...promoForm, tipe_produk: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Tgl Mulai</label><input required type="date" value={promoForm.tanggal_mulai || ''} onChange={e => setPromoForm({...promoForm, tanggal_mulai: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium mb-1">Tgl Selesai</label><input required type="date" value={promoForm.tanggal_selesai || ''} onChange={e => setPromoForm({...promoForm, tanggal_selesai: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div></div>
                  <div><label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={promoForm.status_aktif || false} onChange={e => setPromoForm({...promoForm, status_aktif: e.target.checked})} /> <span className="text-sm font-medium">Promo Aktif</span></label></div>
                </form>
              )}
              {activeTab === 'claims' && (
                <form id="claimForm" onSubmit={handleSaveClaim} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Nomor WA</label><input required type="text" value={claimForm.nomor_wa || ''} onChange={e => setClaimForm({...claimForm, nomor_wa: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={claimForm.nomor_seri || ''} onChange={e => setClaimForm({...claimForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Tipe Barang</label><input required type="text" value={claimForm.tipe_barang || ''} onChange={e => setClaimForm({...claimForm, tipe_barang: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium mb-1">Tgl Pembelian</label><input required type="date" value={claimForm.tanggal_pembelian || ''} onChange={e => setClaimForm({...claimForm, tanggal_pembelian: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Nama Toko</label><input type="text" value={claimForm.nama_toko || ''} onChange={e => setClaimForm({...claimForm, nama_toko: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium mb-1">Jenis Promosi</label><input type="text" value={claimForm.jenis_promosi || ''} onChange={e => setClaimForm({...claimForm, jenis_promosi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Link Garansi</label><input type="url" value={claimForm.link_kartu_garansi || ''} onChange={e => setClaimForm({...claimForm, link_kartu_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium mb-1">Link Nota</label><input type="url" value={claimForm.link_nota_pembelian || ''} onChange={e => setClaimForm({...claimForm, link_nota_pembelian: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Validasi MKT</label><select value={claimForm.validasi_by_mkt || ''} onChange={e => setClaimForm({...claimForm, validasi_by_mkt: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm"><option value="Dalam Proses Verifikasi">Proses Verifikasi</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div><div><label className="block text-sm font-medium mb-1">Validasi FA</label><select value={claimForm.validasi_by_fa || ''} onChange={e => setClaimForm({...claimForm, validasi_by_fa: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm"><option value="Dalam Proses Verifikasi">Proses Verifikasi</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Jasa Kirim</label><input type="text" value={claimForm.nama_jasa_pengiriman || ''} onChange={e => setClaimForm({...claimForm, nama_jasa_pengiriman: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div><div><label className="block text-sm font-medium mb-1">No Resi</label><input type="text" value={claimForm.nomor_resi || ''} onChange={e => setClaimForm({...claimForm, nomor_resi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div></div>
                </form>
              )}
              {activeTab === 'warranties' && (
                <form id="warrantyForm" onSubmit={handleSaveWarranty} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={warrantyForm.nomor_seri || ''} onChange={e => setWarrantyForm({...warrantyForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Tipe Barang</label><input required type="text" value={warrantyForm.tipe_barang || ''} onChange={e => setWarrantyForm({...warrantyForm, tipe_barang: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Status Validasi</label><select value={warrantyForm.status_validasi || ''} onChange={e => setWarrantyForm({...warrantyForm, status_validasi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm"><option value="Menunggu">Menunggu</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option></select></div>
                  <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Jenis Garansi</label><select value={warrantyForm.jenis_garansi || ''} onChange={e => setWarrantyForm({...warrantyForm, jenis_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm"><option value="Jasa 30%">Jasa 30%</option><option value="Extended to 2 Year">Extended to 2 Year</option></select></div><div><label className="block text-sm font-medium mb-1">Lama Garansi</label><select value={warrantyForm.lama_garansi || ''} onChange={e => setWarrantyForm({...warrantyForm, lama_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm"><option value="1 Tahun">1 Tahun</option><option value="2 Tahun">2 Tahun</option><option value="Tidak Garansi">Tidak Garansi</option></select></div></div>
                </form>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3"><button onClick={closeModal} className="px-4 py-2 border rounded-md text-sm">Batal</button><button type="submit" form={activeTab === 'claims' ? 'claimForm' : activeTab === 'warranties' ? 'warrantyForm' : 'promoForm'} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm">{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}