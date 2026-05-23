import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { useSearchUsersQuery } from '@/queries/user.queries';
import { useCreateDirectChatMutation } from '@/queries/chat.queries';
import { useSendFriendRequestMutation } from '@/queries/friend.queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuthStore } from '@/stores/authStore';

export default function NewChatModal({ open, onClose }) {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 250);
  const searchQuery = useSearchUsersQuery(debounced);
  const createDirectMutation = useCreateDirectChatMutation();
  const sendFriendRequestMutation = useSendFriendRequestMutation();

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const sendFriendRequest = async (userId) => {
    try {
      await sendFriendRequestMutation.mutateAsync(userId);
      toast.success('Friend request sent');
      handleClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not send friend request.');
    }
  };

  const handlePick = async (userId) => {
    try {
      const chat = await createDirectMutation.mutateAsync(userId);
      handleClose();
      navigate(`/chats/${chat.id}`);
    } catch (err) {
      const code = err?.response?.data?.code;
      const message =
        err?.response?.data?.message ?? 'Could not start chat. Please try again.';
      if (code === 'FORBIDDEN') {
        toast.error(message, {
          action: {
            label: 'Send friend request',
            onClick: () => sendFriendRequest(userId),
          },
        });
        return;
      }
      toast.error(message);
    }
  };

  const results = (searchQuery.data ?? []).filter((u) => u.id !== me?.id);

  return (
    <Modal open={open} onClose={handleClose} title="Start a direct chat">
      <div className="space-y-3">
        <Input
          placeholder="Search by username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="min-h-[10rem] max-h-72 overflow-y-auto">
          {debounced.length === 0 ? (
            <p className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
              <Search className="h-4 w-4" /> Type a username to search.
            </p>
          ) : searchQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner />
            </div>
          ) : searchQuery.isError ? (
            <p className="py-6 text-sm text-red-600">
              Could not search. Please try again.
            </p>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No users match &ldquo;{debounced}&rdquo;.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(user.id)}
                    disabled={createDirectMutation.isPending}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-800"
                  >
                    <Avatar src={user.avatarUrl} name={user.username} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {user.username}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
