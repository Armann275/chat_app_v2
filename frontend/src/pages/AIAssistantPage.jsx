import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import AISessionList from '@/components/ai/AISessionList';
import AIMessageBubble from '@/components/ai/AIMessageBubble';
import AIAssistantInput from '@/components/ai/AIAssistantInput';
import Spinner from '@/components/ui/Spinner';
import {
  useAiSessionQuery,
  useAiSessionsQuery,
  useCreateAiSessionMutation,
  useDeleteAiSessionMutation,
  useSendAiMessageMutation,
} from '@/queries/aiAssistant.queries';

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.message || err?.message || fallback;
}

export default function AIAssistantPage() {
  const [activeId, setActiveId] = useState(null);
  const scrollRef = useRef(null);

  const sessionsQuery = useAiSessionsQuery();
  const sessionQuery = useAiSessionQuery(activeId, { enabled: Boolean(activeId) });
  const createMutation = useCreateAiSessionMutation();
  const deleteMutation = useDeleteAiSessionMutation();
  const sendMutation = useSendAiMessageMutation(activeId);

  useEffect(() => {
    if (!activeId && sessionsQuery.data?.length) {
      setActiveId(sessionsQuery.data[0].id);
    }
  }, [activeId, sessionsQuery.data]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [sessionQuery.data?.messages?.length, sendMutation.isPending]);

  async function handleCreate() {
    try {
      const session = await createMutation.mutateAsync();
      setActiveId(session.id);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to create session'));
    }
  }

  async function handleDelete(sessionId) {
    if (!window.confirm('Delete this session and all its messages?')) return;
    try {
      await deleteMutation.mutateAsync(sessionId);
      if (sessionId === activeId) setActiveId(null);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'Failed to delete session'));
    }
  }

  async function handleSend(content) {
    if (!activeId) return;
    try {
      await sendMutation.mutateAsync(content);
    } catch (err) {
      toast.error(extractErrorMessage(err, 'AI request failed'));
    }
  }

  const messages = sessionQuery.data?.messages ?? [];
  const showEmptyState = activeId && !sessionQuery.isLoading && messages.length === 0 && !sendMutation.isPending;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="hidden w-72 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col dark:border-slate-800 dark:bg-slate-900">
        <AISessionList
          sessions={sessionsQuery.data}
          isLoading={sessionsQuery.isLoading}
          activeId={activeId}
          onSelect={setActiveId}
          onCreate={handleCreate}
          onDelete={handleDelete}
          creating={createMutation.isPending}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {sessionQuery.data?.session?.title ?? 'AI Assistant'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ask anything about this project
            </p>
          </div>
        </header>

        <div className="md:hidden">
          <AISessionList
            sessions={sessionsQuery.data}
            isLoading={sessionsQuery.isLoading}
            activeId={activeId}
            onSelect={setActiveId}
            onCreate={handleCreate}
            onDelete={handleDelete}
            creating={createMutation.isPending}
          />
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {!activeId && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-slate-500 dark:text-slate-400">
              <Sparkles className="h-10 w-10 text-indigo-500 opacity-60" />
              <p className="text-sm">
                Pick a session or click &ldquo;New&rdquo; to start chatting with the assistant.
              </p>
            </div>
          )}

          {activeId && sessionQuery.isLoading && (
            <div className="flex justify-center pt-10">
              <Spinner />
            </div>
          )}

          {showEmptyState && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">Empty conversation. Send a message to get started.</p>
              <p className="text-xs">
                Try: &ldquo;What features does this app have?&rdquo; or &ldquo;How does authentication work?&rdquo;
              </p>
            </div>
          )}

          {messages.map((m) => (
            <AIMessageBubble key={m.id} role={m.role} content={m.content} />
          ))}

          {sendMutation.isPending && (
            <AIMessageBubble role="assistant" content="Thinking…" pending />
          )}
        </div>

        <AIAssistantInput
          disabled={!activeId}
          sending={sendMutation.isPending}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
