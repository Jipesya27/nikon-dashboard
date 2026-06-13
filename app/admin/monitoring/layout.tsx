import RoleGate from '@/app/components/RoleGate';

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate title="System Monitoring" requiredAccess={['admin']}>
      {children}
    </RoleGate>
  );
}
