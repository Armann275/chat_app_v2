import { toast } from 'sonner';
import { Ban } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useBlockedListQuery, useUnblockUserMutation } from '@/queries/block.queries';

export default function BlockedUsersSection() {
  const query = useBlockedListQuery();
  const unblockMutation = useUnblockUserMutation();

  const handleUnblock = async (userId, username) => {
    try {
      await unblockMutation.mutateAsync(userId);
      toast.success(`Unblocked ${username ?? 'user'}`);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not unblock user.';
      toast.error(message);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <Ban className="h-4 w-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Blocked users
        </h2>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-red-600">Could not load blocked users.</p>
      ) : !query.data || query.data.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          You haven't blocked anyone.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {query.data.map((entry) => (
            <li key={entry.user?.id} className="flex items-center gap-3 py-2">
              <Avatar user={entry.user} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {entry.user?.username ?? 'Unknown'}
                </p>
                {entry.blockedAt && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    Blocked {new Date(entry.blockedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleUnblock(entry.user?.id, entry.user?.username)}
                disabled={unblockMutation.isPending}
              >
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
