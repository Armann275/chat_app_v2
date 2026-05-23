import { cn } from '@/utils/cn';
import Avatar from '@/components/ui/Avatar';

export default function MentionAutocomplete({ matches, activeIndex, onPick }) {
  if (matches.length === 0) return null;
  return (
    <ul className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
      {matches.map((user, idx) => (
        <li key={user.id}>
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(user);
            }}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm',
              idx === activeIndex
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                : 'hover:bg-slate-100 dark:hover:bg-slate-700',
            )}
          >
            <Avatar src={user.avatarUrl} name={user.username} size="xs" />
            <span className="font-medium">{user.username}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
