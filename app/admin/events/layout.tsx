import RoleGate from '@/app/components/RoleGate';

export default function EventsAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate title="Admin Events" requiredAccess={['admin_events', 'admin_deposit', 'admin_attendance', 'events', 'eventregistrations']}>
      {children}
    </RoleGate>
  );
}
