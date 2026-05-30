import { toast } from 'sonner';
import { Check, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  useJoinRequestsQuery,
  useApproveJoinMutation,
  useRejectJoinMutation,
} from '@/queries/joinRequest.queries';

export default function JoinRequestsModal({ chatId, open, onClose }) {
  const requestsQuery = useJoinRequestsQuery(chatId, { enabled: open });
  const approve = useApproveJoinMutation(chatId);
  const reject = useRejectJoinMutation(chatId);

  const handleApprove = async (userId, username) => {
    try {
      await approve.mutateAsync(userId);
      toast.success(`${username} approved`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not approve');
    }
  };

  const handleReject = async (userId, username) => {
    try {
      await reject.mutateAsync(userId);
      toast(`${username} rejected`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not reject');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pending join requests" size="lg">
      {requestsQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : (requestsQuery.data ?? []).length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
          No pending requests.
        </p>
      ) : (
        <ul className="space-y-2">
          {requestsQuery.data.map((req) => (
            <li
              key={req.userId}
              className="flex items-center gap-3 rounded-md border border-slate-200 p-2 dark:border-slate-800"
            >
              <Avatar src={req.user?.avatarUrl} name={req.user?.username} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {req.user?.username}
                </p>
                {req.message && (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    “{req.message}”
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  {new Date(req.requestedAt).toLocaleString()}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleApprove(req.userId, req.user?.username)}
                disabled={approve.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReject(req.userId, req.user?.username)}
                disabled={reject.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
