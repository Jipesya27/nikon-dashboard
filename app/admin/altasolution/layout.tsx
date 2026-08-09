import RoleGate from '@/app/components/RoleGate';

export default function AltaSolutionAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGate title="Admin AltaSolution" requiredAccess={['altasolution']}>
      {children}
    </RoleGate>
  );
}
