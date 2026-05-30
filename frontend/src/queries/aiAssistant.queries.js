import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as aiApi from '@/api/aiAssistant.api';

export const aiKeys = {
  all: ['ai'],
  sessions: ['ai', 'sessions'],
  session: (sessionId) => ['ai', 'sessions', sessionId],
};

export function useAiSessionsQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: aiKeys.sessions,
    queryFn: () => aiApi.listSessions(),
    enabled,
    staleTime: 30_000,
  });
}

export function useAiSessionQuery(sessionId, { enabled } = {}) {
  return useQuery({
    queryKey: aiKeys.session(sessionId),
    queryFn: () => aiApi.getSession(sessionId),
    enabled: (enabled ?? true) && Boolean(sessionId),
    staleTime: 30_000,
  });
}

export function useCreateAiSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: aiApi.createSession,
    onSuccess: (session) => {
      queryClient.setQueryData(aiKeys.sessions, (prev) => {
        const list = Array.isArray(prev) ? prev : [];
        return [session, ...list];
      });
      queryClient.setQueryData(aiKeys.session(session.id), {
        session,
        messages: [],
      });
    },
  });
}

export function useDeleteAiSessionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId) => aiApi.deleteSession(sessionId),
    onSuccess: (_data, sessionId) => {
      queryClient.setQueryData(aiKeys.sessions, (prev) =>
        Array.isArray(prev) ? prev.filter((s) => s.id !== sessionId) : prev,
      );
      queryClient.removeQueries({ queryKey: aiKeys.session(sessionId) });
    },
  });
}

export function useSendAiMessageMutation(sessionId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content) => aiApi.sendMessage(sessionId, content),
    onSuccess: ({ session, userMessage, assistantMessage }) => {
      queryClient.setQueryData(aiKeys.session(sessionId), (prev) => {
        const messages = prev?.messages ?? [];
        return {
          session,
          messages: [...messages, userMessage, assistantMessage],
        };
      });
      queryClient.setQueryData(aiKeys.sessions, (prev) => {
        if (!Array.isArray(prev)) return prev;
        const without = prev.filter((s) => s.id !== session.id);
        return [session, ...without];
      });
    },
  });
}
