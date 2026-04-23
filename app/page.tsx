'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Types
interface RiwayatPesan {
  id_pesan?: string;
  sesi_pesan?: string;
  nomor_wa: string;
  nama_profil_wa: string;
  arah_pesan: 'IN' | 'OUT';
  isi_pesan: string;
  waktu_pesan: string;
  bicara_dengan_cs?: boolean;
  created_at?: string;
}

interface Konsumen {
  nomor_wa: string;
  nama_lengkap: string;
}

interface ClaimPromo {
  id_claim?: string;
  nomor_wa: string;
  nomor_seri: string;
  tipe_barang: string;
  tanggal_pembelian: string;
  nama_toko?: string; // Kolom baru
  jenis_promosi?: string; // Kolom baru
  validasi_by_mkt: string;
  validasi_by_fa: string;
  nama_jasa_pengiriman?: string;
  nomor_resi?: string;
  link_kartu_garansi?: string;
  link_nota_pembelian?: string;
  created_at?: string;
}

interface Garansi {
  id_garansi?: string;
  nomor_seri: string;
  tipe_barang: string;
  status_validasi: string;
  jenis_garansi: string;
  lama_garansi: string;
  sisa_garansi_hari?: number; // Akan dihitung otomatis
  created_at?: string;
}

interface Promosi {
  id_promo?: string;
  nama_promo: string;
  tipe_produk: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  status_aktif: boolean;
  created_at?: string;
}

// Dashboard Component
export default function NikonDashboard() {
  const [messages, setMessages] = useState<RiwayatPesan[]>([]);
  const [claims, setClaims] = useState<ClaimPromo[]>([]);
  const [warranties, setWarranties] = useState<Garansi[]>([]);
  const [promos, setPromos] = useState<Promosi[]>([]);
  const [consumers, setConsumers] = useState<Record<string, string>>({}); // Mapping nomor_wa -> nama_lengkap
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // CRUD States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Chat States
  const [selectedWa, setSelectedWa] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  
  // New Chat Modal States
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatWa, setNewChatWa] = useState('');
  const [newChatMsg, setNewChatMsg] = useState('');

  // Form States
  const [claimForm, setClaimForm] = useState<Partial<ClaimPromo>>({});
  const [warrantyForm, setWarrantyForm] = useState<Partial<Garansi>>({});
  const [promoForm, setPromoForm] = useState<Partial<Promosi>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Data Functions
  const fetchConsumers = async () => {
    try {
      const { data, error } = await supabase.from('konsumen').select('nomor_wa, nama_lengkap');
      if (error) throw error;
      const consumerMap = (data || []).reduce((acc, curr) => {
        acc[curr.nomor_wa] = curr.nama_lengkap;
        return acc;
      }, {} as Record<string, string>);
      setConsumers(consumerMap);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase.from('riwayat_pesan').select('*')
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMessages(data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchClaims = async () => {
    try {
      const { data, error } = await supabase.from('claim_promo').select('*')
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setClaims(data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchWarranties = async () => {
    try {
      const { data, error } = await supabase.from('garansi').select('*')
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setWarranties(data || []);
    } catch (error) { console.error('Error:', error); }
  };

  const fetchPromos = async () => {
    try {
      const { data, error } = await supabase.from('promosi').select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPromos(data || []);
    } catch (error) { console.error('Error:', error); } finally { setLoading(false); }
  };

  // Initial Fetch & Realtime
  useEffect(() => {
    fetchConsumers();
    fetchMessages();
    fetchClaims();
    fetchWarranties();
    fetchPromos();

    const subscription = supabase
      .channel('messages-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'riwayat_pesan' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [payload.new as RiwayatPesan, ...prev]);
        }
      })
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [dateRange]);

  // --- CRUD HANDLERS ---
  const openModal = (action: 'create' | 'edit', type: 'claim' | 'warranty' | 'promo', item?: any) => {
    setModalAction(action);
    if (type === 'claim') {
      setClaimForm(item || { validasi_by_mkt: 'Dalam Proses Verifikasi', validasi_by_fa: 'Dalam Proses Verifikasi' });
      setEditingId(item?.id_claim || null);
    } else if (type === 'warranty') {
      setWarrantyForm(item || { status_validasi: 'Menunggu', jenis_garansi: 'Extended to 2 Year', lama_garansi: '1 Tahun' });
      setEditingId(item?.id_garansi || null);
    } else if (type === 'promo') {
      setPromoForm(item || { status_aktif: true });
      setEditingId(item?.id_promo || null);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setClaimForm({});
    setWarrantyForm({});
    setPromoForm({});
    setEditingId(null);
  };

  const handleSaveClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalAction === 'create') {
        const { error } = await supabase.from('claim_promo').insert([claimForm]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('claim_promo').update(claimForm).eq('id_claim', editingId);
        if (error) throw error;
      }

      // Prompt kirim pesan otomatis setelah simpan
      if (claimForm.nomor_wa && claimForm.nomor_seri) {
        const confirmSendMsg = window.confirm(`Data berhasil disimpan!\n\nApakah Anda ingin mengirimkan pesan otomatis ke WhatsApp (${claimForm.nomor_wa}) mengenai data Claim Promo ini?`);
        if (confirmSendMsg) {
          const autoMessage = `Data ditemukan,\nNomor Seri : ${claimForm.nomor_seri}\nNama Barang : ${claimForm.tipe_barang || '-'}\nStatus Validasi MKT : ${claimForm.validasi_by_mkt || '-'}\nJasa Pengiriman : ${claimForm.nama_jasa_pengiriman || '-'}\nNomor Resi : ${claimForm.nomor_resi || '-'}`;
          await supabase.from('riwayat_pesan').insert([{
            nomor_wa: claimForm.nomor_wa,
            nama_profil_wa: consumers[claimForm.nomor_wa] || claimForm.nomor_wa,
            arah_pesan: 'OUT',
            isi_pesan: autoMessage,
            waktu_pesan: new Date().toISOString(),
            bicara_dengan_cs: true
          }]);
        }
      }
      fetchClaims();
      closeModal();
    } catch (error: any) { alert('Gagal menyimpan data: ' + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleSaveWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalAction === 'create') {
        const { error } = await supabase.from('garansi').insert([warrantyForm]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('garansi').update(warrantyForm).eq('id_garansi', editingId);
        if (error) throw error;
      }
      fetchWarranties();
      closeModal();
    } catch (error: any) { alert('Gagal menyimpan data: ' + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (modalAction === 'create') {
        const { error } = await supabase.from('promosi').insert([promoForm]);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('promosi').update(promoForm).eq('id_promo', editingId);
        if (error) throw error;
      }
      fetchPromos();
      closeModal();
    } catch (error: any) { alert('Gagal menyimpan data: ' + error.message); } 
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (type: 'claim' | 'warranty' | 'promo', id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) return;
    try {
      if (type === 'claim') {
        const { error } = await supabase.from('claim_promo').delete().eq('id_claim', id);
        if (error) throw error; fetchClaims();
      } else if (type === 'warranty') {
        const { error } = await supabase.from('garansi').delete().eq('id_garansi', id);
        if (error) throw error; fetchWarranties();
      } else {
        const { error } = await supabase.from('promosi').delete().eq('id_promo', id);
        if (error) throw error; fetchPromos();
      }
    } catch (error: any) { alert('Gagal menghapus data: ' + error.message); }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWa || !replyText.trim()) return;
    const profilWa = consumers[selectedWa] || selectedWa;
    try {
      const { error } = await supabase.from('riwayat_pesan').insert([{
        nomor_wa: selectedWa,
        nama_profil_wa: profilWa,
        arah_pesan: 'OUT',
        isi_pesan: replyText.trim(),
        waktu_pesan: new Date().toISOString(),
        bicara_dengan_cs: true
      }]);
      if (error) throw error;
      setReplyText('');
    } catch (error: any) { alert('Gagal mengirim pesan balasan: ' + error.message); }
  };

  const handleSendNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatWa || !newChatMsg.trim()) return;
    try {
      const { error } = await supabase.from('riwayat_pesan').insert([{
        nomor_wa: newChatWa,
        nama_profil_wa: consumers[newChatWa] || newChatWa,
        arah_pesan: 'OUT',
        isi_pesan: newChatMsg.trim(),
        waktu_pesan: new Date().toISOString(),
        bicara_dengan_cs: true
      }]);
      if (error) throw error;
      setIsNewChatModalOpen(false);
      setNewChatWa('');
      setNewChatMsg('');
      setSelectedWa(newChatWa); // Buka thread-nya langsung
    } catch (error: any) { alert('Gagal memulai percakapan: ' + error.message); }
  };

  // Helper function untuk sisa garansi
  const calculateSisaGaransi = (tanggalPembelian: string | undefined, lamaGaransi: string) => {
    if (!tanggalPembelian || !lamaGaransi || lamaGaransi === 'Tidak Garansi') return 'Tidak Garansi';
    
    const beliDate = new Date(tanggalPembelian);
    let tambahTahun = 0;
    if (lamaGaransi === '1 Tahun') tambahTahun = 1;
    if (lamaGaransi === '2 Tahun') tambahTahun = 2;
    
    beliDate.setFullYear(beliDate.getFullYear() + tambahTahun);
    
    const today = new Date();
    const diffTime = beliDate.getTime() - today.getTime();
    if (diffTime < 0) return 'Garansi Habis';
    
    const sisaHari = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${sisaHari} Hari`;
  };

  // Prepare Data for Views
  const messagesByDate = Array.from(
    messages.reduce((acc, msg) => {
      if (!msg.created_at) return acc;
      const date = new Date(msg.created_at).toISOString().split('T')[0];
      const entry = acc.get(date) || { date, IN: 0, OUT: 0 };
      if (msg.arah_pesan === 'IN') entry.IN++; else entry.OUT++;
      acc.set(date, entry);
      return acc;
    }, new Map<string, { date: string; IN: number; OUT: number }>()).values()
  ).sort((a, b) => a.date.localeCompare(b.date));

  const uniqueContacts = Array.from(
    messages.reduce((map, msg) => {
      if (!map.has(msg.nomor_wa)) { map.set(msg.nomor_wa, msg); }
      return map;
    }, new Map<string, RiwayatPesan>()).values()
  );

  const currentChatThread = selectedWa 
    ? messages.filter(m => m.nomor_wa === selectedWa).sort((a, b) => new Date(a.waktu_pesan).getTime() - new Date(b.waktu_pesan).getTime())
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-slate-900">🤖 Nikon Bot Dashboard</h1>
          <p className="text-slate-600 mt-1">Real-time monitoring & Data Management</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8 overflow-x-auto">
            {[
              { id: 'messages', label: '💬 Pesan', count: messages.length },
              { id: 'promos', label: '📢 Promo Berlangsung', count: promos.length },
              { id: 'claims', label: '🎫 Claim Promo', count: claims.length },
              { id: 'warranties', label: '🛡️ Garansi', count: warranties.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs bg-slate-100 px-2 py-1 rounded-full">{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Bar / Date Filter */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex-1 min-w-[300px]">
             <label className="text-sm font-medium text-slate-700 mr-4">
              Dari: 
              <input type="date" value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} className="ml-2 px-3 py-1 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Sampai:
              <input type="date" value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} className="ml-2 px-3 py-1 border border-slate-300 rounded-md text-sm outline-none focus:border-blue-500" />
            </label>
          </div>
          
          <div>
            {activeTab === 'claims' && (
              <button onClick={() => openModal('create', 'claim')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition shadow-sm">
                + Tambah Claim Promo
              </button>
            )}
            {activeTab === 'warranties' && (
              <button onClick={() => openModal('create', 'warranty')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition shadow-sm">
                + Tambah Garansi
              </button>
            )}
            {activeTab === 'promos' && (
              <button onClick={() => openModal('create', 'promo')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition shadow-sm">
                + Tambah Promosi
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-4 space-y-6">
        
        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="space-y-6 animate-fade-in">
            {/* Chart */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Grafik Lalu Lintas Pesan</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={messagesByDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" textAnchor="end" height={50} />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="IN" stroke="#3b82f6" strokeWidth={2} name="Pesan Masuk" />
                    <Line type="monotone" dataKey="OUT" stroke="#10b981" strokeWidth={2} name="Pesan Keluar" />
                  </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom Kiri: Daftar Kontak */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden col-span-1 flex flex-col h-[550px]">
                 <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                   <span className="font-semibold text-slate-800">Daftar Percakapan</span>
                   <button onClick={() => setIsNewChatModalOpen(true)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 text-xs font-medium rounded-md transition">
                     + Pesan Baru
                   </button>
                 </div>
                 <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                   {uniqueContacts.map(contact => (
                     <div 
                       key={contact.nomor_wa} 
                       onClick={() => setSelectedWa(contact.nomor_wa)} 
                       className={`p-4 cursor-pointer hover:bg-slate-50 transition ${selectedWa === contact.nomor_wa ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
                     >
                       <div className="flex justify-between items-start mb-1">
                          <span className="font-semibold text-sm text-slate-900 truncate">
                            {consumers[contact.nomor_wa] || contact.nama_profil_wa || contact.nomor_wa}
                          </span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                            {new Date(contact.waktu_pesan).toLocaleDateString('id-ID')}
                          </span>
                       </div>
                       <div className="text-xs text-slate-500 truncate">{contact.isi_pesan}</div>
                     </div>
                   ))}
                 </div>
              </div>

              {/* Kolom Kanan: Utas Chat */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden col-span-1 lg:col-span-2 flex flex-col h-[550px]">
                 {selectedWa ? (
                    <>
                      <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {consumers[selectedWa] || 'Pelanggan'}
                          </h3>
                          <p className="text-xs text-slate-500">{selectedWa}</p>
                        </div>
                      </div>

                      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
                        {currentChatThread.map(msg => (
                          <div key={msg.id_pesan || Math.random().toString()} className={`flex ${msg.arah_pesan === 'OUT' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-lg p-3 text-sm shadow-sm ${
                              msg.arah_pesan === 'OUT' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
                            }`}>
                              <p className="whitespace-pre-wrap">{msg.isi_pesan}</p>
                              <div className={`text-[10px] mt-1 text-right ${msg.arah_pesan === 'OUT' ? 'text-blue-100' : 'text-slate-400'}`}>
                                {new Date(msg.waktu_pesan).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-4 border-t border-slate-200 bg-white">
                        <form onSubmit={handleSendReply} className="flex gap-2 items-center">
                          <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Ketik pesan balasan..." className="flex-1 border border-slate-300 rounded-full px-5 py-2.5 text-sm outline-none focus:border-blue-500" />
                          <button type="submit" disabled={!replyText.trim()} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-sm font-medium transition disabled:opacity-50">Kirim</button>
                        </form>
                      </div>
                    </>
                 ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                      <p>Pilih kontak untuk mulai percakapan</p>
                    </div>
                 )}
              </div>
            </div>
          </div>
        )}

        {/* PROMO BERLANGSUNG TAB */}
        {activeTab === 'promos' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Nama Promo</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Tipe Produk</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Mulai</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Selesai</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {promos.map(promo => (
                      <tr key={promo.id_promo} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-900">{promo.nama_promo}</td>
                        <td className="px-6 py-3 text-slate-700">{promo.tipe_produk}</td>
                        <td className="px-6 py-3 text-slate-700">{promo.tanggal_mulai}</td>
                        <td className="px-6 py-3 text-slate-700">{promo.tanggal_selesai}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${promo.status_aktif ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {promo.status_aktif ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td className="px-6 py-3 flex gap-2">
                          <button onClick={() => openModal('edit', 'promo', promo)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                          <button onClick={() => handleDelete('promo', promo.id_promo!)} className="text-red-600 hover:text-red-800 font-medium text-xs">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CLAIMS TAB */}
        {activeTab === 'claims' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="whitespace-nowrap">
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Nama Konsumen</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">No Seri</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Barang</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Tanggal Pembelian</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Nama Toko</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Link Kartu Garansi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Link Nota</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Jenis Promosi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Validasi MKT</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Validasi FA</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Jasa Kirim</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Nomor Resi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {claims.map(claim => (
                      <tr key={claim.id_claim} className="hover:bg-slate-50 whitespace-nowrap">
                        <td className="px-4 py-3 text-slate-700">{consumers[claim.nomor_wa] || claim.nomor_wa}</td>
                        <td className="px-4 py-3 font-mono text-slate-900">{claim.nomor_seri}</td>
                        <td className="px-4 py-3 text-slate-700">{claim.tipe_barang}</td>
                        <td className="px-4 py-3 text-slate-700">{claim.tanggal_pembelian}</td>
                        <td className="px-4 py-3 text-slate-700">{claim.nama_toko || '-'}</td>
                        <td className="px-4 py-3">
                          {claim.link_kartu_garansi ? <a href={claim.link_kartu_garansi} target="_blank" className="text-blue-500 hover:underline">Lihat</a> : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {claim.link_nota_pembelian ? <a href={claim.link_nota_pembelian} target="_blank" className="text-blue-500 hover:underline">Lihat</a> : '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{claim.jenis_promosi || '-'}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${claim.validasi_by_mkt === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{claim.validasi_by_mkt}</span></td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${claim.validasi_by_fa === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{claim.validasi_by_fa}</span></td>
                        <td className="px-4 py-3 text-slate-700">{claim.nama_jasa_pengiriman || '-'}</td>
                        <td className="px-4 py-3 text-slate-700">{claim.nomor_resi || '-'}</td>
                        <td className="px-4 py-3 flex gap-2">
                          <button onClick={() => openModal('edit', 'claim', claim)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                          <button onClick={() => handleDelete('claim', claim.id_claim!)} className="text-red-600 hover:text-red-800 font-medium text-xs">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* WARRANTIES TAB */}
        {activeTab === 'warranties' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr className="whitespace-nowrap">
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">No Seri</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Barang</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Tanggal Pembelian</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Link Kartu Garansi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Link Nota</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Status Validasi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Jenis Garansi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Lama Garansi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Sisa Garansi</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-900">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {warranties.map(warranty => {
                      // Temukan data Claim yang ter-link berdasarkan Nomor Seri & Tipe Barang
                      const linkedClaim = claims.find(c => c.nomor_seri === warranty.nomor_seri);
                      return (
                        <tr key={warranty.id_garansi} className="hover:bg-slate-50 whitespace-nowrap">
                          <td className="px-4 py-3 font-mono text-slate-900">{warranty.nomor_seri}</td>
                          <td className="px-4 py-3 text-slate-700">{warranty.tipe_barang}</td>
                          <td className="px-4 py-3 text-slate-700">{linkedClaim?.tanggal_pembelian || '-'}</td>
                          <td className="px-4 py-3">{linkedClaim?.link_kartu_garansi ? <a href={linkedClaim.link_kartu_garansi} target="_blank" className="text-blue-500 hover:underline">Lihat</a> : '-'}</td>
                          <td className="px-4 py-3">{linkedClaim?.link_nota_pembelian ? <a href={linkedClaim.link_nota_pembelian} target="_blank" className="text-blue-500 hover:underline">Lihat</a> : '-'}</td>
                          <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${warranty.status_validasi === 'Valid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{warranty.status_validasi}</span></td>
                          <td className="px-4 py-3 text-slate-700">{warranty.jenis_garansi}</td>
                          <td className="px-4 py-3 text-slate-700">{warranty.lama_garansi}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {calculateSisaGaransi(linkedClaim?.tanggal_pembelian, warranty.lama_garansi)}
                          </td>
                          <td className="px-4 py-3 flex gap-2">
                             <button onClick={() => openModal('edit', 'warranty', warranty)} className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                             <button onClick={() => handleDelete('warranty', warranty.id_garansi!)} className="text-red-600 hover:text-red-800 font-medium text-xs">Hapus</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODAL FORM CHAT BARU --- */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
               <h2 className="text-lg font-bold text-slate-800">Mulai Pesan Baru</h2>
               <button onClick={() => setIsNewChatModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
             </div>
             <form onSubmit={handleSendNewChat} className="p-6 space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-1">Nomor WA Konsumen</label>
                 <input required type="text" value={newChatWa} onChange={e => setNewChatWa(e.target.value)} placeholder="Contoh: 08123456789" className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" />
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1">Isi Pesan</label>
                 <textarea required rows={4} value={newChatMsg} onChange={e => setNewChatMsg(e.target.value)} placeholder="Tulis pesan..." className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500"></textarea>
               </div>
               <div className="flex justify-end gap-3 mt-6">
                 <button type="button" onClick={() => setIsNewChatModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Batal</button>
                 <button type="submit" disabled={!newChatWa || !newChatMsg} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">Kirim Pesan</button>
               </div>
             </form>
           </div>
        </div>
      )}

      {/* --- MODAL FORM UTAMA (Claim/Warranty/Promo) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">
                {modalAction === 'create' ? 'Tambah Data' : 'Edit Data'} {activeTab === 'claims' ? 'Claim Promo' : activeTab === 'warranties' ? 'Garansi' : 'Promosi'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              
              {/* Form Promosi */}
              {activeTab === 'promos' && (
                <form id="promoForm" onSubmit={handleSavePromo} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Nama Promo</label><input required type="text" value={promoForm.nama_promo || ''} onChange={e => setPromoForm({...promoForm, nama_promo: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                  <div><label className="block text-sm font-medium mb-1">Tipe Produk</label><input required type="text" value={promoForm.tipe_produk || ''} onChange={e => setPromoForm({...promoForm, tipe_produk: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Tanggal Mulai</label><input required type="date" value={promoForm.tanggal_mulai || ''} onChange={e => setPromoForm({...promoForm, tanggal_mulai: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-sm font-medium mb-1">Tanggal Selesai</label><input required type="date" value={promoForm.tanggal_selesai || ''} onChange={e => setPromoForm({...promoForm, tanggal_selesai: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input type="checkbox" checked={promoForm.status_aktif || false} onChange={e => setPromoForm({...promoForm, status_aktif: e.target.checked})} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <span className="text-sm font-medium text-slate-700">Promo Aktif</span>
                    </label>
                  </div>
                </form>
              )}

              {/* Form Claim Promo */}
              {activeTab === 'claims' && (
                <form id="claimForm" onSubmit={handleSaveClaim} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Nomor WA</label><input required type="text" value={claimForm.nomor_wa || ''} onChange={e => setClaimForm({...claimForm, nomor_wa: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="081234..." /></div>
                    <div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={claimForm.nomor_seri || ''} onChange={e => setClaimForm({...claimForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-sm font-medium mb-1">Tipe Barang</label><input required type="text" value={claimForm.tipe_barang || ''} onChange={e => setClaimForm({...claimForm, tipe_barang: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                     <div><label className="block text-sm font-medium mb-1">Tanggal Pembelian</label><input required type="date" value={claimForm.tanggal_pembelian || ''} onChange={e => setClaimForm({...claimForm, tanggal_pembelian: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Nama Toko</label><input type="text" value={claimForm.nama_toko || ''} onChange={e => setClaimForm({...claimForm, nama_toko: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-sm font-medium mb-1">Jenis Promosi</label><input type="text" value={claimForm.jenis_promosi || ''} onChange={e => setClaimForm({...claimForm, jenis_promosi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Link Kartu Garansi</label><input type="url" value={claimForm.link_kartu_garansi || ''} onChange={e => setClaimForm({...claimForm, link_kartu_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="https://..." /></div>
                    <div><label className="block text-sm font-medium mb-1">Link Nota Pembelian</label><input type="url" value={claimForm.link_nota_pembelian || ''} onChange={e => setClaimForm({...claimForm, link_nota_pembelian: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="https://..." /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Validasi MKT</label>
                      <select value={claimForm.validasi_by_mkt || ''} onChange={e => setClaimForm({...claimForm, validasi_by_mkt: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Validasi FA</label>
                      <select value={claimForm.validasi_by_fa || ''} onChange={e => setClaimForm({...claimForm, validasi_by_fa: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="Dalam Proses Verifikasi">Dalam Proses Verifikasi</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Jasa Pengiriman</label><input type="text" value={claimForm.nama_jasa_pengiriman || ''} onChange={e => setClaimForm({...claimForm, nama_jasa_pengiriman: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                    <div><label className="block text-sm font-medium mb-1">Nomor Resi</label><input type="text" value={claimForm.nomor_resi || ''} onChange={e => setClaimForm({...claimForm, nomor_resi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                  </div>
                </form>
              )}

              {/* Form Garansi */}
              {activeTab === 'warranties' && (
                <form id="warrantyForm" onSubmit={handleSaveWarranty} className="space-y-4">
                  <div><label className="block text-sm font-medium mb-1">Nomor Seri</label><input required type="text" value={warrantyForm.nomor_seri || ''} onChange={e => setWarrantyForm({...warrantyForm, nomor_seri: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="Akan di-link ke Claim Promo" /></div>
                  <div><label className="block text-sm font-medium mb-1">Tipe Barang</label><input required type="text" value={warrantyForm.tipe_barang || ''} onChange={e => setWarrantyForm({...warrantyForm, tipe_barang: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500" /></div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status Validasi</label>
                    <select value={warrantyForm.status_validasi || ''} onChange={e => setWarrantyForm({...warrantyForm, status_validasi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500">
                      <option value="Menunggu">Menunggu</option><option value="Valid">Valid</option><option value="Tidak Valid">Tidak Valid</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Jenis Garansi</label>
                      <select value={warrantyForm.jenis_garansi || ''} onChange={e => setWarrantyForm({...warrantyForm, jenis_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="Jasa 30%">Jasa 30%</option>
                        <option value="Extended to 2 Year">Extended to 2 Year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Lama Garansi</label>
                      <select value={warrantyForm.lama_garansi || ''} onChange={e => setWarrantyForm({...warrantyForm, lama_garansi: e.target.value})} className="w-full border rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500">
                        <option value="1 Tahun">1 Tahun</option>
                        <option value="2 Tahun">2 Tahun</option>
                        <option value="Tidak Garansi">Tidak Garansi</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 bg-slate-100 p-2 rounded">
                    *Info: Tanggal Pembelian, Link Garansi, dan Link Nota diambil secara otomatis dari tabel Claim Promo berdasarkan Nomor Seri barang. Sisa garansi akan dikalkulasi dari tabel tersebut.
                  </p>
                </form>
              )}
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button onClick={closeModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition">Batal</button>
              <button type="submit" form={activeTab === 'claims' ? 'claimForm' : activeTab === 'warranties' ? 'warrantyForm' : 'promoForm'} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:opacity-50">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}