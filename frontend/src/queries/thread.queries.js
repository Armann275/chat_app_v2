import { useInfiniteQuery } from '@tanstack/react-query';
import * as messageApi from '@/api/message.api';

const PAGE_SIZE = 50;

export const threadKeys = {
  list: (rootId) => ['thread', 'list', rootId],
};

export function useThreadQuery(chatId, rootId, { enabled } = {}) {
  return useInfiniteQuery({
    queryKey: threadKeys.list(rootId),
    enabled: (enabled ?? true) && Boolean(chatId) && Boolean(rootId),
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const data = await messageApi.getThread(chatId, rootId, {
        limit: PAGE_SIZE,
        offset: pageParam,
      });
      return data.messages ?? data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PAGE_SIZE) return undefined;
      return allPages.reduce((sum, p) => sum + p.length, 0);
    },
    staleTime: 30_000,
  });
}

export function appendToThreadCache(queryClient, rootId, message) {
  queryClient.setQueryData(threadKeys.list(rootId), (prev) => {
    if (!prev) return prev;
    const lastIdx = prev.pages.length - 1;
    const last = prev.pages[lastIdx] ?? [];
    if (last.some((m) => m.id === message.id)) return prev;
    const updated = prev.pages.map((p, i) => (i === lastIdx ? [...p, message] : p));
    return { ...prev, pages: updated };
  });
}
