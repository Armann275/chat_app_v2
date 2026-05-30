import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { MoreVertical, Ban, Flag, ShieldOff } from 'lucide-react';
import { useBlockUserMutation, useUnblockUserMutation, useBlockedListQuery } from '@/queries/block.queries';
import ReportUserDialog from '@/components/settings/ReportUserDialog';

export default function DirectChatActionsMenu({ otherUserId, otherUsername }) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const containerRef = useRef(null);
  const blockMutation = useBlockUserMutation();
  const unblockMutation = useUnblockUserMutation();
  const blockedQuery = useBlockedListQuery({ enabled: open });

  const isBlocked = blockedQuery.data?.some((b) => b.user?.id === otherUserId);

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

  const handleBlock = async () => {
    setOpen(false);
    try {
      await blockMutation.mutateAsync(otherUserId);
      toast.success(`Blocked ${otherUsername ?? 'user'}`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not block user.');
    }
  };

  const handleUnblock = async () => {
    setOpen(false);
    try {
      await unblockMutation.mutateAsync(otherUserId);
      toast.success(`Unblocked ${otherUsername ?? 'user'}`);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not unblock user.');
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {isBlocked ? (
            <button
              type="button"
              onClick={handleUnblock}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ShieldOff className="h-4 w-4" />
              Unblock user
            </button>
          ) : (
            <button
              type="button"
              onClick={handleBlock}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Ban className="h-4 w-4" />
              Block user
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setReportOpen(true);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Flag className="h-4 w-4" />
            Report user
          </button>
        </div>
      )}
      <ReportUserDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        userId={otherUserId}
        username={otherUsername}
      />
    </div>
  );
}
