import { Trash2, Plus, MessageSquare } from 'lucide-react';
import { cn } from '@/utils/cn';
import Spinner from '@/components/ui/Spinner';

export default function AISessionList({
  sessions,
  isLoading,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  creating,
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          AI Sessions
        </h2>
        <button
          type="button"
          onClick={onCreate}
          disabled={creating}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          title="Start a new session"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex justify-center py-6">
            <Spinner size="sm" />
          </div>
        )}

        {!isLoading && sessions?.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
            No sessions yet. Click &ldquo;New&rdquo; to start chatting.
          </p>
        )}

        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions?.map((s) => (
            <li
              key={s.id}
              className={cn(
                'group flex items-center gap-2 px-3 py-2.5 text-sm transition',
                activeId === s.id
                  ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-900/30 dark:text-indigo-100'
                  : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                <span className="truncate">{s.title ?? 'New conversation'}</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(s.id)}
                className="rounded p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"
                title="Delete session"
                aria-label="Delete session"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
