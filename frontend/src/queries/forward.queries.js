import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as forwardApi from '@/api/forward.api';
import { messageKeys } from './message.queries';

export function useForwardMessagesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageIds, toChatIds }) =>
      forwardApi.forwardMessages({ messageIds, toChatIds }),
    onSuccess: (messages) => {
      const chatIds = new Set(messages.map((m) => m.chatId));
      for (const chatId of chatIds) {
        queryClient.invalidateQueries({ queryKey: messageKeys.list(chatId) });
      }
    },
  });
}
