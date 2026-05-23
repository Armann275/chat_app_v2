import { useMemo } from 'react';
import { X } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import { useThreadQuery } from '@/queries/thread.queries';
import { useEditMessageMutation, useDeleteMessageMutation } from '@/queries/message.queries';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { cn } from '@/utils/cn';

export default function ThreadPanel({ chat, rootMessage, open, onClose }) {
  const me = useAuthStore((s) => s.user);
  const threadQuery = useThreadQuery(chat.id, rootMessage?.id, { enabled: open });
  const editMutation = useEditMessageMutation(chat.id);
  const deleteMutation = useDeleteMessageMutation(chat.id);

  const memberById = useMemo(() => {
    const map = new Map();
    for (const m of chat.members ?? []) {
      if (m.user) map.set(m.userId, m.user);
    }
    return map;
  }, [chat.members]);

  const messages = useMemo(() => {
    if (!threadQuery.data) return [];
    // The thread endpoint returns replies. We prepend the root for context.
    const replies = threadQuery.data.pages.flat();
    return [rootMessage, ...replies.filter((m) => m.id !== rootMessage?.id)];
  }, [threadQuery.data, rootMessage]);

  if (!rootMessage) return null;

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-96 flex-col border-l border-slate-200 bg-white shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-900',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Thread</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close thread"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto bg-slate-50 px-3 py-3 dark:bg-slate-950">
          {threadQuery.isLoading ? (
            <div className="flex flex-1 items-center justify-center"><Spinner /></div>
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isOwn={m.senderId === me?.id}
                showAvatar
                sender={memberById.get(m.senderId)}
                onSubmitEdit={(content) =>
                  editMutation.mutate({ messageId: m.id, content })
                }
                onDelete={(mode) =>
                  deleteMutation.mutate({ messageId: m.id, mode })
                }
              />
            ))
          )}
        </div>

        <MessageInput
          chat={chat}
          asThreadReply
          replyTarget={{
            id: rootMessage.id,
            content: rootMessage.content ?? '',
            senderName: memberById.get(rootMessage.senderId)?.username,
          }}
          onClearReply={onClose}
        />
      </aside>
    </>
  );
}
