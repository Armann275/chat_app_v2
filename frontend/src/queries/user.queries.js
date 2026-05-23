import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as userApi from '@/api/user.api';
import { useAuthStore } from '@/stores/authStore';
import { authKeys } from '@/queries/auth.queries';

export const userKeys = {
  profile: ['user', 'profile'],
  search: (q) => ['user', 'search', q ?? ''],
};

export function useProfileQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: userKeys.profile,
    queryFn: userApi.getProfile,
    enabled,
    staleTime: 60_000,
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);

  return useMutation({
    mutationFn: userApi.updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.profile, user);
      queryClient.setQueryData(authKeys.me, user);
      setUser?.(user);
    },
  });
}

export function useSearchUsersQuery(query, { enabled } = {}) {
  const q = (query ?? '').trim();
  return useQuery({
    queryKey: userKeys.search(q),
    queryFn: () => userApi.searchUsers({ q }),
    enabled: (enabled ?? true) && q.length > 0,
    staleTime: 30_000,
  });
}
