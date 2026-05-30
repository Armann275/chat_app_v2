import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '@/api/poll.api';

export const pollKeys = {
  all: ['polls'],
  list: (chatId) => ['polls', 'list', chatId],
  detail: (pollId) => ['polls', 'detail', pollId],
};

export function usePollsQuery(chatId, { enabled = true } = {}) {
  return useQuery({
    queryKey: pollKeys.list(chatId),
    queryFn: () => api.listForChat(chatId),
    enabled: enabled && Boolean(chatId),
    staleTime: 15_000,
  });
}

export function usePollQuery(pollId, { enabled = true } = {}) {
  return useQuery({
    queryKey: pollKeys.detail(pollId),
    queryFn: () => api.getPoll(pollId),
    enabled: enabled && Boolean(pollId),
    staleTime: 15_000,
  });
}

function syncPollInLists(queryClient, poll) {
  queryClient.setQueryData(pollKeys.detail(poll.id), poll);
  queryClient.setQueryData(pollKeys.list(poll.chatId), (prev) =>
    prev ? prev.map((p) => (p.id === poll.id ? poll : p)) : prev,
  );
}

export function useCreatePollMutation(chatId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input) => api.createPoll(chatId, input),
    onSuccess: (poll) => {
      queryClient.setQueryData(pollKeys.list(chatId), (prev) =>
        prev ? [poll, ...prev] : [poll],
      );
      queryClient.setQueryData(pollKeys.detail(poll.id), poll);
    },
  });
}

export function useVoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }) => api.vote(pollId, optionId),
    onSuccess: (poll) => syncPollInLists(queryClient, poll),
  });
}

export function useUnvoteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }) => api.unvote(pollId, optionId),
    onSuccess: (poll) => syncPollInLists(queryClient, poll),
  });
}

export function useClosePollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId) => api.closePoll(pollId),
    onSuccess: (poll) => syncPollInLists(queryClient, poll),
  });
}
