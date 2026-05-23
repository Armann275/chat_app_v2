import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, Clock, Star } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import MessageActions from './MessageActions';
import Reactions from './Reactions';
import ReplyQuote from './ReplyQuote';
import MessageAttachments from './MessageAttachments';
import LinkPreviewCard from './LinkPreviewCard';
import { cn } from '@/utils/cn';

const MENTION_RE = /(@[a-zA-Z0-9_]{3,32})/g;

function renderContent(text, dim) {
  const parts = text.split(MENTION_RE);
  return parts.map((part, idx) =>
    MENTION_RE.test(part) ? (
      <span
        key={idx}
        className={cn(
          'rounded px-0.5 font-medium',
          dim ? 'bg-indigo-700/60 text-indigo-100' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
        )}
      >
        {part}
      </span>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

function StatusIcon({ status }) {
  if (status === 'pending') return <Clock className="h-3 w-3" aria-label="sending" />;
  if (status === 'seen') return <CheckCheck className="h-3 w-3" aria-label="seen" />;
  if (status === 'delivered') return <Check className="h-3 w-3" aria-label="delivered" />;
  return null;
}

export default function MessageBubble({
  message,
  isOwn,
  showAvatar,
  sender,
  repliedTo,
  repliedToSender,
  isPinned,
  isStarred,
  isEditing,
  onJumpToReply,
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
  const time = format(new Date(message.createdAt), 'HH:mm');
  const isDeleted = Boolean(message.deletedAt);
  const isTemp = typeof message.id === 'string' && message.id.startsWith('temp-');

  const [draft, setDraft] = useState(message.content);
  const editRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(message.content);
      requestAnimationFrame(() => editRef.current?.focus());
    }
  }, [isEditing, message.content]);

  const submitEdit = () => {
    const next = draft.trim();
    if (next.length === 0 || next === message.content) {
      onCancelEdit?.();
      return;
    }
    onSubmitEdit?.(next);
  };

  const handleReactionToggle = (emoji, mine) => {
    onReact?.(emoji, mine);
  };

  return (
    <div
      className={cn('group flex items-end gap-2', isOwn ? 'justify-end' : 'justify-start')}
    >
      {!isOwn && (
        <div className="h-7 w-7 shrink-0">
          {showAvatar && (
            <Avatar src={sender?.avatarUrl} name={sender?.username} size="sm" />
          )}
        </div>
      )}

      <div className={cn('relative flex min-w-0 max-w-[75%] flex-col', isOwn && 'items-end')}>
        <div className="flex items-end gap-1">
          {isOwn && !isDeleted && !isTemp && (
            <MessageActions
              isOwn
              isDeleted={isDeleted}
              isPinned={isPinned}
              isStarred={isStarred}
              onReact={(e) => handleReactionToggle(e, false)}
              onReply={onReply}
              onReplyInThread={onReplyInThread}
              onEdit={onStartEdit}
              onDelete={onDelete}
              onForward={onForward}
              onPinToggle={onPinToggle}
              onStarToggle={onStarToggle}
            />
          )}

          <div
            className={cn(
              'rounded-2xl px-3 py-2 text-sm shadow-sm',
              isOwn
                ? 'rounded-br-sm bg-indigo-600 text-white'
                : 'rounded-bl-sm bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100',
            )}
          >
            {!isOwn && showAvatar && sender?.username && (
              <p className="mb-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                {sender.username}
              </p>
            )}

            {message.replyToMessageId && (
              <ReplyQuote
                message={repliedTo}
                sender={repliedToSender}
                onJump={() => onJumpToReply?.(message.replyToMessageId)}
                dim={isOwn}
              />
            )}

            {isEditing ? (
              <div className="flex flex-col gap-1">
                <textarea
                  ref={editRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitEdit();
                    }
                    if (e.key === 'Escape') onCancelEdit?.();
                  }}
                  rows={2}
                  className={cn(
                    'w-full resize-none rounded px-2 py-1 text-sm',
                    isOwn
                      ? 'bg-indigo-700/40 text-white placeholder-indigo-200'
                      : 'bg-slate-50 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
                  )}
                />
                <div className="flex justify-end gap-1 text-[11px]">
                  <button type="button" onClick={onCancelEdit} className="underline opacity-80">
                    Cancel
                  </button>
                  <span className="opacity-60">·</span>
                  <button type="button" onClick={submitEdit} className="underline font-semibold">
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <>
                {(message.content ?? '').length > 0 && (
                  <p
                    className={cn(
                      'whitespace-pre-wrap break-words',
                      isDeleted && 'italic opacity-70',
                    )}
                  >
                    {isDeleted
                      ? 'Message deleted'
                      : renderContent(message.content ?? '', isOwn)}
                  </p>
                )}
                {!isDeleted && (
                  <MessageAttachments
                    attachments={message.attachments}
                    isOwn={isOwn}
                  />
                )}
                {!isDeleted && (
                  <LinkPreviewCard message={message} dim={isOwn} />
                )}
              </>
            )}

            <div
              className={cn(
                'mt-1 flex items-center justify-end gap-1 text-[10px]',
                isOwn ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500',
              )}
            >
              {isPinned && <span title="Pinned">📌</span>}
              {isStarred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
              {message.editedAt && !isDeleted && <span>edited</span>}
              <span>{time}</span>
              {isOwn && <StatusIcon status={message.status ?? 'delivered'} />}
            </div>
          </div>

          {!isOwn && !isDeleted && !isTemp && (
            <MessageActions
              isOwn={false}
              isDeleted={isDeleted}
              isPinned={isPinned}
              isStarred={isStarred}
              onReact={(e) => handleReactionToggle(e, false)}
              onReply={onReply}
              onReplyInThread={onReplyInThread}
              onDelete={onDelete}
              onForward={onForward}
              onPinToggle={onPinToggle}
              onStarToggle={onStarToggle}
            />
          )}
        </div>

        {!isDeleted && (
          <Reactions
            message={message}
            onToggle={handleReactionToggle}
            align={isOwn ? 'end' : 'start'}
          />
        )}
      </div>
    </div>
  );
}
