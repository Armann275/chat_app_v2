import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import Button from '@/components/ui/Button';
import FriendsList from '@/components/friend/FriendsList';
import IncomingRequestsList from '@/components/friend/IncomingRequestsList';
import OutgoingRequestsList from '@/components/friend/OutgoingRequestsList';
import AddFriendModal from '@/components/friend/AddFriendModal';
import {
  useIncomingFriendRequestsQuery,
  useOutgoingFriendRequestsQuery,
} from '@/queries/friend.queries';
import { cn } from '@/utils/cn';

const TABS = [
  { id: 'friends', label: 'Friends' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Outgoing' },
];

export default function FriendsPage() {
  const [tab, setTab] = useState('friends');
  const [addOpen, setAddOpen] = useState(false);

  const incomingQuery = useIncomingFriendRequestsQuery();
  const outgoingQuery = useOutgoingFriendRequestsQuery();

  const incomingCount = incomingQuery.data?.length ?? 0;
  const outgoingCount = outgoingQuery.data?.length ?? 0;

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Friends
        </h1>
        <Button type="button" onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add friend
        </Button>
      </div>

      <div className="mb-4 flex gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((t) => {
          const count = t.id === 'incoming'
            ? incomingCount
            : t.id === 'outgoing'
              ? outgoingCount
              : null;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition',
                active
                  ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300'
                  : 'text-slate-600 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-slate-800/60',
              )}
            >
              {t.label}
              {count !== null && count > 0 && (
                <span className="rounded-full bg-indigo-500/10 px-1.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        {tab === 'friends' && <FriendsList />}
        {tab === 'incoming' && <IncomingRequestsList />}
        {tab === 'outgoing' && <OutgoingRequestsList />}
      </div>

      <AddFriendModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
