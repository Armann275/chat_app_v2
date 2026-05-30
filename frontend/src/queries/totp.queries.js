import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as totpApi from '@/api/totp.api';
import { useAuthStore } from '@/stores/authStore';
import { authKeys } from '@/queries/auth.queries';

export const totpKeys = {
  status: ['totp', 'status'],
};

export function useTotpStatusQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: totpKeys.status,
    queryFn: totpApi.getStatus,
    enabled,
    staleTime: 30_000,
  });
}

export function useBeginTotpSetupMutation() {
  return useMutation({ mutationFn: totpApi.beginSetup });
}

export function useEnableTotpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: totpApi.enable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: totpKeys.status });
    },
  });
}

export function useDisableTotpMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: totpApi.disable,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: totpKeys.status });
    },
  });
}

export function useRegenerateBackupCodesMutation() {
  return useMutation({ mutationFn: totpApi.regenerateBackupCodes });
}

export function useVerify2faMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: totpApi.verify2fa,
    onSuccess: ({ user, accessToken }) => {
      setAuth({ user, accessToken });
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}
