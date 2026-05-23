import { useSocketStore, selectIsOnline } from '@/stores/socketStore';
import { cn } from '@/utils/cn';

const sizes = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
};

export default function PresenceDot({ userId, size = 'sm', className }) {
  const online = useSocketStore(selectIsOnline(userId));
  if (!online) return null;
  return (
    <span
      aria-label="online"
      className={cn(
        'inline-block rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900',
        sizes[size],
        className,
      )}
    />
  );
}
