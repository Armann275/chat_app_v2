import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function GuestRoute() {
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <p className="text-slate-500 dark:text-slate-400">Loading…</p>
      </div>
    );
  }

  if (status === 'authed') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
