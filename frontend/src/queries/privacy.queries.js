import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as privacyApi from '@/api/privacy.api';

export const privacyKeys = {
  all: ['privacy'],
  mine: ['privacy', 'mine'],
};

export function useMyPrivacyQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: privacyKeys.mine,
    queryFn: privacyApi.getMyPrivacy,
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdatePrivacyMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: privacyApi.updateMyPrivacy,
    onSuccess: (privacy) => {
      queryClient.setQueryData(privacyKeys.mine, privacy);
    },
  });
}
