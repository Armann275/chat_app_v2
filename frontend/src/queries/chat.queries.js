import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as chatApi from '@/api/chat.api';

export const chatKeys = {
  all: ['chats'],
  list: ['chats', 'list'],
  requests: ['chats', 'requests'],
  detail: (chatId) => ['chats', 'detail', chatId],
  members: (chatId) => ['chats', 'members', chatId],
};

export function useChatsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: chatKeys.list,
    queryFn: () => chatApi.listMyChats(),
    enabled,
    staleTime: 30_000,
  });
}

export function useChatQuery(chatId, { enabled } = {}) {
  return useQuery({
    queryKey: chatKeys.detail(chatId),
    queryFn: () => chatApi.getChat(chatId),
    enabled: (enabled ?? true) && Boolean(chatId),
    staleTime: 30_000,
  });
}

export function useCreateDirectChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatApi.createDirectChat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

export function useCreateGroupChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatApi.createGroupChat,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

export function useCreateChannelMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatApi.createChannel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

export function useUpdateGroupMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch) => chatApi.updateGroup(chatId, patch),
    onSuccess: (chat) => {
      queryClient.setQueryData(chatKeys.detail(chatId), (prev) =>
        prev ? { ...prev, ...chat } : prev,
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

export function useSetMemberRoleMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }) => chatApi.setMemberRole(chatId, userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.members(chatId) });
    },
  });
}

export function useAddMembersMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberIds) => chatApi.addMembers(chatId, memberIds),
    onSuccess: (members) => {
      queryClient.setQueryData(chatKeys.detail(chatId), (prev) =>
        prev ? { ...prev, members } : prev,
      );
    },
  });
}

export function useRemoveMemberMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId) => chatApi.removeMember(chatId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    },
  });
}

export function useLeaveChatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId) => chatApi.leaveChat(chatId),
    onSuccess: (_data, chatId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
      queryClient.removeQueries({ queryKey: chatKeys.detail(chatId) });
    },
  });
}

export function useSetDisappearingMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (disappearingSeconds) => chatApi.setDisappearing(chatId, disappearingSeconds),
    onSuccess: (chat) => {
      queryClient.setQueryData(chatKeys.detail(chatId), (prev) =>
        prev ? { ...prev, ...chat } : prev,
      );
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
    },
  });
}

export function useRequestChatsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: chatKeys.requests,
    queryFn: () => chatApi.listRequestChats(),
    enabled,
    staleTime: 30_000,
  });
}

export function useAcceptChatRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId) => chatApi.acceptChatRequest(chatId),
    onSuccess: (chat, chatId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.requests });
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
      if (chat) {
        queryClient.setQueryData(chatKeys.detail(chatId), (prev) =>
          prev ? { ...prev, ...chat } : prev,
        );
      }
    },
  });
}

export function useRejectChatRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chatId) => chatApi.rejectChatRequest(chatId),
    onSuccess: (_data, chatId) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.requests });
      queryClient.invalidateQueries({ queryKey: chatKeys.list });
      queryClient.removeQueries({ queryKey: chatKeys.detail(chatId) });
    },
  });
}
