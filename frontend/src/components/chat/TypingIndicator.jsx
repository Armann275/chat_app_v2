import { useMemo } from 'react';
import { useSocketStore, selectTypingUserIds } from '@/stores/socketStore';
import { useAuthStore } from '@/stores/authStore';

function labelFor(usernames) {
  if (usernames.length === 0) return null;
  if (usernames.length === 1) return `${usernames[0]} is typing…`;
  if (usernames.length === 2) return `${usernames[0]} and ${usernames[1]} are typing…`;
  return `${usernames.length} people are typing…`;
}

export default function TypingIndicator({ chat }) {
  const typingSet = useSocketStore(selectTypingUserIds(chat.id));
  const meId = useAuthStore((s) => s.user?.id);

  const others = useMemo(
    () => Array.from(typingSet ?? []).filter((id) => id !== meId),
    [typingSet, meId],
  );
  if (others.length === 0) return null;

  const memberById = new Map();
  for (const m of chat.members ?? []) memberById.set(m.userId, m.user);

  const usernames = others
    .map((id) => memberById.get(id)?.username)
    .filter(Boolean);
  if (usernames.length === 0) return null;

  return (
    <div className="px-4 py-1 text-xs text-slate-500 dark:text-slate-400">
      {labelFor(usernames)}
    </div>
  );
}
