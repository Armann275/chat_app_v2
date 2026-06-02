import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, UserPlus, LogOut, Trash2, Shield, ShieldCheck, Pencil } from 'lucide-react';
import EditChatModal from '@/components/chat/EditChatModal';
import { toast } from 'sonner';
import Avatar from '@/components/ui/Avatar';
import PresenceDot from '@/components/chat/PresenceDot';
import PresenceStatus from '@/components/chat/PresenceStatus';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/stores/authStore';
import {
  useAddMembersMutation,
  useRemoveMemberMutation,
  useLeaveChatMutation,
  useSetMemberRoleMutation,
} from '@/queries/chat.queries';
import { useSearchUsersQuery } from '@/queries/user.queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { cn } from '@/utils/cn';

export default function MembersDrawer({ chat, open, onClose }) {
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.user);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 250);

  const addMutation = useAddMembersMutation(chat.id);
  const removeMutation = useRemoveMemberMutation(chat.id);
  const leaveMutation = useLeaveChatMutation();
  const roleMutation = useSetMemberRoleMutation(chat.id);
  const searchQuery = useSearchUsersQuery(debounced, { enabled: adding });

  const isGroup = chat.type === 'group' || chat.type === 'channel';
  const myMembership = chat.members?.find((m) => m.userId === me?.id);
  const iAmAdmin = myMembership?.role === 'admin';

  const handleRoleChange = async (member, role) => {
    try {
      await roleMutation.mutateAsync({ userId: member.userId, role });
      toast.success(`${member.user?.username} is now ${role}`);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not change role.';
      toast.error(message);
    }
  };

  const handleAdd = async (user) => {
    try {
      await addMutation.mutateAsync([user.id]);
      setQuery('');
      toast.success(`Added ${user.username}`);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not add member.';
      toast.error(message);
    }
  };

  const handleRemove = async (userId, username) => {
    try {
      await removeMutation.mutateAsync(userId);
      toast.success(`Removed ${username}`);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not remove member.';
      toast.error(message);
    }
  };

  const handleLeave = async () => {
    try {
      await leaveMutation.mutateAsync(chat.id);
      onClose();
      navigate('/');
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not leave chat.';
      toast.error(message);
    }
  };

  const existingIds = new Set((chat.members ?? []).map((m) => m.userId));
  const searchResults = (searchQuery.data ?? []).filter(
    (u) => u.id !== me?.id && !existingIds.has(u.id),
  );

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-slate-200 bg-white shadow-xl transition-transform dark:border-slate-800 dark:bg-slate-900',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        aria-hidden={!open}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Members
          </h3>
          <div className="flex items-center gap-1">
            {isGroup && iAmAdmin && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                aria-label="Edit chat"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Close members panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {chat.description && (
          <div className="border-b border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
            {chat.description}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <ul className="flex flex-col gap-1">
            {(chat.members ?? []).map((member) => {
              const isMe = member.userId === me?.id;
              const canRemove = isGroup && !isMe && iAmAdmin;
              return (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 rounded-md p-2"
                >
                  <span className="relative">
                    <Avatar src={member.user?.avatarUrl} name={member.user?.username} size="sm" />
                    {!isMe && (
                      <span className="absolute bottom-0 right-0">
                        <PresenceDot userId={member.userId} />
                      </span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      <span className="truncate">{member.user?.username}</span>
                      {isMe && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">(you)</span>
                      )}
                      {member.role === 'admin' && (
                        <Shield className="h-3 w-3 text-indigo-500" aria-label="admin" />
                      )}
                      {member.role === 'moderator' && (
                        <ShieldCheck className="h-3 w-3 text-sky-500" aria-label="moderator" />
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {member.user?.email}
                    </p>
                    {!isMe && (
                      <PresenceStatus
                        userId={member.userId}
                        lastSeenAt={member.user?.lastSeenAt}
                        className="block truncate text-xs text-slate-400 dark:text-slate-500"
                      />
                    )}
                  </div>
                  {isGroup && !isMe && iAmAdmin && (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member, e.target.value)}
                      disabled={roleMutation.isPending}
                      className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      aria-label={`Change role for ${member.user?.username}`}
                    >
                      <option value="member">member</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                  )}
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemove(member.userId, member.user?.username)}
                      disabled={removeMutation.isPending}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 dark:hover:bg-red-950/40"
                      aria-label={`Remove ${member.user?.username}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {isGroup && (
            <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              {adding ? (
                <div className="space-y-2">
                  <Input
                    placeholder="Search users by username"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                  <div className="max-h-48 overflow-y-auto">
                    {debounced.length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                        Type a username to add.
                      </p>
                    ) : searchQuery.isLoading ? (
                      <div className="flex items-center justify-center py-3">
                        <Spinner size="sm" />
                      </div>
                    ) : searchResults.length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                        No more matches.
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-1">
                        {searchResults.map((user) => (
                          <li key={user.id}>
                            <button
                              type="button"
                              onClick={() => handleAdd(user)}
                              disabled={addMutation.isPending}
                              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-800"
                            >
                              <Avatar src={user.avatarUrl} name={user.username} size="sm" />
                              <span className="truncate text-sm text-slate-900 dark:text-slate-100">
                                {user.username}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setAdding(false);
                      setQuery('');
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => setAdding(true)}
                  disabled={!iAmAdmin}
                  title={iAmAdmin ? undefined : 'Only admins can add members'}
                >
                  <UserPlus className="h-4 w-4" />
                  Add member
                </Button>
              )}
            </div>
          )}
        </div>

        {isGroup && (
          <div className="border-t border-slate-200 p-3 dark:border-slate-800">
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              onClick={handleLeave}
              disabled={leaveMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              {leaveMutation.isPending ? 'Leaving…' : 'Leave chat'}
            </Button>
          </div>
        )}
      </aside>
      <EditChatModal
        chat={chat}
        open={editing}
        onClose={() => setEditing(false)}
      />
    </>
  );
}
