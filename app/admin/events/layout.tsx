import RoleGate from '@/app/components/RoleGate';

export default function EventsAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate title="Admin Events" requiredAccess={['events', 'eventregistrations']}>
      {children}
    </RoleGate>
  );
}
