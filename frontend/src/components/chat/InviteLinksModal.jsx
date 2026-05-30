import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Trash2, Link as LinkIcon } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import {
  useInviteLinksQuery,
  useCreateInviteLinkMutation,
  useRevokeInviteLinkMutation,
} from '@/queries/inviteLink.queries';

function buildInviteUrl(code) {
  if (typeof window === 'undefined') return `/invite/${code}`;
  return `${window.location.origin}/invite/${code}`;
}

function statusLabel(link) {
  if (link.revokedAt) return 'revoked';
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
    return 'expired';
  }
  if (link.maxUses != null && link.uses >= link.maxUses) return 'used up';
  return 'active';
}

export default function InviteLinksModal({ chatId, open, onClose }) {
  const linksQuery = useInviteLinksQuery(chatId, { enabled: open });
  const createMutation = useCreateInviteLinkMutation(chatId);
  const revokeMutation = useRevokeInviteLinkMutation(chatId);

  const [expiresAt, setExpiresAt] = useState('');
  const [maxUses, setMaxUses] = useState('');

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync({
        expiresAt: expiresAt || null,
        maxUses: maxUses ? Number(maxUses) : null,
      });
      setExpiresAt('');
      setMaxUses('');
      toast.success('Invite link created');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not create link');
    }
  };

  const handleCopy = async (code) => {
    try {
      await navigator.clipboard.writeText(buildInviteUrl(code));
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleRevoke = async (linkId) => {
    try {
      await revokeMutation.mutateAsync(linkId);
      toast.success('Link revoked');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not revoke link');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Invite links" size="lg">
      <div className="space-y-4">
        <section className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Create new link
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-600 dark:text-slate-400">
              Expires at (optional)
              <Input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-400">
              Max uses (optional)
              <Input
                type="number"
                min="1"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </label>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            <LinkIcon className="h-4 w-4" />
            {createMutation.isPending ? 'Creating…' : 'Create link'}
          </Button>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-medium text-slate-900 dark:text-slate-100">
            Existing links
          </h3>
          {linksQuery.isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (linksQuery.data ?? []).length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-500 dark:text-slate-400">
              No invite links yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {linksQuery.data.map((link) => {
                const status = statusLabel(link);
                const url = buildInviteUrl(link.code);
                return (
                  <li
                    key={link.id}
                    className="flex items-center gap-2 rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-slate-700 dark:text-slate-300">
                        {url}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {status} · {link.uses} use{link.uses === 1 ? '' : 's'}
                        {link.maxUses != null && ` / ${link.maxUses}`}
                        {link.expiresAt && ` · expires ${new Date(link.expiresAt).toLocaleString()}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(link.code)}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                      aria-label="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    {!link.revokedAt && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(link.id)}
                        disabled={revokeMutation.isPending}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                        aria-label="Revoke"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
