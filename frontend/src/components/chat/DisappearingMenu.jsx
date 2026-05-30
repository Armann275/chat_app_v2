import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Hourglass, Check } from 'lucide-react';
import { useSetDisappearingMutation } from '@/queries/chat.queries';

const OPTIONS = [
  { value: null, label: 'Off' },
  { value: 60 * 60, label: '1 hour' },
  { value: 60 * 60 * 24, label: '1 day' },
  { value: 60 * 60 * 24 * 7, label: '1 week' },
  { value: 60 * 60 * 24 * 30, label: '30 days' },
];

export function formatDisappearing(seconds) {
  if (!seconds) return null;
  const match = OPTIONS.find((o) => o.value === seconds);
  if (match) return match.label;
  if (seconds % (60 * 60 * 24) === 0) return `${seconds / (60 * 60 * 24)} days`;
  if (seconds % (60 * 60) === 0) return `${seconds / (60 * 60)} hours`;
  return `${seconds}s`;
}

export default function DisappearingMenu({ chatId, disappearingSeconds, canEdit = true, label }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const setMutation = useSetDisappearingMutation(chatId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = disappearingSeconds ?? null;
  const buttonLabel = label ?? (current ? `Disappearing · ${formatDisappearing(current)}` : 'Disappearing off');

  const choose = async (value) => {
    setOpen(false);
    if (value === current) return;
    try {
      await setMutation.mutateAsync(value);
      toast.success(value ? `Messages disappear after ${formatDisappearing(value)}` : 'Disappearing messages disabled');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not update setting.');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => canEdit && setOpen((v) => !v)}
        disabled={!canEdit}
        className="inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-default disabled:opacity-80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <Hourglass className="h-3.5 w-3.5" />
        {buttonLabel}
      </button>
      {open && canEdit && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => choose(opt.value)}
              disabled={setMutation.isPending}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <span>{opt.label}</span>
              {opt.value === current && <Check className="h-4 w-4 text-indigo-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
