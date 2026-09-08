import RoleGate from '@/app/components/RoleGate';

export default function CalendarLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate title="Kalender Tim" requiredAccess={['calendar']}>
      {children}
    </RoleGate>
  );
}
