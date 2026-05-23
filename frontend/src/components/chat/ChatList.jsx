import { useState } from 'react';
import { Archive, MessagesSquare } from 'lucide-react';
import Skeleton from '@/components/ui/Skeleton';
import { useChatsQuery } from '@/queries/chat.queries';
import ChatListItem from './ChatListItem';
import { cn } from '@/utils/cn';

function ChatListSkeleton() {
  return (
    <ul className="flex flex-col gap-1 p-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-md px-3 py-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ChatList() {
  const chatsQuery = useChatsQuery();
  const [showArchived, setShowArchived] = useState(false);

  if (chatsQuery.isLoading) {
    return <ChatListSkeleton />;
  }
  if (chatsQuery.isError) {
    return (
      <p className="px-4 py-6 text-center text-sm text-red-600">
        Could not load chats. Refresh and try again.
      </p>
    );
  }

  const allChats = chatsQuery.data ?? [];
  const archivedCount = allChats.filter((c) => c.archived).length;
  const visible = allChats.filter((c) => (showArchived ? c.archived : !c.archived));

  if (allChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500 dark:text-slate-400">
        <MessagesSquare className="h-8 w-8 opacity-50" />
        <p className="text-sm">No chats yet.</p>
        <p className="text-xs">Start a new conversation to get going.</p>
      </div>
    );
  }

  return (
    <div>
      <ul className="flex flex-col gap-1 p-2">
        {visible.map((chat) => (
          <li key={chat.id}>
            <ChatListItem chat={chat} />
          </li>
        ))}
      </ul>
      {archivedCount > 0 && (
        <button
          type="button"
          onClick={() => setShowArchived((v) => !v)}
          className={cn(
            'flex w-full items-center justify-center gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800',
          )}
        >
          <Archive className="h-3.5 w-3.5" />
          {showArchived ? 'Show active chats' : `Show archived (${archivedCount})`}
        </button>
      )}
      {showArchived && visible.length === 0 && (
        <p className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
          No archived chats.
        </p>
      )}
    </div>
  );
}
