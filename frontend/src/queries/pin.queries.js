import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as pinApi from '@/api/pin.api';

export const pinKeys = {
  forChat: (chatId) => ['pins', 'chat', chatId],
};

export function usePinsQuery(chatId, { enabled } = {}) {
  return useQuery({
    queryKey: pinKeys.forChat(chatId),
    queryFn: () => pinApi.listPins(chatId),
    enabled: (enabled ?? true) && Boolean(chatId),
    staleTime: 60_000,
  });
}

export function usePinMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => pinApi.pin(chatId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pinKeys.forChat(chatId) });
    },
  });
}

export function useUnpinMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => pinApi.unpin(chatId, messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pinKeys.forChat(chatId) });
    },
  });
}
