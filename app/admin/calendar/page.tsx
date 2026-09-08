'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import MonthGrid from '@/app/components/calendar/MonthGrid';
import EventModal, { EventFormPayload } from '@/app/components/calendar/EventModal';
import TaskModal, { TaskFormPayload } from '@/app/components/calendar/TaskModal';
import TaskSummary, { SummaryFilter } from '@/app/components/calendar/TaskSummary';
import {
  CalendarEvent, CalendarTask, CalendarPerson, EventCategory, TaskStatus,
  CATEGORY_CONF, CATEGORY_LIST, PRIORITY_CONF,
} from '@/app/components/calendar/types';
import { monthGridBounds, addDaysStr, formatIdDate, formatIdDateLong, ymd } from '@/app/components/calendar/utils';
import { errMsg } from '@/app/lib/uiHelpers';

interface CurrentUser { username: string; nama: string; role: string; }

const MONTHS_EN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NOW = new Date();
const TODAY_STR = ymd(NOW);

const STATUS_NEXT: Record<TaskStatus, TaskStatus> = { todo: 'in_progress', in_progress: 'done', done: 'todo' };

export default function CalendarPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [people, setPeople] = useState<CalendarPerson[]>([]);
  const [mainView, setMainView] = useState<'calendar' | 'tasks'>('calendar');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Kalender ──────────────────────────────────────────────────────────────
  const [viewYear, setViewYear] = useState(NOW.getFullYear());
  const [viewMonth, setViewMonth] = useState(NOW.getMonth());
  const [selectedDate, setSelectedDate] = useState(TODAY_STR);
  const [categoryFilter, setCategoryFilter] = useState<'all' | EventCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventModal, setEventModal] = useState<{ mode: 'create' | 'edit'; event?: CalendarEvent; prefillDate?: string } | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const { from, to } = monthGridBounds(viewYear, viewMonth);
      const res = await fetch(`/api/calendar/events?from=${from}&to=${to}`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal memuat kalender');
      setEvents(await res.json());
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally { setEventsLoading(false); }
  }, [viewYear, viewMonth, showToast]);

  const fetchUpcoming = useCallback(async () => {
    try {
      const res = await fetch(`/api/calendar/events?from=${TODAY_STR}&to=${addDaysStr(TODAY_STR, 30)}`);
      if (res.ok) setUpcoming(await res.json());
    } catch { /* widget non-kritis, diamkan jika gagal */ }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);

  // ── Tugas ─────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [taskModal, setTaskModal] = useState<{ mode: 'create' | 'edit'; task?: CalendarTask; prefillDate?: string } | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [taskStatusFilter, setTaskStatusFilter] = useState<'all' | TaskStatus>('all');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState('all');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskDate, setQuickTaskDate] = useState(TODAY_STR);
  const [quickAdding, setQuickAdding] = useState(false);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    try {
      const res = await fetch('/api/calendar/tasks');
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal memuat tugas');
      setTasks(await res.json());
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally { setTasksLoading(false); }
  }, [showToast]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // ── Identitas & daftar karyawan ──────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem('nikon_karyawan');
      if (raw) {
        const k = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentUser({ username: k.username || '', nama: k.nama_karyawan || '', role: k.role || '' });
      }
    } catch { /* biarkan null jika parse gagal */ }
    fetch('/api/calendar/people').then(r => (r.ok ? r.json() : [])).then(setPeople).catch(() => {});
  }, []);

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Super Admin';

  // ── Handlers: Event ───────────────────────────────────────────────────────
  async function handleSaveEvent(payload: EventFormPayload) {
    setSavingEvent(true);
    try {
      const isEdit = eventModal?.mode === 'edit' && eventModal.event;
      const url = isEdit ? `/api/calendar/events/${eventModal!.event!.id}` : '/api/calendar/events';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menyimpan jadwal');
      showToast(isEdit ? 'Jadwal diperbarui' : 'Jadwal ditambahkan');
      setEventModal(null);
      fetchEvents();
      fetchUpcoming();
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally { setSavingEvent(false); }
  }

  async function handleDeleteEvent(scope: 'single' | 'series') {
    if (!eventModal?.event) return;
    setSavingEvent(true);
    try {
      const url = `/api/calendar/events/${eventModal.event.id}${scope === 'series' ? '?scope=series' : ''}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menghapus jadwal');
      showToast('Jadwal dihapus');
      setEventModal(null);
      fetchEvents();
      fetchUpcoming();
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally { setSavingEvent(false); }
  }

  // ── Handlers: Task ────────────────────────────────────────────────────────
  async function handleSaveTask(payload: TaskFormPayload) {
    setSavingTask(true);
    try {
      const isEdit = taskModal?.mode === 'edit' && taskModal.task;
      const url = isEdit ? `/api/calendar/tasks/${taskModal!.task!.id}` : '/api/calendar/tasks';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menyimpan tugas');
      showToast(isEdit ? 'Tugas diperbarui' : 'Tugas ditambahkan');
      setTaskModal(null);
      fetchTasks();
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally { setSavingTask(false); }
  }

  async function handleDeleteTask() {
    if (!taskModal?.task) return;
    setSavingTask(true);
    try {
      const res = await fetch(`/api/calendar/tasks/${taskModal.task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menghapus tugas');
      showToast('Tugas dihapus');
      setTaskModal(null);
      fetchTasks();
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally { setSavingTask(false); }
  }

  async function handleCycleStatus(task: CalendarTask) {
    const status = STATUS_NEXT[task.status];
    try {
      const res = await fetch(`/api/calendar/tasks/${task.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal mengubah status');
      const updated = await res.json();
      setTasks(ts => ts.map(t => (t.id === task.id ? updated : t)));
    } catch (e) {
      showToast(errMsg(e), 'error');
    }
  }

  async function handleQuickAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !currentUser) return;
    setQuickAdding(true);
    try {
      const res = await fetch('/api/calendar/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickTaskTitle.trim(), due_date: quickTaskDate, assigned_to: currentUser.username, assigned_to_nama: currentUser.nama }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menambah tugas');
      setQuickTaskTitle('');
      fetchTasks();
      showToast('Tugas ditambahkan');
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally { setQuickAdding(false); }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredEvents = useMemo(
    () => (categoryFilter === 'all' ? events : events.filter(e => e.category === categoryFilter)),
    [events, categoryFilter]
  );

  const dayEvents = useMemo(
    () => events
      .filter(e => selectedDate >= e.start_date && selectedDate <= e.end_date)
      .sort((a, b) => (a.all_day === b.all_day ? (a.start_time || '').localeCompare(b.start_time || '') : (a.all_day ? -1 : 1))),
    [events, selectedDate]
  );

  const dayTasks = useMemo(() => tasks.filter(t => t.due_date === selectedDate), [tasks, selectedDate]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const evMap = new Map<string, CalendarEvent>();
    [...events, ...upcoming].forEach(e => evMap.set(e.id, e));
    const ev = Array.from(evMap.values())
      .filter(e => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q))
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    const tk = tasks.filter(t => t.title.toLowerCase().includes(q)).sort((a, b) => a.due_date.localeCompare(b.due_date));
    return { events: ev, tasks: tk };
  }, [searchQuery, events, upcoming, tasks]);

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (summaryFilter === 'overdue') list = list.filter(t => t.status !== 'done' && t.due_date < TODAY_STR);
    else if (summaryFilter === 'today') list = list.filter(t => t.status !== 'done' && t.due_date === TODAY_STR);
    else if (summaryFilter === 'week') list = list.filter(t => t.status !== 'done' && t.due_date > TODAY_STR && t.due_date <= addDaysStr(TODAY_STR, 7));
    else if (summaryFilter === 'done') list = list.filter(t => t.status === 'done');
    if (taskStatusFilter !== 'all') list = list.filter(t => t.status === taskStatusFilter);
    if (taskAssigneeFilter !== 'all') list = list.filter(t => t.assigned_to === taskAssigneeFilter);
    return [...list].sort((a, b) => a.due_date.localeCompare(b.due_date) || a.title.localeCompare(b.title));
  }, [tasks, summaryFilter, taskStatusFilter, taskAssigneeFilter]);

  function prevMonth() {
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
  }
  function nextMonth() {
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
  }
  function goToday() {
    setViewYear(NOW.getFullYear()); setViewMonth(NOW.getMonth()); setSelectedDate(TODAY_STR);
  }

  const canDeleteEvent = !!eventModal?.event && (eventModal.event.created_by === currentUser?.username || isAdmin);
  const canDeleteTask = !!taskModal?.task && (taskModal.task.created_by === currentUser?.username || isAdmin);

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold border ${toast.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
          {toast.msg}
        </div>
      )}

      <header className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE800] text-black font-extrabold px-2 py-1 text-lg tracking-wide">NIKON</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Kalender & Tugas Tim</p>
              <p className="text-xs text-gray-400 hidden sm:block">Akses Terbatas — {currentUser?.nama || '...'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setMainView('calendar')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${mainView === 'calendar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                📅 Kalender
              </button>
              <button onClick={() => setMainView('tasks')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-all ${mainView === 'tasks' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
                ✅ Tugas
              </button>
            </div>
            <Link href="/dashboard" className="text-xs text-gray-500 hover:text-gray-900 transition-colors ml-1">← Dashboard</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {mainView === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600">◀</button>
                  <span className="font-bold text-gray-900 text-sm w-28 text-center">{MONTHS_EN_SHORT[viewMonth]} {viewYear}</span>
                  <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600">▶</button>
                  <button onClick={goToday} className="text-xs font-semibold text-gray-600 border border-gray-300 px-2.5 py-1.5 rounded-lg hover:bg-gray-50">Hari Ini</button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Cari jadwal / tugas..."
                    className="input-form !py-1.5 !text-xs w-40 sm:w-56"
                  />
                  <button onClick={() => setEventModal({ mode: 'create', prefillDate: selectedDate })} className="btn-primary !py-1.5 !text-xs whitespace-nowrap">+ Tambah</button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <button onClick={() => setCategoryFilter('all')}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium ${categoryFilter === 'all' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                  Semua
                </button>
                {CATEGORY_LIST.map(cat => {
                  const conf = CATEGORY_CONF[cat];
                  const active = categoryFilter === cat;
                  return (
                    <button key={cat} onClick={() => setCategoryFilter(active ? 'all' : cat)}
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${active ? `${conf.bg} ${conf.text} ${conf.border} ring-1 ring-inset` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                      <span className="inline-block w-1.5 h-1.5 rounded-full mr-1 align-middle" style={{ background: conf.dot }} />
                      {conf.label}
                    </button>
                  );
                })}
              </div>

              {searchResults ? (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Jadwal ({searchResults.events.length})</p>
                    {searchResults.events.length === 0 ? <p className="text-sm text-gray-400">Tidak ditemukan.</p> : (
                      <div className="space-y-1">
                        {searchResults.events.map(ev => (
                          <button key={ev.id} onClick={() => setEventModal({ mode: 'edit', event: ev })}
                            className="w-full text-left flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_CONF[ev.category].dot }} />
                            <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{ev.title}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{formatIdDate(ev.start_date)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tugas ({searchResults.tasks.length})</p>
                    {searchResults.tasks.length === 0 ? <p className="text-sm text-gray-400">Tidak ditemukan.</p> : (
                      <div className="space-y-1">
                        {searchResults.tasks.map(t => (
                          <button key={t.id} onClick={() => setTaskModal({ mode: 'edit', task: t })}
                            className="w-full text-left flex items-center gap-2 hover:bg-gray-50 rounded-lg p-2">
                            <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{t.title}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{formatIdDate(t.due_date)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : eventsLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-[#FFE500] border-t-transparent rounded-full" />
                </div>
              ) : (
                <MonthGrid
                  year={viewYear} month={viewMonth}
                  events={filteredEvents} tasks={tasks}
                  selectedDate={selectedDate} todayStr={TODAY_STR}
                  onSelectDate={setSelectedDate}
                  onOpenEvent={ev => setEventModal({ mode: 'edit', event: ev })}
                />
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{formatIdDateLong(selectedDate)}</p>
                {dayEvents.length === 0 && dayTasks.length === 0 && (
                  <p className="text-sm text-gray-400 py-2">Tidak ada jadwal atau tugas.</p>
                )}
                <div className="space-y-1.5">
                  {dayEvents.map(ev => {
                    const conf = CATEGORY_CONF[ev.category];
                    return (
                      <button key={ev.id} onClick={() => setEventModal({ mode: 'edit', event: ev })}
                        className={`w-full text-left flex items-start gap-2 rounded-lg p-2 border ${conf.bg} ${conf.border}`}>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: conf.dot }} />
                        <span className="flex-1 min-w-0">
                          <span className={`block text-sm font-medium truncate ${conf.text}`}>{ev.title}</span>
                          <span className="block text-[11px] text-gray-500">
                            {ev.all_day ? 'Sepanjang hari' : `${(ev.start_time || '').slice(0, 5)}${ev.end_time ? ` - ${ev.end_time.slice(0, 5)}` : ''}`}
                            {ev.location ? ` · ${ev.location}` : ''}
                            {ev.visibility === 'private' ? ' · 🔒' : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {dayTasks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Tugas Jatuh Tempo</p>
                    {dayTasks.map(t => (
                      <button key={t.id} onClick={() => setTaskModal({ mode: 'edit', task: t })}
                        className="w-full text-left flex items-center gap-2 rounded-lg p-1.5 hover:bg-gray-50">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'done' ? 'bg-green-500' : t.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'}`} />
                        <span className={`flex-1 min-w-0 text-xs truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{t.title}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setEventModal({ mode: 'create', prefillDate: selectedDate })}
                    className="flex-1 text-xs font-semibold text-gray-600 border border-dashed border-gray-300 rounded-lg py-2 hover:bg-gray-50">
                    + Jadwal
                  </button>
                  <button onClick={() => setTaskModal({ mode: 'create', prefillDate: selectedDate })}
                    className="flex-1 text-xs font-semibold text-gray-600 border border-dashed border-gray-300 rounded-lg py-2 hover:bg-gray-50">
                    + Tugas
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Akan Datang (30 hari)</p>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-gray-400">Tidak ada jadwal mendatang.</p>
                ) : (
                  <div className="space-y-1">
                    {upcoming.filter(ev => ev.end_date >= TODAY_STR).slice(0, 6).map(ev => (
                      <button key={ev.id} onClick={() => setEventModal({ mode: 'edit', event: ev })}
                        className="w-full text-left flex items-start gap-2 hover:bg-gray-50 rounded-lg p-1.5">
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: CATEGORY_CONF[ev.category].dot }} />
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-medium text-gray-800 truncate">{ev.title}</span>
                          <span className="block text-[10px] text-gray-400">
                            {formatIdDate(ev.start_date)}{!ev.all_day && ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ''}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <TaskSummary tasks={tasks} todayStr={TODAY_STR} activeFilter={summaryFilter} onFilterChange={setSummaryFilter} />

            <form onSubmit={handleQuickAddTask} className="flex flex-wrap gap-2 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
              <input value={quickTaskTitle} onChange={e => setQuickTaskTitle(e.target.value)}
                placeholder="Tambah tugas cepat..." className="input-form flex-1 min-w-[180px] !py-2" />
              <input type="date" value={quickTaskDate} onChange={e => setQuickTaskDate(e.target.value)} className="input-form w-40 !py-2" />
              <button type="submit" disabled={quickAdding || !quickTaskTitle.trim()} className="btn-primary">+ Tambah</button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'todo', 'in_progress', 'done'] as const).map(s => (
                <button key={s} onClick={() => setTaskStatusFilter(s)}
                  className={`text-xs px-2.5 py-1 rounded-full border font-medium ${taskStatusFilter === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                  {s === 'all' ? 'Semua Status' : s === 'todo' ? 'Belum Dikerjakan' : s === 'in_progress' ? 'Dikerjakan' : 'Selesai'}
                </button>
              ))}
              <select value={taskAssigneeFilter} onChange={e => setTaskAssigneeFilter(e.target.value)} className="input-form !py-1.5 !text-xs w-auto">
                <option value="all">Semua Orang</option>
                {people.map(p => <option key={p.username} value={p.username}>{p.nama_karyawan}</option>)}
              </select>
              <button onClick={() => setTaskModal({ mode: 'create', prefillDate: TODAY_STR })} className="btn-primary !py-1.5 !text-xs ml-auto">+ Tugas Detail</button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
              {tasksLoading ? (
                <div className="p-10 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-[#FFE500] border-t-transparent rounded-full" />
                </div>
              ) : filteredTasks.length === 0 ? (
                <p className="text-sm text-gray-400 p-6 text-center">Tidak ada tugas.</p>
              ) : filteredTasks.map(t => {
                const overdue = t.status !== 'done' && t.due_date < TODAY_STR;
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50">
                    <button onClick={() => handleCycleStatus(t)} title="Ubah status"
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${t.status === 'done' ? 'bg-green-500 border-green-500' : t.status === 'in_progress' ? 'border-blue-400' : 'border-gray-300'}`}>
                      {t.status === 'done' && (
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                      {t.status === 'in_progress' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </button>
                    <button onClick={() => setTaskModal({ mode: 'edit', task: t })} className="flex-1 min-w-0 text-left">
                      <p className={`text-sm font-medium truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={overdue ? 'text-red-600 font-semibold' : ''}>
                          {formatIdDate(t.due_date)}{t.due_time ? ` · ${t.due_time.slice(0, 5)}` : ''}
                        </span>
                        <span>· {t.assigned_to_nama || t.assigned_to}</span>
                        {t.visibility === 'private' && <span>· 🔒 Pribadi</span>}
                      </p>
                    </button>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex-shrink-0 ${PRIORITY_CONF[t.priority].color}`}>
                      {PRIORITY_CONF[t.priority].label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {eventModal && (
        <EventModal
          mode={eventModal.mode}
          initialEvent={eventModal.event}
          prefillDate={eventModal.prefillDate}
          people={people}
          saving={savingEvent}
          canDelete={canDeleteEvent}
          onClose={() => setEventModal(null)}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {taskModal && currentUser && (
        <TaskModal
          mode={taskModal.mode}
          initialTask={taskModal.task}
          prefillDate={taskModal.prefillDate}
          people={people}
          currentUsername={currentUser.username}
          currentNama={currentUser.nama}
          saving={savingTask}
          canDelete={canDeleteTask}
          onClose={() => setTaskModal(null)}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
