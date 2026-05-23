import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as starApi from '@/api/star.api';

export const starKeys = {
  list: ['starred', 'list'],
};

export function useStarredQuery({ enabled } = {}) {
  return useQuery({
    queryKey: starKeys.list,
    queryFn: () => starApi.listStarred(),
    enabled: enabled ?? true,
    staleTime: 60_000,
  });
}

export function useStarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => starApi.star(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: starKeys.list });
    },
  });
}

export function useUnstarMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId) => starApi.unstar(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: starKeys.list });
    },
  });
}
