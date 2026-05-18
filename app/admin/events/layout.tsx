import AdminGate from '@/app/components/AdminGate';

export default function EventsAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGate title="Admin Events">
      {children}
    </AdminGate>
  );
}
