import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  useVoteMutation,
  useUnvoteMutation,
  useClosePollMutation,
} from '@/queries/poll.queries';
import { useAuthStore } from '@/stores/authStore';

function totalVotes(poll) {
  return poll.options.reduce((sum, o) => sum + (o.votes ?? 0), 0);
}

function isExpired(poll) {
  if (poll.closedAt) return true;
  if (poll.closesAt && new Date(poll.closesAt).getTime() <= Date.now()) return true;
  return false;
}

export default function PollCard({ poll, chat }) {
  const me = useAuthStore((s) => s.user);
  const voteMutation = useVoteMutation();
  const unvoteMutation = useUnvoteMutation();
  const closeMutation = useClosePollMutation();

  const closed = isExpired(poll);
  const total = totalVotes(poll);
  const myMembership = chat?.members?.find((m) => m.userId === me?.id);
  const canClose =
    !closed && (poll.createdBy === me?.id || myMembership?.role === 'admin');

  const handleVote = async (option) => {
    if (closed) return;
    try {
      if (option.mine && poll.multiChoice) {
        await unvoteMutation.mutateAsync({ pollId: poll.id, optionId: option.id });
      } else {
        await voteMutation.mutateAsync({ pollId: poll.id, optionId: option.id });
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not vote');
    }
  };

  const handleClose = async () => {
    try {
      await closeMutation.mutateAsync(poll.id);
      toast.success('Poll closed');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not close poll');
    }
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {poll.question}
        </h4>
        {closed && (
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <Lock className="h-3 w-3" /> closed
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const pct = total > 0 ? Math.round((option.votes / total) * 100) : 0;
          return (
            <button
              key={option.id}
              type="button"
              disabled={closed || voteMutation.isPending || unvoteMutation.isPending}
              onClick={() => handleVote(option)}
              className={`relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed
                ${option.mine
                  ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40'
                  : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800'}`}
            >
              <span
                className={`absolute inset-y-0 left-0 ${option.mine ? 'bg-indigo-200/60 dark:bg-indigo-900/40' : 'bg-slate-100 dark:bg-slate-800/60'}`}
                style={{ width: `${pct}%` }}
                aria-hidden="true"
              />
              <span className="relative flex items-center justify-between gap-2">
                <span className="truncate">
                  {option.text} {option.mine && <span className="text-xs">✓</span>}
                </span>
                <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">
                  {option.votes} · {pct}%
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {total} vote{total === 1 ? '' : 's'}
          {poll.multiChoice ? ' · multi-choice' : ''}
        </span>
        {canClose && (
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
