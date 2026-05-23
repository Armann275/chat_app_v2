import { toast } from 'sonner';
import { Check, Inbox, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  useIncomingFriendRequestsQuery,
  useAcceptFriendRequestMutation,
  useRejectFriendRequestMutation,
} from '@/queries/friend.queries';

export default function IncomingRequestsList() {
  const requestsQuery = useIncomingFriendRequestsQuery();
  const acceptMutation = useAcceptFriendRequestMutation();
  const rejectMutation = useRejectFriendRequestMutation();

  const handleAccept = async (id) => {
    try {
      await acceptMutation.mutateAsync(id);
      toast.success('Friend request accepted');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not accept request.');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectMutation.mutateAsync(id);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not reject request.');
    }
  };

  if (requestsQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (requestsQuery.isError) {
    return <p className="py-6 text-sm text-red-600">Could not load requests.</p>;
  }

  const requests = requestsQuery.data ?? [];
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-500 dark:text-slate-400">
        <Inbox className="h-8 w-8 opacity-50" />
        <p className="text-sm">No incoming friend requests.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
      {requests.map((req) => (
        <li key={req.id} className="flex items-center gap-3 py-3">
          <Avatar src={req.user?.avatarUrl} name={req.user?.username} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {req.user?.username ?? 'Unknown user'}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {req.user?.email ?? '—'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => handleAccept(req.id)}
              disabled={acceptMutation.isPending}
              aria-label="Accept"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleReject(req.id)}
              disabled={rejectMutation.isPending}
              aria-label="Reject"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
