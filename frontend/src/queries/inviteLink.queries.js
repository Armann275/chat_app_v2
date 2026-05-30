import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/inviteLink.api';
import { chatKeys } from './chat.queries';

export const inviteLinkKeys = {
  all: ['invite-links'],
  list: (chatId) => ['invite-links', 'list', chatId],
};

export function useInviteLinksQuery(chatId, { enabled = true } = {}) {
  return useQuery({
    queryKey: inviteLinkKeys.list(chatId),
    queryFn: () => api.listLinks(chatId),
    enabled: enabled && Boolean(chatId),
    staleTime: 30_000,
  });
}

export function useCreateInviteLinkMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts) => api.createLink(chatId, opts),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteLinkKeys.list(chatId) });
    },
  });
}

export function useRevokeInviteLinkMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId) => api.revokeLink(chatId, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteLinkKeys.list(chatId) });
    },
  });
}

export function useRedeemInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code) => api.redeemLink(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}
