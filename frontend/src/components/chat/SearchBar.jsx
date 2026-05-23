import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import SearchModal from './SearchModal';

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);

export default function SearchBar() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
        aria-label="Search messages"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Search…</span>
        <span className="hidden rounded bg-slate-200 px-1 text-[10px] font-medium text-slate-600 md:inline dark:bg-slate-700 dark:text-slate-300">
          {isMac ? '⌘K' : 'Ctrl K'}
        </span>
      </button>
      <SearchModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
