'use client';

import React from 'react';
import { PengaturanBot, Karyawan } from '@/app/index';
import { DEFAULT_TEMPLATES, DB_KEY_PREFIX, TEMPLATE_CATEGORIES } from '@/app/lib/chatbotTemplate';

export interface BotSettingsTabProps {
  botSettings: PengaturanBot[];
  currentUser: Karyawan | null;
  qrShortcut: string;
  setQrShortcut: (v: string) => void;
  qrText: string;
  setQrText: (v: string) => void;
  fetchBotSettings: () => Promise<void>;
  notifChannel: 'wa_only' | 'email_only' | 'wa_and_email';
  saveNotifChannel: (v: 'wa_only' | 'email_only' | 'wa_and_email') => Promise<void>;
  notifChannelSaving: boolean;
  notifChannelMsg: { ok: boolean; text: string } | null;
  telegramChatId: string;
  telegramChatIdInput: string;
  setTelegramChatIdInput: (v: string) => void;
  telegramSaving: boolean;
  telegramMsg: { ok: boolean; text: string } | null;
  saveTelegramChatId: () => Promise<void>;
  chatbotTemplates: Record<string, string>;
  setChatbotTemplates: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  chatbotEditValues: Record<string, string>;
  setChatbotEditValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  chatbotSaving: Record<string, boolean>;
  setChatbotSaving: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  saveChatbotTemplate: (key: string) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  openModal: (mode: string, type: string, data?: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleDelete: (type: string, id: string) => any;
  sbWrite: (opts: { action: 'insert' | 'update' | 'delete' | 'upsert'; table: string; data?: unknown; match?: Record<string, unknown>; onConflict?: string }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
  sbRead: <T = unknown>(opts: { table: string; select?: string; filters?: { col: string; op: string; val: unknown }[]; limit?: number }) => Promise<{ data: T[] | null; count: number | null; error: { message: string } | null }>;
}

export default function BotSettingsTab({
  botSettings, currentUser,
  qrShortcut, setQrShortcut, qrText, setQrText, fetchBotSettings,
  notifChannel, saveNotifChannel, notifChannelSaving, notifChannelMsg,
  telegramChatId, telegramChatIdInput, setTelegramChatIdInput,
  telegramSaving, telegramMsg, saveTelegramChatId,
  chatbotTemplates, setChatbotTemplates,
  chatbotEditValues, setChatbotEditValues,
  chatbotSaving, setChatbotSaving,
  saveChatbotTemplate,
  openModal, handleDelete,
  sbWrite, sbRead,
}: BotSettingsTabProps) {
  const qrItems = botSettings.filter(b => b.nama_pengaturan?.startsWith('quick_reply:'));

  const handleAddQr = async () => {
    if (!qrShortcut.trim() || !qrText.trim()) return;
    const key = `quick_reply:${qrShortcut.trim().toLowerCase().replace(/\s+/g, '_')}`;
    const existing = botSettings.find(b => b.nama_pengaturan === key);
    let err;
    if (existing?.id) {
      ({ error: err } = await sbWrite({ action: 'update', table: 'pengaturan_bot', match: { id: existing.id }, data: { description: qrText.trim(), url_file: '' } }));
    } else {
      ({ error: err } = await sbWrite({ action: 'insert', table: 'pengaturan_bot', data: { nama_pengaturan: key, description: qrText.trim(), url_file: '' } }));
    }
    if (err) { alert('Gagal simpan: ' + err.message); return; }
    setQrShortcut(''); setQrText('');
    fetchBotSettings();
  };

  return (
    <div className="space-y-6 animate-fade-in text-gray-900">

      {/* ── SEKSI QUICK REPLY ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <h2 className="text-base font-bold text-gray-900">Quick Reply CS</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pesan siap pakai — ketik <code className="bg-gray-100 px-1 rounded">/shortcut</code> di chat untuk menggunakannya.</p>
          </div>
        </div>
        <div className="flex gap-2 items-start">
          <div className="w-32 shrink-0">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Shortcut</label>
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden mt-1">
              <span className="px-2 text-gray-400 font-mono text-sm">/</span>
              <input type="text" value={qrShortcut} onChange={e => setQrShortcut(e.target.value)} placeholder="halo" className="flex-1 py-1.5 pr-2 text-sm outline-none min-w-0" />
            </div>
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase">Teks Balasan</label>
            <textarea value={qrText} onChange={e => setQrText(e.target.value)} rows={2} placeholder="Halo! Ada yang bisa kami bantu?" className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-[#FFE500] resize-none" />
          </div>
          <button onClick={handleAddQr} disabled={!qrShortcut.trim() || !qrText.trim()} className="mt-5 bg-[#FFE500] text-black px-3 py-2 rounded-lg text-sm font-bold hover:bg-[#E5CE00] disabled:opacity-40 transition shrink-0">+ Tambah</button>
        </div>
        <div className="space-y-2">
          {qrItems.length === 0 && <p className="text-xs text-gray-400 italic">Belum ada quick reply kustom. Default quick reply tetap tersedia.</p>}
          {qrItems.map(b => (
            <div key={b.id} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded font-mono shrink-0">/{b.nama_pengaturan!.replace('quick_reply:', '')}</span>
              <p className="text-xs text-gray-700 flex-1 whitespace-pre-line">{b.description}</p>
              <button onClick={async () => { await sbWrite({ action: 'delete', table: 'pengaturan_bot', match: { id: b.id } }); fetchBotSettings(); }} className="text-red-400 hover:text-red-600 text-xs shrink-0">Hapus</button>
            </div>
          ))}
        </div>
      </div>

      {/* ── SEKSI 0: Saluran Notifikasi ── */}
      <div className="bg-white rounded-xl border-2 border-yellow-300 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">📣</span>
          <div>
            <h2 className="text-base font-bold text-gray-900">Saluran Notifikasi Konsumen</h2>
            <p className="text-xs text-gray-500 mt-0.5">Pilih lewat mana sistem mengirim notifikasi ke konsumen (claim, garansi, event). Notifikasi admin dikirim via Telegram — lihat seksi di bawah.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { value: 'wa_only' as const, icon: '💬', label: 'WhatsApp Saja', desc: 'Kirim via WhatsApp (Meta Cloud API).', color: 'green' },
            { value: 'email_only' as const, icon: '📧', label: 'Email Saja', desc: 'Kirim via SMTP. Butuh konfigurasi SMTP_HOST, SMTP_USER, SMTP_PASS.', color: 'blue' },
            { value: 'wa_and_email' as const, icon: '💬📧', label: 'WhatsApp & Email', desc: 'Kirim ke dua saluran sekaligus. Membutuhkan WA aktif + SMTP.', color: 'purple' },
          ] as { value: 'wa_only' | 'email_only' | 'wa_and_email'; icon: string; label: string; desc: string; color: string }[]).map(opt => {
            const isActive = notifChannel === opt.value;
            const borderCls = isActive
              ? opt.color === 'green'  ? 'border-green-500 bg-green-50'
              : opt.color === 'blue'   ? 'border-blue-500 bg-blue-50'
              :                          'border-purple-500 bg-purple-50'
              : 'border-gray-200 bg-white hover:border-gray-400';
            const ringCls = isActive
              ? opt.color === 'green'  ? 'bg-green-500'
              : opt.color === 'blue'   ? 'bg-blue-500'
              :                          'bg-purple-500'
              : 'bg-gray-300';
            return (
              <button key={opt.value} type="button" onClick={() => saveNotifChannel(opt.value)} disabled={notifChannelSaving}
                className={`w-full text-left rounded-lg border-2 p-4 transition-all duration-150 cursor-pointer disabled:opacity-60 ${borderCls}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-3.5 h-3.5 rounded-full flex-shrink-0 ${ringCls}`} />
                  <span className="font-bold text-sm text-gray-900">{opt.icon} {opt.label}</span>
                </div>
                <p className="text-xs text-gray-500 leading-snug">{opt.desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {notifChannelSaving && <span className="text-xs text-gray-500 animate-pulse">Menyimpan...</span>}
          {notifChannelMsg && (
            <span className={`text-xs font-semibold ${notifChannelMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{notifChannelMsg.text}</span>
          )}
          <div className="ml-auto text-xs text-gray-400">
            Aktif sekarang: <span className="font-bold text-gray-700">
              {notifChannel === 'wa_only' ? '💬 WhatsApp Saja' : notifChannel === 'email_only' ? '📧 Email Saja' : '💬📧 WhatsApp & Email'}
            </span>
          </div>
        </div>

        {(notifChannel === 'email_only' || notifChannel === 'wa_and_email') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700 space-y-1">
            <p className="font-bold text-blue-800">⚙️ Konfigurasi Email diperlukan di file <code>.env.local</code>:</p>
            <pre className="bg-white rounded p-2 text-[11px] overflow-x-auto border border-blue-100 text-gray-800">{`SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=akunemail@gmail.com
SMTP_PASS=app_password_16_karakter
SMTP_FROM_NAME=Nikon Service Center
SMTP_FROM=akunemail@gmail.com
ADMIN_EMAIL=email_admin@gmail.com`}</pre>
            <p className="text-gray-500">Untuk Gmail: aktifkan 2FA lalu buat <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 underline">App Password</a>. Untuk provider lain, sesuaikan SMTP_HOST &amp; SMTP_PORT.</p>
          </div>
        )}
      </div>

      {/* ── SEKSI 0b: Notifikasi Admin via Telegram ── */}
      <div className="bg-white rounded-xl border-2 border-blue-300 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">✈️</span>
          <div>
            <h2 className="text-base font-bold text-gray-900">Notifikasi Admin via Telegram</h2>
            <p className="text-xs text-gray-500 mt-0.5">Setiap ada claim, garansi, atau pendaftaran event baru, sistem akan mengirim notifikasi ke Telegram admin.</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700 space-y-1">
          <p className="font-bold text-blue-800">⚙️ Cara Setup:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            <li>Buat bot di Telegram via <span className="font-mono">@BotFather</span> → dapatkan <span className="font-mono">BOT_TOKEN</span></li>
            <li>Chat bot Anda, lalu buka <span className="font-mono">https://api.telegram.org/bot&#123;TOKEN&#125;/getUpdates</span> untuk dapatkan <span className="font-mono">chat_id</span></li>
            <li>Atau, tambahkan bot ke grup dan gunakan <span className="font-mono">chat_id</span> grup (biasanya negatif, contoh: <span className="font-mono">-1001234567890</span>)</li>
            <li>Isi <span className="font-mono">TELEGRAM_BOT_TOKEN</span> di <span className="font-mono">.env.local</span>, lalu simpan Chat ID di bawah</li>
          </ol>
          <pre className="bg-white rounded p-2 text-[11px] overflow-x-auto border border-blue-100 text-gray-800 mt-2">{`TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmnoPQRstuVWXyz`}</pre>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Telegram Admin Chat ID</label>
            <input type="text" value={telegramChatIdInput} onChange={e => setTelegramChatIdInput(e.target.value)}
              placeholder="Contoh: 123456789 atau -1001234567890"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <p className="text-[11px] text-gray-400 mt-1">ID chat pribadi (angka positif) atau grup (angka negatif).</p>
          </div>
          <button type="button" onClick={saveTelegramChatId}
            disabled={telegramSaving || telegramChatIdInput.trim() === telegramChatId}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors">
            {telegramSaving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {telegramMsg && (
            <span className={`text-xs font-semibold ${telegramMsg.ok ? 'text-green-600' : 'text-red-600'}`}>{telegramMsg.text}</span>
          )}
          {telegramChatId && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">Chat ID aktif: <span className="font-bold text-gray-700 font-mono">{telegramChatId}</span></span>
              <a href="/api/test-notif?telegram=1" target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800">Test kirim</a>
            </div>
          )}
        </div>
      </div>

      {/* ── SEKSI 1: Bot Settings (URL/value) ── */}
      <div className="space-y-2">
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
              {botSettings.filter((s: PengaturanBot) => {
                const n = s.nama_pengaturan || '';
                if (n.startsWith(DB_KEY_PREFIX)) return false;
                if (n === 'bot_last_error' || n === 'bot_last_success') return false;
                return true;
              }).map((setting: PengaturanBot) => (
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

      {/* ── SEKSI 2: Editor Teks Chatbot — ADMIN & SUPER ADMIN ── */}
      {(currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin') && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900">💬 Editor Teks Chatbot</h2>
            <span className="text-[10px] font-extrabold bg-black text-[#FFE500] px-2 py-0.5 rounded tracking-wider">ADMIN</span>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <p className="text-xs text-gray-700">Edit teks pesan WhatsApp yang dikirim chatbot. Teks disimpan ke database dan menggantikan teks default. Gunakan <code className="bg-white px-1 rounded">{'{nama}'}</code> untuk variabel. Baris kosong dapat menggunakan <code className="bg-white px-1 rounded">\n</code>.</p>
          </div>
          {TEMPLATE_CATEGORIES.map(cat => {
            const keys = Object.keys(DEFAULT_TEMPLATES).filter(k => DEFAULT_TEMPLATES[k].category === cat);
            if (keys.length === 0) return null;
            return (
              <div key={cat} className="space-y-3">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 pb-1">{cat}</h3>
                {keys.map(key => {
                  const info = DEFAULT_TEMPLATES[key];
                  const currentVal = chatbotEditValues[key] ?? (chatbotTemplates[key] ?? info.template);
                  const isSaved = chatbotTemplates[key] !== undefined;
                  const isSaving = chatbotSaving[key] ?? false;
                  return (
                    <div key={key} className="bg-white rounded-lg border border-gray-200 p-4 space-y-2 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{info.label}</p>
                          <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                            Variabel: {info.vars.length > 0 ? info.vars.map(v => `{${v}}`).join(', ') : 'tidak ada'}
                          </p>
                        </div>
                        {isSaved && (
                          <span className="text-[10px] font-extrabold bg-green-100 text-green-700 px-2 py-0.5 rounded whitespace-nowrap">● Custom</span>
                        )}
                      </div>
                      <textarea
                        rows={Math.max(3, (currentVal.match(/\n/g) || []).length + 2)}
                        className="w-full text-xs font-mono border border-gray-300 rounded p-2 focus:outline-none focus:border-[#FFE500] resize-y bg-gray-50"
                        value={currentVal}
                        onChange={e => setChatbotEditValues(prev => ({ ...prev, [key]: e.target.value }))}
                      />
                      <div className="flex items-center gap-3 justify-end">
                        {chatbotEditValues[key] !== undefined && chatbotEditValues[key] !== (chatbotTemplates[key] ?? info.template) && (
                          <button type="button"
                            onClick={() => setChatbotEditValues(prev => { const n = { ...prev }; delete n[key]; return n; })}
                            className="text-xs text-gray-500 hover:underline">Reset ke tersimpan</button>
                        )}
                        {isSaved && (
                          <button type="button"
                            onClick={async () => {
                              if (!confirm('Hapus custom teks dan kembali ke default?')) return;
                              setChatbotSaving(prev => ({ ...prev, [key]: true }));
                              try {
                                const dbKey = `${DB_KEY_PREFIX}${key}`;
                                const { data: ex } = await sbRead<{ id: string }>({ table: 'pengaturan_bot', select: 'id', filters: [{ col: 'nama_pengaturan', op: 'eq', val: dbKey }], limit: 1 });
                                const found = ex?.[0];
                                if (found?.id) await sbWrite({ action: 'delete', table: 'pengaturan_bot', match: { id: found.id } });
                                setChatbotTemplates(prev => { const n = { ...prev }; delete n[key]; return n; });
                                setChatbotEditValues(prev => { const n = { ...prev }; delete n[key]; return n; });
                              } finally {
                                setChatbotSaving(prev => ({ ...prev, [key]: false }));
                              }
                            }}
                            className="text-xs text-red-500 hover:underline">Hapus custom</button>
                        )}
                        <button type="button" disabled={isSaving} onClick={() => saveChatbotTemplate(key)}
                          className="bg-[#FFE500] hover:bg-[#E5CE00] disabled:opacity-50 text-black text-xs font-bold px-3 py-1.5 rounded transition">
                          {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
