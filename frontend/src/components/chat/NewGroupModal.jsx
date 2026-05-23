import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { useSearchUsersQuery } from '@/queries/user.queries';
import { useCreateGroupChatMutation } from '@/queries/chat.queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuthStore } from '@/stores/authStore';

export default function NewGroupModal({ open, onClose }) {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState([]);
  const debounced = useDebouncedValue(query.trim(), 250);
  const searchQuery = useSearchUsersQuery(debounced);
  const createMutation = useCreateGroupChatMutation();

  const reset = () => {
    setName('');
    setNameError(null);
    setQuery('');
    setPicked([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const toggle = (user) => {
    setPicked((curr) =>
      curr.some((u) => u.id === user.id)
        ? curr.filter((u) => u.id !== user.id)
        : [...curr, user],
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setNameError('Group name is required');
      return;
    }
    if (trimmed.length > 100) {
      setNameError('Group name must be 100 characters or fewer');
      return;
    }
    if (picked.length === 0) {
      toast.error('Pick at least one member.');
      return;
    }

    try {
      const chat = await createMutation.mutateAsync({
        name: trimmed,
        memberIds: picked.map((u) => u.id),
      });
      handleClose();
      navigate(`/chats/${chat.id}`);
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not create group. Please try again.';
      toast.error(message);
    }
  };

  const results = (searchQuery.data ?? []).filter(
    (u) => u.id !== me?.id && !picked.some((p) => p.id === u.id),
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="New group chat"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating…' : 'Create group'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Group name"
          placeholder="e.g. Weekend trip"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          error={nameError ?? undefined}
          maxLength={100}
          autoFocus
        />

        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Members ({picked.length})
          </p>
          {picked.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {picked.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
                >
                  <span>{user.username}</span>
                  <button
                    type="button"
                    onClick={() => toggle(user)}
                    className="rounded-full p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-900"
                    aria-label={`Remove ${user.username}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Input
          placeholder="Search users by username"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="max-h-56 min-h-[6rem] overflow-y-auto">
          {debounced.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              Type a username to add members.
            </p>
          ) : searchQuery.isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Spinner />
            </div>
          ) : searchQuery.isError ? (
            <p className="py-4 text-sm text-red-600">Could not search users.</p>
          ) : results.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              No more matches.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {results.map((user) => (
                <li key={user.id}>
                  <button
                    type="button"
                    onClick={() => toggle(user)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
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
      </form>
    </Modal>
  );
}
