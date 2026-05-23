import { cn } from '@/utils/cn';

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

export default function Spinner({ size = 'md', className, label = 'Loading' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-slate-300 border-t-indigo-600 dark:border-slate-700 dark:border-t-indigo-400',
        sizes[size],
        className,
      )}
    />
  );
}
