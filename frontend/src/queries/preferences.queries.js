import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as prefsApi from '@/api/preferences.api';

export const prefsKeys = {
  mine: ['preferences', 'mine'],
  forChat: (chatId) => ['preferences', 'chat', chatId],
};

export function useMyPreferencesQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: prefsKeys.mine,
    queryFn: prefsApi.getMyPreferences,
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateMyPreferencesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: prefsApi.updateMyPreferences,
    onSuccess: (prefs) => {
      queryClient.setQueryData(prefsKeys.mine, prefs);
    },
  });
}

export function useChatPreferencesQuery(chatId, { enabled } = {}) {
  return useQuery({
    queryKey: prefsKeys.forChat(chatId),
    queryFn: () => prefsApi.getChatPreferences(chatId),
    enabled: (enabled ?? true) && Boolean(chatId),
    staleTime: 60_000,
  });
}

export function useUpdateChatPreferencesMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch) => prefsApi.updateChatPreferences(chatId, patch),
    onSuccess: (prefs) => {
      queryClient.setQueryData(prefsKeys.forChat(chatId), prefs);
    },
  });
}
