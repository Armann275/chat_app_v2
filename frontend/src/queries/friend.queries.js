import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as friendApi from '@/api/friend.api';

export const friendKeys = {
  all: ['friends'],
  list: ['friends', 'list'],
  incoming: ['friends', 'requests', 'incoming'],
  outgoing: ['friends', 'requests', 'outgoing'],
};

export function useFriendsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: friendKeys.list,
    queryFn: friendApi.listFriends,
    enabled,
    staleTime: 30_000,
  });
}

export function useIncomingFriendRequestsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: friendKeys.incoming,
    queryFn: friendApi.listIncomingFriendRequests,
    enabled,
    staleTime: 30_000,
  });
}

export function useOutgoingFriendRequestsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: friendKeys.outgoing,
    queryFn: friendApi.listOutgoingFriendRequests,
    enabled,
    staleTime: 30_000,
  });
}

export function useSendFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: friendApi.sendFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.outgoing });
      queryClient.invalidateQueries({ queryKey: friendKeys.list });
    },
  });
}

export function useCancelFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: friendApi.cancelFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.outgoing });
    },
  });
}

export function useAcceptFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: friendApi.acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.incoming });
      queryClient.invalidateQueries({ queryKey: friendKeys.list });
    },
  });
}

export function useRejectFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: friendApi.rejectFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.incoming });
    },
  });
}

export function useRemoveFriendMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: friendApi.removeFriend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: friendKeys.list });
    },
  });
}
