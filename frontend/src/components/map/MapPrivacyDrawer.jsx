import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import {
  useMapPrivacyQuery,
  useSetMapPrivacyMutation,
} from '@/queries/map.queries';
import { useFriendsQuery } from '@/queries/friend.queries';

const OPTIONS = [
  {
    value: 'nobody',
    label: 'Ghost Mode',
    description: 'Nobody can see your location on the map.',
  },
  {
    value: 'friends',
    label: 'All friends',
    description: 'Anyone in your friends list can see your location.',
  },
  {
    value: 'specific_friends',
    label: 'Only selected friends',
    description: 'Choose individual friends who can see your location.',
  },
];

export default function MapPrivacyDrawer({ open, onClose }) {
  const privacyQuery = useMapPrivacyQuery({ enabled: open });
  const friendsQuery = useFriendsQuery({ enabled: open });
  const setPrivacy = useSetMapPrivacyMutation();
  const [mode, setMode] = useState('nobody');
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (privacyQuery.data) {
      setMode(privacyQuery.data.mode);
      setSelected(privacyQuery.data.visibleFriendIds ?? []);
    }
  }, [privacyQuery.data]);

  if (!open) return null;

  const toggleFriend = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const onSave = async () => {
    try {
      await setPrivacy.mutateAsync({
        mode,
        visibleFriendIds: mode === 'specific_friends' ? selected : [],
      });
      toast.success('Map privacy updated');
      onClose?.();
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not update privacy.';
      toast.error(message);
    }
  };

  return (
    <div
      className="fixed inset-0 flex justify-end bg-slate-900/40"
      style={{ zIndex: 10000 }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <aside className="flex h-full w-full max-w-sm flex-col bg-white shadow-xl dark:bg-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Who can see me on the map
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Close
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {privacyQuery.isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : (
            <fieldset className="space-y-2">
              {OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 hover:border-slate-200 dark:hover:border-slate-700"
                >
                  <input
                    type="radio"
                    name="map-privacy"
                    value={opt.value}
                    checked={mode === opt.value}
                    onChange={() => setMode(opt.value)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {opt.description}
                    </p>
                  </div>
                </label>
              ))}
            </fieldset>
          )}

          {mode === 'specific_friends' && (
            <div className="mt-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Pick friends
              </h3>
              {friendsQuery.isLoading ? (
                <div className="flex justify-center py-4">
                  <Spinner />
                </div>
              ) : (friendsQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  You have no friends yet.
                </p>
              ) : (
                <ul className="space-y-1">
                  {friendsQuery.data.map((f) => (
                    <li key={f.id}>
                      <label className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={selected.includes(f.id)}
                          onChange={() => toggleFriend(f.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                        />
                        <Avatar user={f} size="sm" />
                        <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                          {f.username}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={onSave} disabled={setPrivacy.isPending}>
            {setPrivacy.isPending ? 'Saving…' : 'Save'}
          </Button>
        </footer>
      </aside>
    </div>
  );
}
