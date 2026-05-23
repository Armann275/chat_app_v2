import { format } from 'date-fns';
import { X, PinOff } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { usePinsQuery, useUnpinMutation } from '@/queries/pin.queries';
import { cn } from '@/utils/cn';

export default function PinsDrawer({ chat, open, onClose }) {
  const pinsQuery = usePinsQuery(chat.id, { enabled: open });
  const unpinMutation = useUnpinMutation(chat.id);

  const pins = pinsQuery.data ?? [];

  const memberById = new Map();
  for (const m of chat.members ?? []) {
    if (m.user) memberById.set(m.userId, m.user);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-slate-200 bg-white shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-900',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Pinned messages
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Close pinned messages"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {pinsQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner />
            </div>
          ) : pins.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No pinned messages yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pins.map((pin) => {
                const sender = memberById.get(pin.message?.senderId);
                return (
                  <li
                    key={pin.messageId}
                    className="rounded-md border border-slate-200 p-2 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                          {sender?.username ?? 'Unknown'}
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-700 dark:text-slate-200">
                          {pin.message?.deletedAt
                            ? <em className="opacity-60">Message deleted</em>
                            : pin.message?.content}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                          Pinned {format(new Date(pin.pinnedAt), 'MMM d, HH:mm')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => unpinMutation.mutate(pin.messageId)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                        aria-label="Unpin"
                        disabled={unpinMutation.isPending}
                      >
                        <PinOff className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
