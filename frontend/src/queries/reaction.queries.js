import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as reactionApi from '@/api/reaction.api';
import { patchMessageInCache } from './message.queries';

function withReaction(message, userId, emoji) {
  const existing = message.reactions ?? [];
  if (existing.some((r) => r.userId === userId && r.emoji === emoji)) return message;
  return {
    ...message,
    reactions: [...existing, { userId, emoji, createdAt: new Date().toISOString() }],
  };
}

function withoutReaction(message, userId, emoji) {
  const existing = message.reactions ?? [];
  return {
    ...message,
    reactions: existing.filter((r) => !(r.userId === userId && r.emoji === emoji)),
  };
}

export function useAddReactionMutation(chatId, currentUserId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }) => {
      patchMessageInCache(queryClient, chatId, messageId, (m) =>
        withReaction(m, currentUserId, emoji),
      );
      return reactionApi.addReaction(chatId, messageId, emoji);
    },
    onError: (_err, { messageId, emoji }) => {
      patchMessageInCache(queryClient, chatId, messageId, (m) =>
        withoutReaction(m, currentUserId, emoji),
      );
    },
  });
}

export function useRemoveReactionMutation(chatId, currentUserId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }) => {
      patchMessageInCache(queryClient, chatId, messageId, (m) =>
        withoutReaction(m, currentUserId, emoji),
      );
      return reactionApi.removeReaction(chatId, messageId, emoji);
    },
    onError: (_err, { messageId, emoji }) => {
      patchMessageInCache(queryClient, chatId, messageId, (m) =>
        withReaction(m, currentUserId, emoji),
      );
    },
  });
}
