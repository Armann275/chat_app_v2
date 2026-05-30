import { Link } from 'react-router-dom';
import { format, isValid } from 'date-fns';
import { Star } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useStarredQuery, useUnstarMutation } from '@/queries/star.queries';

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  return isValid(date) ? format(date, 'MMM d, HH:mm') : '';
}

export default function StarredPage() {
  const starredQuery = useStarredQuery();
  const unstarMutation = useUnstarMutation();
  const messages = starredQuery.data ?? [];

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
        Starred messages
      </h1>

      {starredQuery.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : starredQuery.isError ? (
        <p className="mt-6 text-sm text-red-600">Could not load starred messages.</p>
      ) : messages.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          You haven&rsquo;t starred any messages yet. Use the action menu on a message to star it.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {messages.map(({ starredAt, message: m }) => (
            <li
              key={m.id}
              className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="whitespace-pre-wrap break-words text-sm text-slate-900 dark:text-slate-100">
                    {m.deletedAt
                      ? <em className="opacity-60">Message deleted</em>
                      : m.content}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatTimestamp(m.createdAt ?? starredAt)}</span>
                    <Link
                      to={`/chats/${m.chatId}`}
                      className="text-indigo-600 hover:underline dark:text-indigo-300"
                    >
                      Open chat
                    </Link>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => unstarMutation.mutate(m.id)}
                  className="rounded p-1 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                  aria-label="Unstar"
                  disabled={unstarMutation.isPending}
                >
                  <Star className="h-4 w-4 fill-amber-400" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
