import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import * as authApi from '@/api/auth.api';

export function useBootAuth() {
  const status = useAuthStore((s) => s.status);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setGuest = useAuthStore((s) => s.setGuest);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { user, accessToken } = await authApi.refresh();
        if (cancelled) return;
        setAuth({ user, accessToken });
      } catch {
        if (cancelled) return;
        setGuest();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setAuth, setGuest]);

  return status;
}
