'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

interface Karyawan { username: string; nama_karyawan: string; role: string; }

interface ResiRecord {
  id?: string;
  created_at?: string;
  created_by: string;
  nama_pembuat: string;
  tanggal_kirim: string;
  nama_expedisi: string;
  file_url: string;
  file_name: string;
  catatan?: string;
}

type SortKey = 'tanggal_kirim' | 'nama_expedisi' | 'nama_pembuat' | 'file_name';
type SortDir = 'asc' | 'desc';

const EXPEDISI_LIST = ['JNE', 'J&T', 'SiCepat', 'AnterAja', 'Ninja Express', 'Pos Indonesia', 'Tiki', 'Lion Parcel', 'IDExpress', 'Lainnya'];
const ADMIN_ROLES   = ['Admin', 'Super Admin', 'Finance'];

function isAdminRole(role: string) { return ADMIN_ROLES.includes(role); }

function fmtDate(d: string) {
  if (!d) return '-';
  return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
}

function emptyForm(user?: Karyawan | null): ResiRecord {
  return {
    created_by:    user?.username ?? '',
    nama_pembuat:  user?.nama_karyawan ?? '',
    tanggal_kirim: new Date().toISOString().slice(0, 10),
    nama_expedisi: '',
    file_url:      '',
    file_name:     '',
    catatan:       '',
  };
}

export default function ResiTab({ currentUser }: { currentUser: Karyawan | null }) {
  const isAdmin = isAdminRole(currentUser?.role ?? '');

  const [records,  setRecords]  = useState<ResiRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');

  // sort
  const [sortKey, setSortKey] = useState<SortKey>('tanggal_kirim');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // modal
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<ResiRecord | null>(null);
  const [form,       setForm]       = useState<ResiRecord>(emptyForm(currentUser));
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecords = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/resi');
      if (!res.ok) throw new Error(await res.text());
      setRecords(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat data');
    } finally { setLoading(false); }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-gray-700 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const filtered = records
    .filter(r => {
      const q = search.toLowerCase();
      return (
        r.nama_expedisi.toLowerCase().includes(q) ||
        r.nama_pembuat.toLowerCase().includes(q) ||
        r.file_name.toLowerCase().includes(q) ||
        (r.catatan ?? '').toLowerCase().includes(q) ||
        fmtDate(r.tanggal_kirim).toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const va = (a[sortKey] ?? '').toLowerCase();
      const vb = (b[sortKey] ?? '').toLowerCase();
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  function openCreate() {
    setEditTarget(null);
    setForm(emptyForm(currentUser));
    setShowModal(true);
  }

  function openEdit(r: ResiRecord) {
    setEditTarget(r);
    setForm({ ...r });
    setShowModal(true);
  }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('prefix', 'resi');
      fd.append('serial', 'doc');
      fd.append('subfolderName', 'File Resi');
      const res = await fetch('/api/upload-google-drive', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { url } = await res.json();
      setForm(prev => ({ ...prev, file_url: url, file_name: file.name }));
    } catch (e) {
      alert('Gagal upload: ' + (e instanceof Error ? e.message : 'Error'));
    } finally { setUploading(false); }
  }

  async function handleSave() {
    if (!form.tanggal_kirim) { alert('Tanggal kirim wajib diisi'); return; }
    if (!form.nama_expedisi.trim()) { alert('Nama ekspedisi wajib diisi'); return; }
    if (!form.file_url) { alert('File resi wajib diupload'); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        created_by:   currentUser?.username    ?? form.created_by,
        nama_pembuat: currentUser?.nama_karyawan ?? form.nama_pembuat,
      };
      const url    = editTarget ? `/api/resi/${editTarget.id}` : '/api/resi';
      const method = editTarget ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setShowModal(false);
      await fetchRecords();
    } catch (e) {
      alert('Gagal simpan: ' + (e instanceof Error ? e.message : 'Error'));
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus data resi ini?')) return;
    const res = await fetch(`/api/resi/${id}`, { method: 'DELETE' });
    if (!res.ok) { alert('Gagal hapus'); return; }
    setRecords(prev => prev.filter(r => r.id !== id));
  }

  const thClass = 'text-left px-4 py-3 font-semibold text-gray-600 text-xs cursor-pointer select-none hover:text-gray-900 whitespace-nowrap';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">📦 Upload File Resi</h2>
          <p className="text-xs text-gray-500 mt-0.5">{records.length} data tersimpan</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-[#FFE500] hover:bg-yellow-400 text-black font-bold rounded-lg text-sm transition"
        >+ Tambah Resi</button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Cari ekspedisi, nama, catatan, tanggal..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#FFE500]"
      />

      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Memuat data...</div>
      ) : error ? (
        <div className="text-center py-10 text-red-500 text-sm">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          {search ? 'Tidak ada hasil pencarian' : 'Belum ada data resi'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={thClass} onClick={() => handleSort('tanggal_kirim')}>
                  Tgl Kirim <SortIcon col="tanggal_kirim" />
                </th>
                <th className={thClass} onClick={() => handleSort('nama_expedisi')}>
                  Ekspedisi <SortIcon col="nama_expedisi" />
                </th>
                <th className={thClass} onClick={() => handleSort('file_name')}>
                  File Resi <SortIcon col="file_name" />
                </th>
                {isAdmin && (
                  <th className={thClass} onClick={() => handleSort('nama_pembuat')}>
                    Oleh <SortIcon col="nama_pembuat" />
                  </th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs">Catatan</th>
                <th className="px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{fmtDate(r.tanggal_kirim)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.nama_expedisi}</td>
                  <td className="px-4 py-3">
                    {r.file_url ? (
                      <a
                        href={r.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        📄 <span className="underline truncate max-w-[140px]">{r.file_name || 'Lihat File'}</span>
                      </a>
                    ) : <span className="text-gray-300 text-xs">-</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.nama_pembuat}</td>
                  )}
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{r.catatan || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => openEdit(r)}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded transition"
                      >✏️</button>
                      <button
                        onClick={() => handleDelete(r.id!)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded transition"
                      >🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-800">{editTarget ? 'Edit Resi' : 'Tambah Resi'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Tanggal Kirim */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Tanggal Kirim <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.tanggal_kirim}
                  onChange={e => setForm(prev => ({ ...prev, tanggal_kirim: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FFE500]"
                />
              </div>

              {/* Nama Ekspedisi */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Nama Ekspedisi <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    value={EXPEDISI_LIST.includes(form.nama_expedisi) ? form.nama_expedisi : 'Lainnya'}
                    onChange={e => {
                      if (e.target.value !== 'Lainnya') setForm(prev => ({ ...prev, nama_expedisi: e.target.value }));
                      else setForm(prev => ({ ...prev, nama_expedisi: '' }));
                    }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FFE500] bg-white"
                  >
                    {EXPEDISI_LIST.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  {(!EXPEDISI_LIST.includes(form.nama_expedisi) || form.nama_expedisi === '') && (
                    <input
                      type="text"
                      placeholder="Nama ekspedisi..."
                      value={form.nama_expedisi}
                      onChange={e => setForm(prev => ({ ...prev, nama_expedisi: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FFE500]"
                    />
                  )}
                </div>
              </div>

              {/* Upload File */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  File Resi <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }}
                />
                {form.file_url ? (
                  <div className="flex items-center gap-2 p-2.5 border border-green-200 bg-green-50 rounded-lg">
                    <span className="text-green-600 text-lg">✅</span>
                    <a
                      href={form.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-xs text-blue-700 underline truncate"
                    >{form.file_name}</a>
                    <button
                      onClick={() => setForm(prev => ({ ...prev, file_url: '', file_name: '' }))}
                      className="text-red-400 hover:text-red-600 text-xs px-1"
                    >✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full border-2 border-dashed border-gray-300 hover:border-[#FFE500] rounded-lg py-5 text-sm text-gray-500 hover:text-gray-700 transition disabled:opacity-50 flex flex-col items-center gap-1"
                  >
                    {uploading ? (
                      <><span className="text-2xl animate-spin inline-block">⟳</span><span>Mengupload ke Google Drive...</span></>
                    ) : (
                      <>
                        <span className="text-2xl">📁</span>
                        <span className="font-medium">Klik untuk upload file resi</span>
                        <span className="text-xs text-gray-400">PDF, JPG, PNG — maks 10 MB</span>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded mt-1">📂 Folder: File Resi</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Catatan (opsional)</label>
                <input
                  type="text"
                  placeholder="Nomor resi, tujuan, keterangan lain..."
                  value={form.catatan ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, catatan: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FFE500]"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
              >Batal</button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="px-5 py-2 bg-[#FFE500] hover:bg-yellow-400 text-black font-bold rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : (editTarget ? 'Simpan Perubahan' : 'Tambah')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
