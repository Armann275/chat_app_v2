import { toast } from 'sonner';
import { Send, X } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  useOutgoingFriendRequestsQuery,
  useCancelFriendRequestMutation,
} from '@/queries/friend.queries';

export default function OutgoingRequestsList() {
  const requestsQuery = useOutgoingFriendRequestsQuery();
  const cancelMutation = useCancelFriendRequestMutation();

  const handleCancel = async (id) => {
    try {
      await cancelMutation.mutateAsync(id);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not cancel request.');
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
        <Send className="h-8 w-8 opacity-50" />
        <p className="text-sm">No pending outgoing requests.</p>
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
              Pending response
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleCancel(req.id)}
            disabled={cancelMutation.isPending}
            aria-label="Cancel request"
          >
            <X className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
