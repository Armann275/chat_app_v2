import { useEffect, useRef, useState } from 'react';
import { Archive, ArchiveRestore, Bell, BellOff, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useChatPreferencesQuery,
  useUpdateChatPreferencesMutation,
} from '@/queries/preferences.queries';

const MUTE_PRESETS = [
  { label: '1 hour', hours: 1 },
  { label: '8 hours', hours: 8 },
  { label: '1 day', hours: 24 },
  { label: '1 week', hours: 24 * 7 },
];

export default function ChatPrefsMenu({ chatId }) {
  const prefsQuery = useChatPreferencesQuery(chatId);
  const updateMutation = useUpdateChatPreferencesMutation(chatId);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const prefs = prefsQuery.data ?? { mutedUntil: null, archived: false };
  const isMuted = prefs.mutedUntil && new Date(prefs.mutedUntil).getTime() > Date.now();

  const apply = async (patch, msg) => {
    try {
      await updateMutation.mutateAsync(patch);
      if (msg) toast.success(msg);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not update preferences.');
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="Chat preferences"
        title="Chat preferences"
      >
        <Settings2 className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-56 rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Notifications
          </div>
          {isMuted ? (
            <button
              type="button"
              onClick={() => apply({ mutedUntil: null }, 'Notifications resumed')}
              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Bell className="h-4 w-4" /> Unmute
            </button>
          ) : (
            MUTE_PRESETS.map(({ label, hours }) => (
              <button
                key={hours}
                type="button"
                onClick={() => {
                  const until = new Date(Date.now() + hours * 3600 * 1000).toISOString();
                  apply({ mutedUntil: until }, `Muted for ${label}`);
                }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <BellOff className="h-4 w-4" /> Mute for {label}
              </button>
            ))
          )}
          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            onClick={() =>
              apply(
                { archived: !prefs.archived },
                prefs.archived ? 'Chat unarchived' : 'Chat archived',
              )
            }
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {prefs.archived ? (
              <>
                <ArchiveRestore className="h-4 w-4" /> Unarchive
              </>
            ) : (
              <>
                <Archive className="h-4 w-4" /> Archive
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
