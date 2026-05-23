import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessagesSquare, Plus, Users, UserPlus, X, Map as MapIcon } from 'lucide-react';
import ChatList from '@/components/chat/ChatList';
import RequestChatsList from '@/components/chat/RequestChatsList';
import NewChatModal from '@/components/chat/NewChatModal';
import NewGroupModal from '@/components/chat/NewGroupModal';
import { useRequestChatsQuery } from '@/queries/chat.queries';
import { useUiStore } from '@/stores/uiStore';
import { cn } from '@/utils/cn';

export default function Sidebar() {
  const [directOpen, setDirectOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [tab, setTab] = useState('chats');
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const closeSidebar = useUiStore((s) => s.closeSidebar);
  const location = useLocation();

  const requestsQuery = useRequestChatsQuery();
  const requestCount = requestsQuery.data?.length ?? 0;

  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/40 transition-opacity md:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-900',
          'md:static md:z-0 md:translate-x-0 md:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={typeof window !== 'undefined' && window.innerWidth < 768 ? !sidebarOpen : undefined}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Chats
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setDirectOpen(true)}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="New direct chat"
              title="New direct chat"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setGroupOpen(true)}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="New group chat"
              title="New group chat"
            >
              <Users className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={closeSidebar}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Close chats"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-1 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setTab('chats')}
            className={cn(
              'flex-1 rounded px-2 py-1 text-xs font-medium transition',
              tab === 'chats'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            Chats
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-1 text-xs font-medium transition',
              tab === 'requests'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
          >
            Requests
            {requestCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[10px] font-semibold text-white">
                {requestCount}
              </span>
            )}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === 'chats' ? <ChatList /> : <RequestChatsList />}
        </div>

        <Link
          to="/friends"
          className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <UserPlus className="h-4 w-4" />
          Friends
        </Link>
        <Link
          to="/map"
          className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <MapIcon className="h-4 w-4" />
          Map
        </Link>

        <NewChatModal open={directOpen} onClose={() => setDirectOpen(false)} />
        <NewGroupModal open={groupOpen} onClose={() => setGroupOpen(false)} />
      </aside>
    </>
  );
}
