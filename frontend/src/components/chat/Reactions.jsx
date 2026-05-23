import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/stores/authStore';

function groupReactions(reactions, myId) {
  const groups = new Map();
  for (const r of reactions ?? []) {
    if (!groups.has(r.emoji)) groups.set(r.emoji, { emoji: r.emoji, count: 0, mine: false });
    const entry = groups.get(r.emoji);
    entry.count += 1;
    if (r.userId === myId) entry.mine = true;
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count);
}

export default function Reactions({ message, onToggle, align = 'start' }) {
  const meId = useAuthStore((s) => s.user?.id);
  const grouped = useMemo(
    () => groupReactions(message.reactions, meId),
    [message.reactions, meId],
  );
  if (grouped.length === 0) return null;

  return (
    <div className={cn('mt-1 flex flex-wrap gap-1', align === 'end' && 'justify-end')}>
      {grouped.map(({ emoji, count, mine }) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onToggle?.(emoji, mine)}
          className={cn(
            'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition',
            mine
              ? 'border-indigo-400 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-200'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
          )}
          aria-pressed={mine}
        >
          <span>{emoji}</span>
          <span>{count}</span>
        </button>
      ))}
    </div>
  );
}
