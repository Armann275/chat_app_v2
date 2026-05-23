import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

export default function GuestRoute() {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

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

  if (status === 'pending_verification' && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }

  return <Outlet />;
}
