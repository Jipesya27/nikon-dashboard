export type EventCategory = 'meeting' | 'event' | 'deadline' | 'reminder' | 'holiday' | 'other';
export type CalendarVisibility = 'team' | 'private';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface CalendarEvent {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_nama: string;
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  all_day: boolean;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  start_time: string | null; // HH:MM
  end_time: string | null;
  visibility: CalendarVisibility;
  participants: string[];
  series_id: string | null;
}

export interface CalendarTask {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  created_by_nama: string;
  title: string;
  description: string;
  due_date: string; // YYYY-MM-DD
  due_time: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assigned_to: string;
  assigned_to_nama: string;
  visibility: CalendarVisibility;
  completed_at: string | null;
}

export interface CalendarPerson {
  username: string;
  nama_karyawan: string;
}

export const CATEGORY_CONF: Record<EventCategory, { label: string; dot: string; bg: string; text: string; border: string }> = {
  meeting:  { label: 'Meeting',    dot: '#3B82F6', bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-300' },
  event:    { label: 'Event/Acara', dot: '#8B5CF6', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
  deadline: { label: 'Deadline',   dot: '#EF4444', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-300' },
  reminder: { label: 'Pengingat',  dot: '#F59E0B', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-300' },
  holiday:  { label: 'Libur',      dot: '#10B981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  other:    { label: 'Lainnya',    dot: '#6B7280', bg: 'bg-gray-50',   text: 'text-gray-700',   border: 'border-gray-300' },
};

export const CATEGORY_LIST = Object.keys(CATEGORY_CONF) as EventCategory[];

export const PRIORITY_CONF: Record<TaskPriority, { label: string; color: string }> = {
  low:    { label: 'Rendah', color: 'text-gray-600 bg-gray-100 border-gray-300' },
  medium: { label: 'Sedang', color: 'text-amber-700 bg-amber-100 border-amber-300' },
  high:   { label: 'Tinggi', color: 'text-red-700 bg-red-100 border-red-300' },
};

export const STATUS_CONF: Record<TaskStatus, { label: string; color: string }> = {
  todo:        { label: 'Belum Dikerjakan', color: 'text-gray-600 bg-gray-100' },
  in_progress: { label: 'Dikerjakan',       color: 'text-blue-700 bg-blue-100' },
  done:        { label: 'Selesai',          color: 'text-green-700 bg-green-100' },
};

export function isCalendarAdminRole(role?: string): boolean {
  return role === 'Admin' || role === 'Super Admin';
}
