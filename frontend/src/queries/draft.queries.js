import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as draftApi from '@/api/draft.api';

export const draftKeys = {
  forChat: (chatId) => ['draft', 'chat', chatId],
};

export function useDraftQuery(chatId, { enabled } = {}) {
  return useQuery({
    queryKey: draftKeys.forChat(chatId),
    queryFn: () => draftApi.getDraft(chatId),
    enabled: (enabled ?? true) && Boolean(chatId),
    staleTime: 60_000,
  });
}

export function useSaveDraftMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content) => draftApi.saveDraft(chatId, content),
    onSuccess: (draft) => {
      queryClient.setQueryData(draftKeys.forChat(chatId), draft);
    },
  });
}

export function useClearDraftMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => draftApi.clearDraft(chatId),
    onSuccess: () => {
      queryClient.setQueryData(draftKeys.forChat(chatId), null);
    },
  });
}
