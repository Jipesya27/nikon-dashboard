'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Types
interface RiwayatPesan {
  id_pesan: string;
  sesi_pesan: string;
  nomor_wa: string;
  nama_profil_wa: string;
  arah_pesan: 'IN' | 'OUT';
  isi_pesan: string;
  waktu_pesan: string;
  bicara_dengan_cs: boolean;
  created_at: string;
}

interface ClaimPromo {
  id_claim: string;
  nomor_wa: string;
  nomor_seri: string;
  tipe_barang: string;
  tanggal_pembelian: string;
  validasi_by_mkt: string;
  validasi_by_fa: string;
  nama_jasa_pengiriman?: string;
  nomor_resi?: string;
  created_at: string;
}

interface Garansi {
  id_garansi: string;
  nomor_seri: string;
  tipe_barang: string;
  status_validasi: string;
  jenis_garansi: string;
  lama_garansi: string;
  sisa_garansi_hari: number;
  created_at: string;
}

interface KPICard {
  label: string;
  value: string | number;
  trend?: number;
  icon?: string;
}

// Dashboard Component
export default function NikonDashboard() {
  const [messages, setMessages] = useState<RiwayatPesan[]>([]);
  const [claims, setClaims] = useState<ClaimPromo[]>([]);
  const [warranties, setWarranties] = useState<Garansi[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('messages');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Fetch Messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('riwayat_pesan')
          .select('*')
          .gte('created_at', `${dateRange.start}T00:00:00`)
          .lte('created_at', `${dateRange.end}T23:59:59`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMessages(data || []);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Real-time subscription
    const subscription = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'riwayat_pesan' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setMessages(prev => [payload.new as RiwayatPesan, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dateRange]);

  // Fetch Claims
  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const { data, error } = await supabase
          .from('claim_promo')
          .select('*')
          .gte('created_at', `${dateRange.start}T00:00:00`)
          .lte('created_at', `${dateRange.end}T23:59:59`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setClaims(data || []);
      } catch (error) {
        console.error('Error fetching claims:', error);
      }
    };

    fetchClaims();
  }, [dateRange]);

  // Fetch Warranties
  useEffect(() => {
    const fetchWarranties = async () => {
      try {
        const { data, error } = await supabase
          .from('garansi')
          .select('*')
          .gte('created_at', `${dateRange.start}T00:00:00`)
          .lte('created_at', `${dateRange.end}T23:59:59`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setWarranties(data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching warranties:', error);
        setLoading(false);
      }
    };

    fetchWarranties();
  }, [dateRange]);

  // Calculate KPIs
  const messageKPIs: KPICard[] = [
    {
      label: 'Total Pesan',
      value: messages.length,
      icon: '📨'
    },
    {
      label: 'Sesi Aktif',
      value: new Set(messages.map(m => m.sesi_pesan)).size,
      icon: '👥'
    },
    {
      label: 'CS Escalations',
      value: messages.filter(m => m.bicara_dengan_cs).length,
      icon: '🎧'
    },
    {
      label: 'Pesan Keluar',
      value: messages.filter(m => m.arah_pesan === 'OUT').length,
      icon: '📤'
    }
  ];

  const claimKPIs: KPICard[] = [
    {
      label: 'Total Claim',
      value: claims.length,
      icon: '🎁'
    },
    {
      label: 'Valid',
      value: claims.filter(c => c.validasi_by_mkt === 'Valid' && c.validasi_by_fa === 'Valid').length,
      icon: '✅'
    },
    {
      label: 'Dalam Proses',
      value: claims.filter(c => c.validasi_by_mkt === 'Dalam Proses Verifikasi' || c.validasi_by_fa === 'Dalam Proses Verifikasi').length,
      icon: '⏳'
    },
    {
      label: 'Sudah Dikirim',
      value: claims.filter(c => c.nomor_resi).length,
      icon: '🚚'
    }
  ];

  const warrantyKPIs: KPICard[] = [
    {
      label: 'Total Garansi',
      value: warranties.length,
      icon: '📋'
    },
    {
      label: 'Valid',
      value: warranties.filter(w => w.status_validasi === 'Valid').length,
      icon: '✅'
    },
    {
      label: 'Expiring Soon',
      value: warranties.filter(w => w.sisa_garansi_hari > 0 && w.sisa_garansi_hari < 30).length,
      icon: '⚠️'
    },
    {
      label: 'Avg Days Left',
      value: warranties.length > 0
        ? Math.round(warranties.reduce((sum, w) => sum + w.sisa_garansi_hari, 0) / warranties.length)
        : 0,
      icon: '📅'
    }
  ];

  // Prepare chart data
  const messagesByDate = Array.from(
    messages.reduce((acc, msg) => {
      if (!msg.created_at) return acc;
      const date = new Date(msg.created_at).toISOString().split('T')[0];
      const entry = acc.get(date) || { date, IN: 0, OUT: 0 };
      
      if (msg.arah_pesan === 'IN') entry.IN++;
      else entry.OUT++;
      
      acc.set(date, entry);
      return acc;
    }, new Map<string, { date: string; IN: number; OUT: number }>()).values() // Tambahkan .values() di sini
  ).sort((a, b) => a.date.localeCompare(b.date));


  const claimsByStatus = [
    { name: 'Valid', value: claims.filter(c => c.validasi_by_mkt === 'Valid' && c.validasi_by_fa === 'Valid').length },
    { name: 'Dalam Proses', value: claims.filter(c => c.validasi_by_mkt === 'Dalam Proses Verifikasi' || c.validasi_by_fa === 'Dalam Proses Verifikasi').length }
  ];

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-slate-900">📊 Nikon Bot Dashboard</h1>
          <p className="text-slate-600 mt-1">Real-time monitoring untuk WhatsApp Bot Nikon Indonesia</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            {[
              { id: 'messages', label: '📨 Pesan', count: messages.length },
              { id: 'claims', label: '🎁 Claim Promo', count: claims.length },
              { id: 'warranties', label: '📋 Garansi', count: warranties.length }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-4 font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs bg-slate-100 px-2 py-1 rounded-full">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
          <label className="text-sm font-medium text-slate-700 mr-4">
            Dari: 
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="ml-2 px-3 py-1 border border-slate-300 rounded-md text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700 mr-4">
            Sampai:
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="ml-2 px-3 py-1 border border-slate-300 rounded-md text-sm"
            />
          </label>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* MESSAGES TAB */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {messageKPIs.map((kpi, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
                  <div className="text-2xl mb-2">{kpi.icon}</div>
                  <p className="text-slate-600 text-sm">{kpi.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Pesan per Hari</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={messagesByDate}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="IN" stroke="#3b82f6" strokeWidth={2} name="Masuk" />
                    <Line type="monotone" dataKey="OUT" stroke="#10b981" strokeWidth={2} name="Keluar" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Arah Pesan</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Masuk (IN)', value: messages.filter(m => m.arah_pesan === 'IN').length },
                        { name: 'Keluar (OUT)', value: messages.filter(m => m.arah_pesan === 'OUT').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Messages Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Riwayat Pesan</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Waktu</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Profil WA</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Pesan</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Arah</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">CS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {messages.slice(0, 10).map(msg => (
                      <tr key={msg.id_pesan} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-3 text-xs text-slate-600">
                          {new Date(msg.waktu_pesan).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-900">{msg.nama_profil_wa}</td>
                        <td className="px-6 py-3 text-slate-700 truncate max-w-xs">{msg.isi_pesan}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            msg.arah_pesan === 'IN'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {msg.arah_pesan}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {msg.bicara_dengan_cs ? (
                            <span className="text-red-600 font-semibold">🎧</span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
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
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {claimKPIs.map((kpi, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
                  <div className="text-2xl mb-2">{kpi.icon}</div>
                  <p className="text-slate-600 text-sm">{kpi.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Status Claim</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={claimsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {COLORS.map((color, index) => (
                      <Cell key={`cell-${index}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Claims Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Daftar Claim</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">No Seri</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Barang</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Status MKT</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Status FA</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Resi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {claims.slice(0, 10).map(claim => (
                      <tr key={claim.id_claim} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-3 font-mono text-slate-900">{claim.nomor_seri}</td>
                        <td className="px-6 py-3 text-slate-700">{claim.tipe_barang}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                            claim.validasi_by_mkt === 'Valid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {claim.validasi_by_mkt}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                            claim.validasi_by_fa === 'Valid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {claim.validasi_by_fa}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-700">{claim.nomor_resi || '-'}</td>
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
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {warrantyKPIs.map((kpi, idx) => (
                <div key={idx} className="bg-white rounded-lg p-6 shadow-sm border border-slate-200 hover:shadow-md transition">
                  <div className="text-2xl mb-2">{kpi.icon}</div>
                  <p className="text-slate-600 text-sm">{kpi.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{kpi.value}</p>
                </div>
              ))}
            </div>

            {/* Warranties Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Daftar Garansi</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">No Seri</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Barang</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Jenis</th>
                      <th className="px-6 py-3 text-left font-semibold text-slate-900">Sisa Hari</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {warranties.slice(0, 10).map(warranty => (
                      <tr key={warranty.id_garansi} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-3 font-mono text-slate-900">{warranty.nomor_seri}</td>
                        <td className="px-6 py-3 text-slate-700">{warranty.tipe_barang}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                            warranty.status_validasi === 'Valid'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {warranty.status_validasi}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-slate-700">{warranty.jenis_garansi}</td>
                        <td className="px-6 py-3">
                          <span className={`font-semibold ${
                            warranty.sisa_garansi_hari < 30 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {warranty.sisa_garansi_hari} hari
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
