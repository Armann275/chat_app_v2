import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { messageKeys } from '@/queries/message.queries';
import { chatKeys } from '@/queries/chat.queries';
import { useOfflineQueueStore } from '@/stores/offlineQueueStore';
import { getSocket } from '@/socket/client';
import { useAuthStore } from '@/stores/authStore';
import * as syncApi from '@/api/sync.api';

const LAST_SYNCED_KEY = 'chat-app:lastSyncedAt';

function readLastSyncedAt() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(LAST_SYNCED_KEY);
}

function writeLastSyncedAt(iso) {
  if (typeof window === 'undefined' || !iso) return;
  window.localStorage.setItem(LAST_SYNCED_KEY, iso);
}

function upsertMessageInList(queryClient, chatId, message) {
  queryClient.setQueryData(messageKeys.list(chatId), (prev) => {
    if (!prev) return prev;
    const [first, ...rest] = prev.pages;
    if (!first) return prev;
    if (first.some((m) => m.id === message.id)) {
      return {
        ...prev,
        pages: [first.map((m) => (m.id === message.id ? message : m)), ...rest],
      };
    }
    return { ...prev, pages: [[message, ...first], ...rest] };
  });
}

export function useSyncOnReconnect() {
  const status = useAuthStore((s) => s.status);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (status !== 'authed') return undefined;
    const socket = getSocket();

    const runSync = async () => {
      try {
        const since = readLastSyncedAt();
        const delta = await syncApi.getDelta(since);
        for (const m of delta.messages ?? []) {
          upsertMessageInList(queryClient, m.chatId, m);
        }
        if (delta.messages?.length) {
          queryClient.invalidateQueries({ queryKey: chatKeys.list });
        }
        writeLastSyncedAt(delta.serverTime);
      } catch {
        // best-effort; ignore failures
      }

      const queue = useOfflineQueueStore.getState();
      const pending = queue.items;
      if (pending.length === 0) return;
      try {
        const results = await syncApi.postOfflineQueue(
          pending.map(({ tempId, chatId, content, replyToMessageId }) => ({
            tempId, chatId, content, replyToMessageId: replyToMessageId ?? null,
          })),
        );
        for (const r of results) {
          if (r.ok && r.message) {
            upsertMessageInList(queryClient, r.message.chatId, r.message);
          }
          queue.removeByTempId(r.tempId);
        }
        queryClient.invalidateQueries({ queryKey: chatKeys.list });
      } catch {
        // try again on next reconnect
      }
    };

    if (socket.connected) runSync();
    socket.on('connect', runSync);
    return () => {
      socket.off('connect', runSync);
    };
  }, [status, queryClient]);
}
