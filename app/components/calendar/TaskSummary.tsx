'use client';

import React, { useMemo } from 'react';
import { CalendarTask } from './types';

export type SummaryFilter = 'all' | 'overdue' | 'today' | 'week' | 'done';

interface TaskSummaryProps {
  tasks: CalendarTask[];
  todayStr: string;
  activeFilter: SummaryFilter;
  onFilterChange: (f: SummaryFilter) => void;
}

function addDaysStr(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function TaskSummary({ tasks, todayStr, activeFilter, onFilterChange }: TaskSummaryProps) {
  const weekLimit = addDaysStr(todayStr, 7);

  const counts = useMemo(() => {
    let overdue = 0, today = 0, week = 0, done = 0;
    for (const t of tasks) {
      if (t.status === 'done') { done++; continue; }
      if (t.due_date < todayStr) overdue++;
      else if (t.due_date === todayStr) today++;
      else if (t.due_date <= weekLimit) week++;
    }
    return { overdue, today, week, done, all: tasks.length };
  }, [tasks, todayStr, weekLimit]);

  const workload = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === 'done') continue;
      const key = t.assigned_to_nama || t.assigned_to || 'Belum ditugaskan';
      map[key] = (map[key] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [tasks]);

  const cards: { id: SummaryFilter; label: string; value: number; color: string; border: string }[] = [
    { id: 'overdue', label: 'Terlambat', value: counts.overdue, color: 'text-red-600', border: 'border-l-red-400' },
    { id: 'today', label: 'Hari Ini', value: counts.today, color: 'text-amber-600', border: 'border-l-amber-400' },
    { id: 'week', label: 'Minggu Ini', value: counts.week, color: 'text-blue-600', border: 'border-l-blue-400' },
    { id: 'done', label: 'Selesai', value: counts.done, color: 'text-green-600', border: 'border-l-green-400' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map(c => (
          <button key={c.id} onClick={() => onFilterChange(activeFilter === c.id ? 'all' : c.id)}
            className={`text-left bg-white rounded-xl p-3.5 border border-gray-200 border-l-4 ${c.border} shadow-sm transition-all ${activeFilter === c.id ? 'ring-2 ring-[#FFE500]' : 'hover:shadow'}`}>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium">{c.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${c.color}`}>{c.value}</p>
          </button>
        ))}
      </div>

      {workload.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
          <p className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-2">Beban Tugas per Orang (belum selesai)</p>
          <div className="space-y-1.5">
            {workload.map(([name, count]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 w-32 truncate flex-shrink-0">{name}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFE500]" style={{ width: `${Math.min(100, count * 20)}%` }} />
                </div>
                <span className="text-xs font-semibold text-gray-500 w-5 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
