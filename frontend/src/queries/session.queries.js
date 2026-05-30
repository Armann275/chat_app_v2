import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as sessionApi from '@/api/session.api';

export const sessionKeys = {
  all: ['sessions'],
  list: ['sessions', 'list'],
};

export function useSessionsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: sessionKeys.list,
    queryFn: sessionApi.listMySessions,
    enabled,
    staleTime: 30_000,
  });
}

export function useRevokeSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionApi.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list });
    },
  });
}

export function useRevokeOtherSessionsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sessionApi.revokeOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sessionKeys.list });
    },
  });
}
