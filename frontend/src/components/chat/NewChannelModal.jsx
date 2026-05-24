import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { useSearchUsersQuery } from '@/queries/user.queries';
import { useCreateChannelMutation } from '@/queries/chat.queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useAuthStore } from '@/stores/authStore';

export default function NewChannelModal({ open, onClose }) {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState([]);
  const debounced = useDebouncedValue(query.trim(), 250);
  const searchQuery = useSearchUsersQuery(debounced);
  const mutation = useCreateChannelMutation();

  const reset = () => {
    setName('');
    setDescription('');
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
    if (!trimmed) {
      toast.error('Channel name is required');
      return;
    }
    try {
      const chat = await mutation.mutateAsync({
        name: trimmed,
        description: description.trim() || undefined,
        memberIds: picked.map((u) => u.id),
      });
      handleClose();
      navigate(`/chats/${chat.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not create channel');
    }
  };

  const results = (searchQuery.data ?? []).filter(
    (u) => u.id !== me?.id && !picked.some((p) => p.id === u.id),
  );

  return (
    <Modal open={open} onClose={handleClose} title="New channel" size="lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            Name
          </span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Announcements"
            autoFocus
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            Description (optional)
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={3}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="What is this channel for?"
          />
        </label>

        <div>
          <p className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-200">
            Initial members (optional)
          </p>
          {picked.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {picked.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggle(u)}
                  className="flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200"
                >
                  {u.username}
                  <span>×</span>
                </button>
              ))}
            </div>
          )}
          <Input
            placeholder="Search users to add"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {debounced && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
              {searchQuery.isLoading ? (
                <div className="flex justify-center py-3">
                  <Spinner size="sm" />
                </div>
              ) : results.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-500 dark:text-slate-400">
                  No matches.
                </p>
              ) : (
                results.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggle(u)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Avatar src={u.avatarUrl} name={u.username} size="sm" />
                    <span>{u.username}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create channel'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
