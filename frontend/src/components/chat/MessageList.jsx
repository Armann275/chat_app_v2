import { useEffect, useMemo, useRef } from 'react';
import { isSameDay } from 'date-fns';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import {
  useMessagesQuery,
  useMarkSeenMutation,
} from '@/queries/message.queries';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';

function membersById(chat) {
  const map = new Map();
  for (const m of chat?.members ?? []) {
    if (m.user) map.set(m.userId, m.user);
  }
  return map;
}

export default function MessageList({
  chat,
  pinnedIds,
  starredIds,
  editingId,
  onStartEdit,
  onCancelEdit,
  onSubmitEdit,
  onDelete,
  onReact,
  onReply,
  onReplyInThread,
  onForward,
  onPinToggle,
  onStarToggle,
}) {
  const me = useAuthStore((s) => s.user);
  const chatId = chat.id;
  const messagesQuery = useMessagesQuery(chatId);
  const markSeen = useMarkSeenMutation(chatId);

  const containerRef = useRef(null);
  const lastSeenIdRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const prevNewestIdRef = useRef(null);

  const messages = useMemo(() => {
    const pages = messagesQuery.data?.pages ?? [];
    const flat = pages.flat();
    return [...flat].reverse();
  }, [messagesQuery.data]);

  const senderMap = useMemo(() => membersById(chat), [chat]);
  const messageById = useMemo(() => {
    const map = new Map();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distance < 120;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || messages.length === 0) return;
    const newest = messages[messages.length - 1];
    const wasMine = newest.senderId === me?.id;
    if (prevNewestIdRef.current == null || wasMine || isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevNewestIdRef.current = newest.id;
  }, [messages, me?.id]);

  useEffect(() => {
    if (messages.length === 0 || !me?.id) return;
    const newest = [...messages].reverse().find((m) => m.senderId !== me.id);
    if (!newest) return;
    if (lastSeenIdRef.current === newest.id) return;
    if (typeof newest.id === 'string' && newest.id.startsWith('temp-')) return;
    lastSeenIdRef.current = newest.id;
    markSeen.mutate(newest.id, {
      onError: () => {
        lastSeenIdRef.current = null;
      },
    });
  }, [messages, me?.id, markSeen]);

  if (messagesQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto bg-slate-50 px-3 py-4 dark:bg-slate-950">
        {[
          'w-1/2', 'w-2/3 ml-auto', 'w-1/3', 'w-3/4 ml-auto', 'w-2/5', 'w-1/2 ml-auto',
        ].map((w, i) => (
          <Skeleton key={i} className={`h-9 ${w} rounded-2xl`} />
        ))}
      </div>
    );
  }

  if (messagesQuery.isError) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-red-600">
        Could not load messages.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto bg-slate-50 px-3 py-4 dark:bg-slate-950"
    >
      {messagesQuery.hasNextPage && (
        <div className="flex justify-center pb-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => messagesQuery.fetchNextPage()}
            disabled={messagesQuery.isFetchingNextPage}
          >
            {messagesQuery.isFetchingNextPage ? 'Loading…' : 'Load older messages'}
          </Button>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
          No messages yet. Say hi!
        </div>
      ) : (
        messages.map((message, idx) => {
          const prev = messages[idx - 1];
          const next = messages[idx + 1];
          const showDate =
            !prev || !isSameDay(new Date(prev.createdAt), new Date(message.createdAt));
          const isOwn = message.senderId === me?.id;
          const sender = senderMap.get(message.senderId);
          const showAvatar =
            !isOwn && (!next || next.senderId !== message.senderId);

          const repliedTo = message.replyToMessageId
            ? messageById.get(message.replyToMessageId)
            : null;
          const repliedToSender = repliedTo
            ? senderMap.get(repliedTo.senderId)
            : null;

          return (
            <div key={message.id} id={`msg-${message.id}`}>
              {showDate && <DateSeparator date={new Date(message.createdAt)} />}
              <MessageBubble
                message={message}
                isOwn={isOwn}
                showAvatar={showAvatar}
                sender={sender}
                repliedTo={repliedTo}
                repliedToSender={repliedToSender}
                isPinned={pinnedIds?.has(message.id)}
                isStarred={starredIds?.has(message.id)}
                isEditing={editingId === message.id}
                onJumpToReply={(id) => {
                  const el = document.getElementById(`msg-${id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onStartEdit={() => onStartEdit?.(message)}
                onCancelEdit={onCancelEdit}
                onSubmitEdit={(content) => onSubmitEdit?.(message, content)}
                onDelete={(mode) => onDelete?.(message, mode)}
                onReact={(emoji, mine) => onReact?.(message, emoji, mine)}
                onReply={() => onReply?.(message, sender)}
                onReplyInThread={() => onReplyInThread?.(message, sender)}
                onForward={() => onForward?.(message)}
                onPinToggle={() => onPinToggle?.(message)}
                onStarToggle={() => onStarToggle?.(message)}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
