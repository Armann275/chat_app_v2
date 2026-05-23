import { NavLink } from 'react-router-dom';
import { Users, User, BellOff, Archive } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import PresenceDot from '@/components/chat/PresenceDot';
import { cn } from '@/utils/cn';

function chatDisplayName(chat) {
  if (chat.type === 'group') return chat.name ?? 'Untitled group';
  return chat.otherUser?.username ?? 'Direct chat';
}

export default function ChatListItem({ chat }) {
  const Icon = chat.type === 'group' ? Users : User;
  const title = chatDisplayName(chat);
  const isDirect = chat.type === 'direct';

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
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {isDirect ? chat.otherUser?.email ?? 'Direct chat' : 'Group chat'}
        </p>
      </div>
    </NavLink>
  );
}
