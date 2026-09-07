import ResetPasswordForm from './ResetPasswordForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reset Password — Nikon Dashboard',
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const sp = await searchParams;
  const token = Array.isArray(sp.token) ? sp.token[0] : sp.token || '';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-sm border-t-4 border-[#FFE500]">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/nikon-logo.svg" alt="Nikon" className="h-14 w-auto mx-auto mb-3" />
          <h1 className="text-lg font-bold text-gray-900">Buat Password Baru</h1>
          <p className="text-xs text-gray-500 mt-1">Nikon Dashboard</p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}
