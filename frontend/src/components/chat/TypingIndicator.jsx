import { useMemo } from 'react';
import { useSocketStore, selectTypingUserIds } from '@/stores/socketStore';
import { useAuthStore } from '@/stores/authStore';

function labelFor(usernames, count) {
  if (count === 0) return null;
  // Fall back to a generic label if we can't resolve names (e.g. member list
  // not loaded yet) so the indicator still shows.
  if (usernames.length === 0) {
    return count === 1 ? 'Someone is typing' : `${count} people are typing`;
  }
  if (usernames.length === 1) return `${usernames[0]} is typing`;
  if (usernames.length === 2) {
    return `${usernames[0]} and ${usernames[1]} are typing`;
  }
  return `${usernames.length} people are typing`;
}

export default function TypingIndicator({ chat }) {
  const typingSet = useSocketStore(selectTypingUserIds(chat.id));
  const meId = useAuthStore((s) => s.user?.id);

  const others = useMemo(
    () => Array.from(typingSet ?? []).filter((id) => id !== meId),
    [typingSet, meId],
  );

  const usernames = useMemo(() => {
    const memberById = new Map();
    for (const m of chat.members ?? []) memberById.set(m.userId, m.user);
    return others.map((id) => memberById.get(id)?.username).filter(Boolean);
  }, [others, chat.members]);

  if (others.length === 0) return null;

  const label = labelFor(usernames, others.length);
  if (!label) return null;

  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-500 dark:text-slate-400"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s] dark:bg-slate-500" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s] dark:bg-slate-500" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" />
      </span>
      <span className="truncate italic">{label}…</span>
    </div>
  );
}
