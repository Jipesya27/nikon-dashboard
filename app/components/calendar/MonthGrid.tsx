'use client';

import React, { useMemo } from 'react';
import { CalendarEvent, CalendarTask, CATEGORY_CONF } from './types';
import { ymd } from './utils';

const DAY_HEADERS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  events: CalendarEvent[];
  tasks: CalendarTask[];
  selectedDate: string;
  todayStr: string;
  onSelectDate: (date: string) => void;
  onOpenEvent: (event: CalendarEvent) => void;
}

export default function MonthGrid({ year, month, events, tasks, selectedDate, todayStr, onSelectDate, onOpenEvent }: MonthGridProps) {
  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const offset = (firstOfMonth.getDay() + 6) % 7; // Senin = 0
    const gridStart = new Date(year, month, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return { date: d, dateStr: ymd(d), inMonth: d.getMonth() === month };
    });
  }, [year, month]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const cell of cells) map[cell.dateStr] = [];
    for (const ev of events) {
      for (const cell of cells) {
        if (cell.dateStr >= ev.start_date && cell.dateStr <= ev.end_date) {
          map[cell.dateStr].push(ev);
        }
      }
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
    }
    return map;
  }, [cells, events]);

  const taskCountByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === 'done') continue;
      map[t.due_date] = (map[t.due_date] || 0) + 1;
    }
    return map;
  }, [tasks]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
        {DAY_HEADERS.map(d => (
          <div key={d} className="px-2 py-2 text-[11px] font-semibold text-gray-500 text-center uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(cell => {
          const dayEvents = eventsByDay[cell.dateStr] || [];
          const taskCount = taskCountByDay[cell.dateStr] || 0;
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDate;
          return (
            <button
              key={cell.dateStr}
              onClick={() => onSelectDate(cell.dateStr)}
              className={`min-h-[92px] border-b border-r border-gray-100 p-1.5 text-left align-top flex flex-col gap-1 transition-colors ${cell.inMonth ? 'bg-white' : 'bg-gray-50/60'} ${isSelected ? 'ring-2 ring-inset ring-[#FFE500]' : 'hover:bg-gray-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full font-semibold ${isToday ? 'bg-[#FFE500] text-black' : cell.inMonth ? 'text-gray-700' : 'text-gray-300'}`}>
                  {cell.date.getDate()}
                </span>
                {taskCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">✓{taskCount}</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => {
                  const conf = CATEGORY_CONF[ev.category];
                  return (
                    <span
                      key={ev.id}
                      onClick={(e) => { e.stopPropagation(); onOpenEvent(ev); }}
                      className={`text-[10px] truncate px-1 py-0.5 rounded ${conf.bg} ${conf.text} border ${conf.border} cursor-pointer`}
                      title={ev.title}
                    >
                      {!ev.all_day && ev.start_time ? `${ev.start_time.slice(0, 5)} ` : ''}{ev.title}
                    </span>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3} lainnya</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
