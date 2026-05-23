import { format, isToday, isYesterday } from 'date-fns';

function labelFor(date) {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, MMM d');
}

export default function DateSeparator({ date }) {
  return (
    <div className="my-3 flex items-center justify-center">
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {labelFor(date)}
      </span>
    </div>
  );
}
