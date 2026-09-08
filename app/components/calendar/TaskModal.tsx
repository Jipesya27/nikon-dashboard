'use client';

import React, { useEffect, useState } from 'react';
import { CalendarPerson, CalendarTask, CalendarVisibility, TaskPriority, TaskStatus } from './types';

export interface TaskFormPayload {
  title: string;
  description: string;
  due_date: string;
  due_time: string; // '' = tanpa jam
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string;
  assigned_to_nama: string;
  visibility: CalendarVisibility;
}

interface TaskModalProps {
  mode: 'create' | 'edit';
  initialTask?: CalendarTask | null;
  prefillDate?: string;
  people: CalendarPerson[];
  currentUsername: string;
  currentNama: string;
  saving: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (payload: TaskFormPayload) => void;
  onDelete?: () => void;
}

function emptyForm(prefillDate: string | undefined, username: string, nama: string): TaskFormPayload {
  return {
    title: '', description: '', due_date: prefillDate || new Date().toISOString().slice(0, 10),
    due_time: '', priority: 'medium', status: 'todo', assigned_to: username, assigned_to_nama: nama, visibility: 'team',
  };
}

export default function TaskModal({ mode, initialTask, prefillDate, people, currentUsername, currentNama, saving, canDelete, onClose, onSave, onDelete }: TaskModalProps) {
  const [form, setForm] = useState<TaskFormPayload>(() =>
    initialTask
      ? {
          title: initialTask.title, description: initialTask.description, due_date: initialTask.due_date,
          due_time: (initialTask.due_time || '').slice(0, 5), priority: initialTask.priority, status: initialTask.status,
          assigned_to: initialTask.assigned_to, assigned_to_nama: initialTask.assigned_to_nama, visibility: initialTask.visibility,
        }
      : emptyForm(prefillDate, currentUsername, currentNama)
  );
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(initialTask
      ? {
          title: initialTask.title, description: initialTask.description, due_date: initialTask.due_date,
          due_time: (initialTask.due_time || '').slice(0, 5), priority: initialTask.priority, status: initialTask.status,
          assigned_to: initialTask.assigned_to, assigned_to_nama: initialTask.assigned_to_nama, visibility: initialTask.visibility,
        }
      : emptyForm(prefillDate, currentUsername, currentNama));
    setConfirmDelete(false);
    setError('');
  }, [initialTask, prefillDate, currentUsername, currentNama]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('Judul wajib diisi'); return; }
    if (!form.due_date) { setError('Tanggal jatuh tempo wajib diisi'); return; }
    setError('');
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="font-bold text-gray-900 text-base">{mode === 'create' ? 'Tambah Tugas' : 'Edit Tugas'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={submit} className="px-5 py-4 space-y-4">
          <div>
            <label className="label-form">Judul Tugas</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-form" autoFocus />
          </div>

          <div>
            <label className="label-form">Deskripsi (opsional)</label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-form" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-form">Tanggal Jatuh Tempo</label>
              <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="input-form" />
            </div>
            <div>
              <label className="label-form">Jam (opsional)</label>
              <input type="time" value={form.due_time} onChange={e => setForm({ ...form, due_time: e.target.value })} className="input-form" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-form">Prioritas</label>
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as TaskPriority })} className="input-form">
                <option value="low">Rendah</option>
                <option value="medium">Sedang</option>
                <option value="high">Tinggi</option>
              </select>
            </div>
            <div>
              <label className="label-form">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as TaskStatus })} className="input-form">
                <option value="todo">Belum Dikerjakan</option>
                <option value="in_progress">Dikerjakan</option>
                <option value="done">Selesai</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label-form">Ditugaskan Ke</label>
            <select
              value={form.assigned_to}
              onChange={e => {
                const p = people.find(p => p.username === e.target.value);
                setForm({ ...form, assigned_to: e.target.value, assigned_to_nama: p?.nama_karyawan || (e.target.value === currentUsername ? currentNama : '') });
              }}
              className="input-form"
            >
              <option value={currentUsername}>{currentNama} (Saya)</option>
              {people.filter(p => p.username !== currentUsername).map(p => (
                <option key={p.username} value={p.username}>{p.nama_karyawan}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-form">Visibilitas</label>
            <select value={form.visibility} onChange={e => setForm({ ...form, visibility: e.target.value as CalendarVisibility })} className="input-form">
              <option value="team">Tim — semua yang punya akses kalender bisa lihat</option>
              <option value="private">Pribadi — hanya saya, yang ditugaskan, dan admin</option>
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
            <div>
              {mode === 'edit' && canDelete && onDelete && !confirmDelete && (
                <button type="button" onClick={() => setConfirmDelete(true)} className="text-xs font-semibold text-red-600 border border-red-200 hover:bg-red-50 px-3 py-2 rounded-lg">
                  Hapus
                </button>
              )}
              {confirmDelete && onDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-700">Yakin?</span>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs px-2 py-1 rounded-lg bg-gray-100">Batal</button>
                  <button type="button" onClick={onDelete} className="text-xs px-2 py-1 rounded-lg bg-red-500 text-white font-semibold">Ya, Hapus</button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Menyimpan...' : 'Simpan'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
