import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as messageApi from '@/api/message.api';
import { useOfflineQueueStore } from '@/stores/offlineQueueStore';
import { chatKeys } from '@/queries/chat.queries';

const PAGE_SIZE = 50;

export const messageKeys = {
  list: (chatId) => ['messages', 'list', chatId],
  search: (q, chatId) => ['messages', 'search', q ?? '', chatId ?? 'all'],
};

export function useMessagesQuery(chatId, { enabled } = {}) {
  return useInfiniteQuery({
    queryKey: messageKeys.list(chatId),
    enabled: (enabled ?? true) && Boolean(chatId),
    initialPageParam: 0,
    queryFn: ({ pageParam = 0 }) =>
      messageApi.getMessages(chatId, { limit: PAGE_SIZE, offset: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((sum, p) => sum + p.length, 0);
    },
    staleTime: 30_000,
  });
}

function appendMessageToCache(queryClient, chatId, message) {
  queryClient.setQueryData(messageKeys.list(chatId), (prev) => {
    if (!prev) return prev;
    const [first, ...rest] = prev.pages;
    if (!first) return prev;
    if (first.some((m) => m.id === message.id)) return prev;
    return {
      ...prev,
      pages: [[message, ...first], ...rest],
    };
  });
}

function replaceTempInCache(queryClient, chatId, tempId, message) {
  queryClient.setQueryData(messageKeys.list(chatId), (prev) => {
    if (!prev) return prev;
    const realAlreadyPresent = prev.pages.some((p) =>
      p.some((m) => m.id === message.id),
    );
    return {
      ...prev,
      pages: prev.pages.map((page) =>
        realAlreadyPresent
          ? page.filter((m) => m.id !== tempId)
          : page.map((m) => (m.id === tempId ? message : m)),
      ),
    };
  });
}

function removeFromCache(queryClient, chatId, id) {
  queryClient.setQueryData(messageKeys.list(chatId), (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      pages: prev.pages.map((page) => page.filter((m) => m.id !== id)),
    };
  });
}

export function patchMessageInCache(queryClient, chatId, messageId, patcher) {
  queryClient.setQueryData(messageKeys.list(chatId), (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      pages: prev.pages.map((page) =>
        page.map((m) => (m.id === messageId ? patcher(m) : m)),
      ),
    };
  });
}

export function useSendMessageMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      content, replyToMessageId, asThreadReply, attachmentIds, optimisticMessage,
    }) => {
      if (optimisticMessage) {
        appendMessageToCache(queryClient, chatId, optimisticMessage);
      }
      return messageApi.sendMessage(chatId, {
        content, replyToMessageId, asThreadReply, attachmentIds,
      });
    },
    onSuccess: (message, vars) => {
      if (vars.optimisticMessage) {
        replaceTempInCache(queryClient, chatId, vars.optimisticMessage.id, message);
      } else {
        appendMessageToCache(queryClient, chatId, message);
      }
    },
    onError: (err, vars) => {
      // If the network is unreachable (no response), queue for later instead of
      // dropping the optimistic message. Text-only sends only — attachments aren't
      // resumable through the offline queue endpoint.
      const isNetworkError =
        !err?.response && err?.message && /network|timeout|failed to fetch/i.test(err.message);
      const opt = vars.optimisticMessage;
      const canQueue =
        isNetworkError &&
        opt &&
        !vars.asThreadReply &&
        (!vars.attachmentIds || vars.attachmentIds.length === 0);

      if (canQueue) {
        useOfflineQueueStore.getState().enqueue({
          tempId: opt.id,
          chatId,
          content: vars.content,
          replyToMessageId: vars.replyToMessageId ?? null,
        });
        return;
      }
      if (opt) removeFromCache(queryClient, chatId, opt.id);
    },
  });
}

export function useMarkSeenMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => messageApi.markSeen(chatId, messageId),
    onSuccess: () => {
      // Clear the per-chat unread badge in the sidebar as soon as we've
      // marked the latest message seen. The server is authoritative on
      // the next refetch, so this is purely an optimistic UX hint.
      queryClient.setQueryData(chatKeys.list, (chats) => {
        if (!Array.isArray(chats)) return chats;
        return chats.map((c) =>
          c.id === chatId && (c.unreadCount ?? 0) > 0
            ? { ...c, unreadCount: 0 }
            : c,
        );
      });
    },
  });
}

export function useEditMessageMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, content }) =>
      messageApi.editMessage(chatId, messageId, content),
    onSuccess: (message) => {
      patchMessageInCache(queryClient, chatId, message.id, () => message);
    },
  });
}

export function useDeleteMessageMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, mode = 'for_me' }) =>
      messageApi.deleteMessage(chatId, messageId, mode).then(() => ({ messageId, mode })),
    onSuccess: ({ messageId, mode }) => {
      if (mode === 'for_me') {
        removeFromCache(queryClient, chatId, messageId);
      } else {
        patchMessageInCache(queryClient, chatId, messageId, (m) => ({
          ...m,
          deletedAt: new Date().toISOString(),
          content: '',
        }));
      }
    },
  });
}

export function useSearchMessagesQuery({ q, chatId } = {}) {
  const trimmed = (q ?? '').trim();
  return useQuery({
    queryKey: messageKeys.search(trimmed, chatId),
    queryFn: () => messageApi.searchMessages({ q: trimmed, chatId }),
    enabled: trimmed.length > 0,
    staleTime: 30_000,
  });
}
