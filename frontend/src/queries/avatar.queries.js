import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as avatarApi from '@/api/avatar.api';
import { useAuthStore } from '@/stores/authStore';
import { authKeys } from '@/queries/auth.queries';
import { userKeys } from '@/queries/user.queries';

function syncUser(queryClient, setUser, user) {
  queryClient.setQueryData(authKeys.me, user);
  queryClient.setQueryData(userKeys.profile, user);
  setUser?.(user);
}

export function useSetGeneratedAvatarMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: avatarApi.setGeneratedAvatar,
    onSuccess: (user) => syncUser(queryClient, setUser, user),
  });
}

export function useUploadCustomPhotoMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: avatarApi.uploadCustomPhoto,
    onSuccess: (user) => syncUser(queryClient, setUser, user),
  });
}

export function useClearCustomPhotoMutation() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: avatarApi.clearCustomPhoto,
    onSuccess: (user) => syncUser(queryClient, setUser, user),
  });
}
