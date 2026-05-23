import { Users, User, Settings, Pin } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import PresenceDot from '@/components/chat/PresenceDot';
import ChatPrefsMenu from '@/components/chat/ChatPrefsMenu';
import { useAuthStore } from '@/stores/authStore';

function directOther(chat, myId) {
  return chat.members?.find((m) => m.userId !== myId);
}

export default function ChatHeader({ chat, onOpenMembers, onOpenPins, pinnedCount = 0 }) {
  const me = useAuthStore((s) => s.user);

  const isGroup = chat.type === 'group';
  const other = isGroup ? null : directOther(chat, me?.id);
  const title = isGroup
    ? chat.name ?? 'Untitled group'
    : other?.user?.username ?? 'Direct chat';
  const memberCount = chat.members?.length ?? 0;
  const Icon = isGroup ? Users : User;
  const subtitle = isGroup
    ? `${memberCount} member${memberCount === 1 ? '' : 's'}`
    : 'Direct chat';

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative">
          <Avatar src={other?.user?.avatarUrl} name={title} size="md" />
          {other && (
            <span className="absolute bottom-0 right-0">
              <PresenceDot userId={other.userId} />
            </span>
          )}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            <Icon className="h-3.5 w-3.5 opacity-70" />
            <span className="truncate">{title}</span>
          </h2>
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <ChatPrefsMenu chatId={chat.id} />
        {onOpenPins && (
          <Button variant="secondary" size="sm" onClick={onOpenPins}>
            <Pin className="h-4 w-4" />
            <span className="hidden sm:inline">
              Pinned{pinnedCount > 0 ? ` · ${pinnedCount}` : ''}
            </span>
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={onOpenMembers}>
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Members</span>
        </Button>
      </div>
    </header>
  );
}
