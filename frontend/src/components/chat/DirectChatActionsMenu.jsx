import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MoreVertical, Ban, Flag, ShieldOff, Trash2, UserX } from 'lucide-react';
import { useBlockUserMutation, useUnblockUserMutation, useBlockedListQuery } from '@/queries/block.queries';
import { useDeleteDirectChatMutation } from '@/queries/chat.queries';
import ReportUserDialog from '@/components/settings/ReportUserDialog';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function DirectChatActionsMenu({ chatId, otherUserId, otherUsername }) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // null when closed, otherwise 'for_me' | 'for_everyone'.
  const [confirmMode, setConfirmMode] = useState(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const blockMutation = useBlockUserMutation();
  const unblockMutation = useUnblockUserMutation();
  const deleteMutation = useDeleteDirectChatMutation();
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

  const handleDelete = async () => {
    const mode = confirmMode;
    setConfirmMode(null);
    try {
      await deleteMutation.mutateAsync({ chatId, mode });
      toast.success(
        mode === 'for_everyone' ? 'Chat deleted for everyone' : 'Chat deleted',
      );
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not delete chat.');
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
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
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
          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirmMode('for_me');
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <UserX className="h-4 w-4" />
            Delete for me
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirmMode('for_everyone');
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" />
            Delete for everyone
          </button>
        </div>
      )}
      <ReportUserDialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        userId={otherUserId}
        username={otherUsername}
      />
      <Modal
        open={confirmMode !== null}
        onClose={() => setConfirmMode(null)}
        title="Delete chat"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmMode(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {confirmMode === 'for_everyone' ? (
            <>
              This permanently deletes the conversation with{' '}
              <span className="font-medium">{otherUsername ?? 'this user'}</span> for{' '}
              <span className="font-medium">both of you</span>. This cannot be undone.
            </>
          ) : (
            <>
              This removes the conversation from your side only.{' '}
              <span className="font-medium">{otherUsername ?? 'The other user'}</span>{' '}
              will still see it. It reappears for you if a new message arrives.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
