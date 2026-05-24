import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/joinRequest.api';
import { chatKeys } from './chat.queries';

export const joinRequestKeys = {
  all: ['join-requests'],
  list: (chatId) => ['join-requests', 'list', chatId],
};

export function useJoinRequestsQuery(chatId, { enabled = true } = {}) {
  return useQuery({
    queryKey: joinRequestKeys.list(chatId),
    queryFn: () => api.listPending(chatId),
    enabled: enabled && Boolean(chatId),
    staleTime: 15_000,
  });
}

export function useRequestToJoinMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, message }) => api.requestToJoin(chatId, { message }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

export function useApproveJoinMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.approve(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: joinRequestKeys.list(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    },
  });
}

export function useRejectJoinMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => api.reject(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: joinRequestKeys.list(chatId) });
    },
  });
}
