import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, UserMinus, Users } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useFriendsQuery, useRemoveFriendMutation } from '@/queries/friend.queries';
import { useCreateDirectChatMutation } from '@/queries/chat.queries';

export default function FriendsList() {
  const navigate = useNavigate();
  const friendsQuery = useFriendsQuery();
  const removeMutation = useRemoveFriendMutation();
  const createDirectMutation = useCreateDirectChatMutation();

  const handleRemove = async (user) => {
    if (!window.confirm(`Remove ${user.username} from friends?`)) return;
    try {
      await removeMutation.mutateAsync(user.id);
      toast.success('Friend removed');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not remove friend.');
    }
  };

  const handleMessage = async (user) => {
    try {
      const chat = await createDirectMutation.mutateAsync(user.id);
      navigate(`/chats/${chat.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not open chat.');
    }
  };

  if (friendsQuery.isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (friendsQuery.isError) {
    return <p className="py-6 text-sm text-red-600">Could not load friends.</p>;
  }

  const friends = friendsQuery.data ?? [];
  if (friends.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-500 dark:text-slate-400">
        <Users className="h-8 w-8 opacity-50" />
        <p className="text-sm">You don&apos;t have any friends yet.</p>
        <p className="text-xs">Send a friend request to get started.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-slate-200 dark:divide-slate-800">
      {friends.map((user) => (
        <li key={user.id} className="flex items-center gap-3 py-3">
          <Avatar src={user.avatarUrl} name={user.username} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {user.username}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleMessage(user)}
              disabled={createDirectMutation.isPending}
              aria-label={`Message ${user.username}`}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() => handleRemove(user)}
              disabled={removeMutation.isPending}
              aria-label={`Remove ${user.username}`}
            >
              <UserMinus className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
