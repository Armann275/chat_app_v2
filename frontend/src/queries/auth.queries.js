import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';

export const authKeys = {
  me: ['auth', 'me'],
};

export function useLoginMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ user, accessToken }) => {
      setAuth({ user, accessToken });
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useRegisterMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user, accessToken }) => {
      setAuth({ user, accessToken });
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

export function useMeQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  });
}
