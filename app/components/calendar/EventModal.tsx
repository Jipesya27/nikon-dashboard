'use client';

import React, { useEffect, useState } from 'react';
import { CalendarEvent, CalendarPerson, CalendarVisibility, EventCategory, CATEGORY_LIST, CATEGORY_CONF } from './types';
import { addHoursToTime } from './utils';
import { buildIcsForEvent, downloadIcs } from '@/app/lib/ics';

export interface EventFormPayload {
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  all_day: boolean;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  visibility: CalendarVisibility;
  participants: string[];
  repeat: 'none' | 'weekly' | 'monthly';
  repeat_count: number;
}

interface EventModalProps {
  mode: 'create' | 'edit';
  initialEvent?: CalendarEvent | null;
  prefillDate?: string;
  people: CalendarPerson[];
  saving: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (payload: EventFormPayload) => void;
  onDelete?: (scope: 'single' | 'series') => void;
}

function emptyForm(prefillDate?: string): EventFormPayload {
  const d = prefillDate || new Date().toISOString().slice(0, 10);
  return {
    title: '', description: '', location: '', category: 'meeting',
    all_day: false, start_date: d, end_date: d, start_time: '09:00', end_time: '10:00',
    visibility: 'team', participants: [], repeat: 'none', repeat_count: 1,
  };
}

export default function EventModal({ mode, initialEvent, prefillDate, people, saving, canDelete, onClose, onSave, onDelete }: EventModalProps) {
  const [form, setForm] = useState<EventFormPayload>(() =>
    initialEvent
      ? {
          title: initialEvent.title, description: initialEvent.description, location: initialEvent.location,
          category: initialEvent.category, all_day: initialEvent.all_day,
          start_date: initialEvent.start_date, end_date: initialEvent.end_date,
          start_time: (initialEvent.start_time || '09:00').slice(0, 5), end_time: (initialEvent.end_time || '10:00').slice(0, 5),
          visibility: initialEvent.visibility, participants: initialEvent.participants || [],
          repeat: 'none', repeat_count: 1,
        }
      : emptyForm(prefillDate)
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(initialEvent
      ? {
          title: initialEvent.title, description: initialEvent.description, location: initialEvent.location,
          category: initialEvent.category, all_day: initialEvent.all_day,
          start_date: initialEvent.start_date, end_date: initialEvent.end_date,
          start_time: (initialEvent.start_time || '09:00').slice(0, 5), end_time: (initialEvent.end_time || '10:00').slice(0, 5),
          visibility: initialEvent.visibility, participants: initialEvent.participants || [],
          repeat: 'none', repeat_count: 1,
        }
      : emptyForm(prefillDate));
    setConfirmDelete(false);
    setError('');
  }, [initialEvent, prefillDate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Judul wajib diisi'); return; }
    if (form.end_date < form.start_date) { setError('Tanggal selesai tidak boleh sebelum tanggal mulai'); return; }
    setError('');
    onSave(form);
  }

  function toggleParticipant(username: string) {
    setForm(f => ({
      ...f,
      participants: f.participants.includes(username)
        ? f.participants.filter(p => p !== username)
        : [...f.participants, username],
    }));
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900 text-base">{mode === 'create' ? 'Tambah Jadwal' : 'Edit Jadwal'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          <div>
            <label className="label-form">Judul</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-form" placeholder="Judul kegiatan" autoFocus />
          </div>

          <div>
            <label className="label-form">Kategori</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {CATEGORY_LIST.map(cat => {
                const conf = CATEGORY_CONF[cat];
                const active = form.category === cat;
                return (
                  <button type="button" key={cat} onClick={() => setForm({ ...form, category: cat })}
                    className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${active ? `${conf.bg} ${conf.text} ${conf.border} ring-1 ring-inset` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: conf.dot }} />
                    {conf.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.all_day} onChange={e => setForm({ ...form, all_day: e.target.checked })} />
            Sepanjang hari (tanpa jam spesifik)
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-form">Tanggal Mulai</label>
              <input type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value, end_date: f.end_date < e.target.value ? e.target.value : f.end_date }))}
                className="input-form" />
            </div>
            <div>
              <label className="label-form">Tanggal Selesai</label>
              <input type="date" value={form.end_date} min={form.start_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input-form" />
            </div>
          </div>

          {!form.all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-form">Jam Mulai</label>
                <input type="time" value={form.start_time}
                  onChange={e => setForm(f => ({ ...f, start_time: e.target.value, end_time: addHoursToTime(e.target.value, 1) }))}
                  className="input-form" />
              </div>
              <div>
                <label className="label-form">Jam Selesai</label>
                <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="input-form" />
              </div>
            </div>
          )}

          <div>
            <label className="label-form">Lokasi (opsional)</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-form" placeholder="Kantor / Zoom / dst" />
          </div>

          <div>
            <label className="label-form">Deskripsi (opsional)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-form" rows={2} />
          </div>

          <div>
            <label className="label-form">Visibilitas</label>
            <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value as CalendarVisibility })} className="input-form">
              <option value="team">Tim — semua yang punya akses kalender bisa lihat</option>
              <option value="private">Pribadi — hanya saya (dan admin) yang bisa lihat</option>
            </select>
          </div>

          {people.length > 0 && (
            <div>
              <label className="label-form">Tandai Peserta (opsional)</label>
              <div className="grid grid-cols-2 gap-1.5 mt-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                {people.map(p => (
                  <label key={p.username} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <input type="checkbox" checked={form.participants.includes(p.username)} onChange={() => toggleParticipant(p.username)} />
                    {p.nama_karyawan}
                  </label>
                ))}
              </div>
            </div>
          )}

          {mode === 'create' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-form">Pengulangan</label>
                <select value={form.repeat} onChange={e => setForm({ ...form, repeat: e.target.value as EventFormPayload['repeat'] })} className="input-form">
                  <option value="none">Tidak berulang</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                </select>
              </div>
              {form.repeat !== 'none' && (
                <div>
                  <label className="label-form">Jumlah Kejadian</label>
                  <input type="number" min={1} max={52} value={form.repeat_count}
                    onChange={e => setForm({ ...form, repeat_count: Math.min(52, Math.max(1, parseInt(e.target.value, 10) || 1)) })}
                    className="input-form" />
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <div className="flex gap-2">
              {mode === 'edit' && initialEvent && (
                <button type="button"
                  onClick={() => downloadIcs(`${initialEvent.title.replace(/[^\w\-]+/g, '_')}.ics`, buildIcsForEvent(initialEvent))}
                  className="text-xs font-semibold text-gray-600 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg">
                  ⬇️ .ics
                </button>
              )}
              {mode === 'edit' && canDelete && onDelete && !confirmDelete && (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg">
                  Hapus
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>

          {confirmDelete && initialEvent && onDelete && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-red-700">Yakin hapus jadwal ini?{initialEvent.series_id ? ' Event ini bagian dari pengulangan.' : ''}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs px-2.5 py-1.5 rounded-lg bg-white border border-gray-300">Batal</button>
                <button type="button" onClick={() => onDelete('single')} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500 text-white font-semibold">Hapus ini saja</button>
                {initialEvent.series_id && (
                  <button type="button" onClick={() => onDelete('series')} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-700 text-white font-semibold">Hapus seluruh seri</button>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
