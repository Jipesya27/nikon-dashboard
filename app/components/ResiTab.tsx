'use client';
import { useState, useCallback, useEffect, useRef } from 'react';

interface Karyawan { username: string; nama_karyawan: string; role: string; }

interface JneRow {
  no: number; cnote_no: string; date: string; time: string;
  service: string; destination: string; amount: number; receiver_name: string; goods: string;
}

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
  // Kolom JNE
  cnote_no?: string;
  service?: string;
  tujuan?: string;
  penerima?: string;
  barang?: string;
  ongkir?: number;
  jam_kirim?: string;
}

type SortKey = 'tanggal_kirim' | 'nama_expedisi' | 'nama_pembuat' | 'file_name' | 'cnote_no' | 'penerima' | 'tujuan' | 'ongkir';
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

  // PDF JNE import
  const [jneRows,      setJneRows]      = useState<JneRow[]>([]);
  const [showJneModal, setShowJneModal] = useState(false);
  const [parsingPdf,   setParsingPdf]   = useState(false);
  const [jneFileName,  setJneFileName]  = useState('');
  const [jneFile,      setJneFile]      = useState<File | null>(null);
  const [savingJne,    setSavingJne]    = useState(false);

  const fileInputRef  = useRef<HTMLInputElement>(null);
  const jnePdfRef     = useRef<HTMLInputElement>(null);

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

  async function saveJneToDb() {
    setSavingJne(true);
    try {
      const createdBy   = currentUser?.username     ?? '';
      const namaPembuat = currentUser?.nama_karyawan ?? '';

      // Upload PDF ke Google Drive terlebih dahulu
      let pdfUrl = '';
      let pdfName = jneFileName;
      if (jneFile) {
        const fd = new FormData();
        fd.append('file', jneFile);
        fd.append('prefix', 'jne');
        fd.append('serial', Date.now().toString());
        fd.append('subfolderName', 'File Resi');
        const upRes = await fetch('/api/upload-google-drive', { method: 'POST', body: fd });
        if (upRes.ok) {
          const upData = await upRes.json();
          pdfUrl  = upData.url  ?? '';
          pdfName = jneFileName;
        }
      }

      let saved = 0;
      for (const r of jneRows) {
        const payload = {
          created_by:    createdBy,
          nama_pembuat:  namaPembuat,
          tanggal_kirim: r.date,
          jam_kirim:     r.time,
          nama_expedisi: 'JNE',
          cnote_no:      r.cnote_no,
          service:       r.service,
          tujuan:        r.destination,
          penerima:      r.receiver_name,
          barang:        r.goods,
          ongkir:        r.amount,
          file_url:      pdfUrl,
          file_name:     pdfName,
          catatan:       '',
        };
        const res = await fetch('/api/resi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (res.ok) saved++;
      }
      alert(`${saved} dari ${jneRows.length} resi berhasil disimpan.`);
      setShowJneModal(false);
      fetchRecords();
    } catch (e) {
      alert('Gagal simpan: ' + (e instanceof Error ? e.message : 'Error'));
    } finally { setSavingJne(false); }
  }

  async function parsePdfJne(file: File) {
    setParsingPdf(true); setJneFileName(file.name); setJneFile(file);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/resi/parse-jne', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const { rows } = await res.json();
      if (!rows?.length) { alert('Tidak ada data resi ditemukan di PDF ini.'); return; }
      setJneRows(rows);
      setShowJneModal(true);
    } catch (e) {
      alert('Gagal parse PDF: ' + (e instanceof Error ? e.message : 'Error'));
    } finally { setParsingPdf(false); }
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
        <div className="flex gap-2">
          <input ref={jnePdfRef} type="file" accept=".pdf" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) parsePdfJne(f); e.target.value = ''; }} />
          <button
            onClick={() => jnePdfRef.current?.click()}
            disabled={parsingPdf}
            className="px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 font-medium rounded-lg text-sm transition disabled:opacity-50 flex items-center gap-1.5"
          >{parsingPdf ? '⟳ Parsing...' : '📑 Import PDF JNE'}</button>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-[#FFE500] hover:bg-yellow-400 text-black font-bold rounded-lg text-sm transition"
          >+ Tambah Resi</button>
        </div>
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
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className={thClass} onClick={() => handleSort('cnote_no')}>Cnote No <SortIcon col="cnote_no" /></th>
                <th className={thClass} onClick={() => handleSort('tanggal_kirim')}>Tanggal <SortIcon col="tanggal_kirim" /></th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Jam</th>
                <th className={thClass} onClick={() => handleSort('nama_expedisi')}>Ekspedisi <SortIcon col="nama_expedisi" /></th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Service</th>
                <th className={thClass} onClick={() => handleSort('tujuan')}>Tujuan <SortIcon col="tujuan" /></th>
                <th className={thClass} onClick={() => handleSort('penerima')}>Penerima <SortIcon col="penerima" /></th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">Barang</th>
                <th className={thClass} onClick={() => handleSort('ongkir')}>Ongkir <SortIcon col="ongkir" /></th>
                <th className="text-left px-3 py-3 font-semibold text-gray-600">File</th>
                {isAdmin && <th className="text-left px-3 py-3 font-semibold text-gray-600">Oleh</th>}
                <th className="px-3 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-3 py-2.5 font-mono text-gray-700">{r.cnote_no || '-'}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{fmtDate(r.tanggal_kirim)}</td>
                  <td className="px-3 py-2.5 text-gray-500">{r.jam_kirim || '-'}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{r.nama_expedisi}</td>
                  <td className="px-3 py-2.5 text-gray-600">{r.service || '-'}</td>
                  <td className="px-3 py-2.5 max-w-[120px] truncate text-gray-600" title={r.tujuan}>{r.tujuan || '-'}</td>
                  <td className="px-3 py-2.5 max-w-[130px] truncate font-medium text-gray-800" title={r.penerima}>{r.penerima || '-'}</td>
                  <td className="px-3 py-2.5 max-w-[140px] truncate text-gray-600" title={r.barang}>{r.barang || '-'}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap font-medium text-gray-800">
                    {r.ongkir ? `Rp ${r.ongkir.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="px-3 py-2.5">
                    {r.file_url ? (
                      <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline">📄</a>
                    ) : <span className="text-gray-300">-</span>}
                  </td>
                  {isAdmin && <td className="px-3 py-2.5 text-gray-400">{r.nama_pembuat}</td>}
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(r)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded">✏️</button>
                      <button onClick={() => handleDelete(r.id!)} className="text-red-400 hover:text-red-600 px-2 py-1 rounded">🗑</button>
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

      {/* ── Modal Preview Import PDF JNE ── */}
      {showJneModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-6 pb-6 overflow-y-auto px-3">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <h3 className="font-bold text-gray-800">📑 Import PDF JNE — Preview</h3>
                <p className="text-xs text-gray-500 mt-0.5">{jneFileName} · {jneRows.length} resi ditemukan</p>
              </div>
              <button onClick={() => setShowJneModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
            </div>

            <div className="px-5 py-4 overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">No</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Cnote No</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Tanggal</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Jam</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Service</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Tujuan</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Penerima</th>
                    <th className="text-left px-3 py-2 font-semibold text-gray-600">Barang</th>
                    <th className="text-right px-3 py-2 font-semibold text-gray-600">Ongkir</th>
                  </tr>
                </thead>
                <tbody>
                  {jneRows.map(r => (
                    <tr key={r.no} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-500">{r.no}</td>
                      <td className="px-3 py-2 font-mono text-gray-800">{r.cnote_no}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.date}</td>
                      <td className="px-3 py-2 text-gray-500">{r.time}</td>
                      <td className="px-3 py-2">{r.service}</td>
                      <td className="px-3 py-2 max-w-[120px] truncate" title={r.destination}>{r.destination}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate font-medium" title={r.receiver_name}>{r.receiver_name}</td>
                      <td className="px-3 py-2 max-w-[150px] truncate text-gray-600" title={r.goods}>{r.goods}</td>
                      <td className="px-3 py-2 text-right font-medium">Rp {r.amount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-bold">
                    <td colSpan={8} className="px-3 py-2 text-right text-gray-700">Grand Total</td>
                    <td className="px-3 py-2 text-right text-green-700">
                      Rp {jneRows.reduce((s, r) => s + r.amount, 0).toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="px-5 py-4 border-t flex gap-2 justify-end">
              <button onClick={() => setShowJneModal(false)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Tutup</button>
              <button
                onClick={saveJneToDb}
                disabled={savingJne}
                className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-sm disabled:opacity-50"
              >
                {savingJne ? 'Menyimpan...' : `💾 Simpan ke DB (${jneRows.length} resi)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
