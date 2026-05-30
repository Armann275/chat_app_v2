import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as callApi from '@/api/call.api';

export const callKeys = {
  all: ['calls'],
  history: ['calls', 'history'],
};

export function useCallHistoryQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: callKeys.history,
    queryFn: () => callApi.listCallHistory(),
    enabled,
    staleTime: 30_000,
  });
}

export function useInitiateCallMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, type }) => callApi.initiateCall(chatId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.history });
    },
  });
}

export function useAcceptCallMutation() {
  return useMutation({ mutationFn: callApi.acceptCall });
}

export function useRejectCallMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: callApi.rejectCall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.history });
    },
  });
}

export function useHangupCallMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: callApi.hangupCall,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: callKeys.history });
    },
  });
}
