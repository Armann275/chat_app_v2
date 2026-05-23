import { NavLink } from 'react-router-dom';
import { Inbox } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Skeleton from '@/components/ui/Skeleton';
import { useRequestChatsQuery } from '@/queries/chat.queries';
import { cn } from '@/utils/cn';

function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-1 p-2">
      {Array.from({ length: 3 }).map((_, i) => (
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

export default function RequestChatsList() {
  const requestsQuery = useRequestChatsQuery();

  if (requestsQuery.isLoading) return <ListSkeleton />;
  if (requestsQuery.isError) {
    return (
      <p className="px-4 py-6 text-center text-sm text-red-600">
        Could not load chat requests.
      </p>
    );
  }

  const chats = requestsQuery.data ?? [];
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-slate-500 dark:text-slate-400">
        <Inbox className="h-8 w-8 opacity-50" />
        <p className="text-sm">No chat requests.</p>
        <p className="text-xs">
          When someone you don&apos;t know messages you, it&apos;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1 p-2">
      {chats.map((chat) => {
        const name = chat.otherUser?.username ?? 'Unknown user';
        return (
          <li key={chat.id}>
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
              <Avatar src={chat.otherUser?.avatarUrl} name={name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{name}</p>
                <p className="truncate text-xs text-amber-600 dark:text-amber-400">
                  Wants to chat — review request
                </p>
              </div>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}
