import { NavLink } from 'react-router-dom';
import { Users, User, BellOff, Archive, Megaphone } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import PresenceDot from '@/components/chat/PresenceDot';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/utils/cn';

function chatDisplayName(chat) {
  if (chat.type === 'group') return chat.name ?? 'Untitled group';
  if (chat.type === 'channel') return chat.name ?? 'Untitled channel';
  return chat.otherUser?.username ?? 'Direct chat';
}

const ATTACHMENT_LABEL = {
  image: '📎 Photo',
  video: '📎 Video',
  file: '📎 File',
  voice: '🎤 Voice message',
};

function formatPreview(chat, myId) {
  const last = chat.lastMessage;
  if (!last) return null;
  if (last.deletedAt) return 'Message deleted';

  const isGroupLike = chat.type !== 'direct';
  const isMine = last.senderId && last.senderId === myId;
  const text =
    last.content?.trim() ||
    ATTACHMENT_LABEL[last.attachmentKind] ||
    (last.attachmentKind ? '📎 Attachment' : '');
  if (!text) return null;

  if (!isGroupLike) return text;
  const who = isMine ? 'You' : (last.senderUsername ?? 'Someone');
  return `${who}: ${text}`;
}

export default function ChatListItem({ chat }) {
  const me = useAuthStore((s) => s.user);
  const Icon = chat.type === 'channel' ? Megaphone : chat.type === 'group' ? Users : User;
  const title = chatDisplayName(chat);
  const isDirect = chat.type === 'direct';
  const preview = formatPreview(chat, me?.id);
  const fallbackSubtitle = isDirect
    ? chat.otherUser?.email ?? 'Direct chat'
    : chat.type === 'channel'
      ? 'Channel'
      : 'Group chat';
  const unread = chat.unreadCount ?? 0;

  return (
    <NavLink
      to={`/chats/${chat.id}`}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
          isActive
            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
        )
      }
    >
      <span className="relative">
        <Avatar src={isDirect ? chat.otherUser?.avatarUrl : null} name={title} size="md" />
        {isDirect && chat.otherUser && (
          <span className="absolute bottom-0 right-0">
            <PresenceDot userId={chat.otherUser.id} />
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate font-medium">
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
          <span className="truncate">{title}</span>
          {chat.status === 'request' && (
            <span className="shrink-0 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              Pending
            </span>
          )}
          {chat.mutedUntil && new Date(chat.mutedUntil).getTime() > Date.now() && (
            <BellOff className="h-3 w-3 shrink-0 text-slate-400" aria-label="muted" />
          )}
          {chat.archived && (
            <Archive className="h-3 w-3 shrink-0 text-slate-400" aria-label="archived" />
          )}
        </div>
        <p
          className={cn(
            'truncate text-xs',
            unread > 0
              ? 'font-medium text-slate-700 dark:text-slate-200'
              : 'text-slate-500 dark:text-slate-400',
          )}
        >
          {preview ?? fallbackSubtitle}
        </p>
      </div>
      {unread > 0 && (
        <span
          className="ml-2 inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[10px] font-semibold text-white"
          aria-label={`${unread} unread message${unread === 1 ? '' : 's'}`}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </NavLink>
  );
}
