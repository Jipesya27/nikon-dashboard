"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hfqnlttxxrqarmpvtnhu.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface ChatbotResponse {
  id: number;
  key: string;
  message: string;
  description: string;
  updated_at: string;
}

export default function ChatbotManagerPage() {
  const [responses, setResponses] = useState<ChatbotResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchResponses();
  }, []);

  const fetchResponses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chatbot_responses')
      .select('*')
      .order('key', { ascending: true });
    
    if (error) {
      showToast("Gagal mengambil data: " + error.message, 'error');
    } else {
      setResponses(data || []);
    }
    setLoading(false);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleEdit = (res: ChatbotResponse) => {
    setEditingId(res.id);
    setEditValue(res.message);
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    const { error } = await supabase
      .from('chatbot_responses')
      .update({ message: editValue })
      .eq('id', id);

    if (error) {
      showToast("Gagal menyimpan: " + error.message, 'error');
    } else {
      showToast("Pesan berhasil diperbarui!", 'success');
      setEditingId(null);
      fetchResponses();
    }
    setSaving(false);
  };

  const filteredResponses = responses.filter(r => 
    r.key.toLowerCase().includes(search.toLowerCase()) || 
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-blue-600 text-white p-2 rounded-lg">🤖</span>
              Chatbot Manager
            </h1>
            <p className="text-slate-500 mt-1">
              Kelola teks otomatis untuk Chatbot WhatsApp Nikon Indonesia.
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <input 
                type="text" 
                placeholder="Cari kunci atau deskripsi..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span className="absolute left-3 top-2.5 text-slate-400">🔍</span>
            </div>
            <a href="/" className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition shadow-sm text-sm whitespace-nowrap">
              Kembali
            </a>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-8 flex gap-4 items-start">
          <div className="text-blue-500 text-xl">💡</div>
          <div className="text-sm text-blue-800 leading-relaxed">
            <strong>Tips:</strong> Gunakan variabel seperti <code className="bg-blue-100 px-1 rounded font-bold">{"{{nama}}"}</code> atau <code className="bg-blue-100 px-1 rounded font-bold">{"{{id_sapaan}}"}</code> untuk membuat pesan dinamis. Perubahan yang Anda simpan di sini akan langsung aktif di Chatbot WhatsApp tanpa perlu restart sistem.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredResponses.length > 0 ? (
              filteredResponses.map((res) => (
                <div key={res.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">{res.key}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{res.description}</p>
                    </div>
                    <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-full font-mono">
                      Last Update: {new Date(res.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="p-5 flex-1">
                    {editingId === res.id ? (
                      <textarea
                        className="w-full h-48 p-4 bg-slate-900 text-green-400 font-mono text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition shadow-inner resize-none"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      />
                    ) : (
                      <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-sm h-48 overflow-y-auto whitespace-pre-wrap shadow-inner border border-slate-800">
                        {res.message}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    {editingId === res.id ? (
                      <>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold text-sm transition"
                        >
                          Batal
                        </button>
                        <button 
                          onClick={() => handleSave(res.id)}
                          disabled={saving}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 transition flex items-center gap-2 disabled:opacity-50"
                        >
                          {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => handleEdit(res)}
                        className="px-6 py-2 bg-white hover:bg-slate-100 text-blue-600 font-bold rounded-xl border border-blue-200 transition flex items-center gap-2"
                      >
                        ✏️ Edit Pesan
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-slate-400">Tidak ada hasil yang cocok dengan pencarian Anda.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl z-[1000] flex items-center gap-3 transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
        }`}>
          <span>{toast.type === 'success' ? '✅' : '❌'}</span>
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
