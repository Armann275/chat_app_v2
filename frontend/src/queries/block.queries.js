import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as blockApi from '@/api/block.api';

export const blockKeys = {
  all: ['blocks'],
  list: ['blocks', 'list'],
};

export function useBlockedListQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: blockKeys.list,
    queryFn: blockApi.listBlocked,
    enabled,
    staleTime: 60_000,
  });
}

export function useBlockUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockApi.blockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.list });
    },
  });
}

export function useUnblockUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockApi.unblockUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blockKeys.list });
    },
  });
}

export function useReportUserMutation() {
  return useMutation({
    mutationFn: ({ userId, reason, details }) =>
      blockApi.reportUser(userId, { reason, details }),
  });
}
