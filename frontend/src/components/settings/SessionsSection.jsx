import { toast } from 'sonner';
import { Monitor, LogOut } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  useSessionsQuery,
  useRevokeSessionMutation,
  useRevokeOtherSessionsMutation,
} from '@/queries/session.queries';

function formatWhen(value) {
  if (!value) return 'unknown';
  const d = new Date(value);
  return d.toLocaleString();
}

function deviceLabel(ua) {
  if (!ua) return 'Unknown device';
  if (/iPhone|iPad/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

function browserLabel(ua) {
  if (!ua) return null;
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return 'Chrome';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
  return null;
}

export default function SessionsSection() {
  const query = useSessionsQuery();
  const revokeOne = useRevokeSessionMutation();
  const revokeOthers = useRevokeOtherSessionsMutation();

  const handleRevoke = async (id) => {
    try {
      await revokeOne.mutateAsync(id);
      toast.success('Session revoked');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not revoke session.');
    }
  };

  const handleRevokeOthers = async () => {
    try {
      await revokeOthers.mutateAsync();
      toast.success('All other sessions revoked');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not revoke sessions.');
    }
  };

  const sessions = query.data ?? [];
  const others = sessions.filter((s) => !s.current);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Active sessions
          </h2>
        </div>
        {others.length > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRevokeOthers}
            disabled={revokeOthers.isPending}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out everywhere else
          </Button>
        )}
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : query.isError ? (
        <p className="text-sm text-red-600">Could not load sessions.</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No active sessions.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {sessions.map((s) => {
            const browser = browserLabel(s.userAgent);
            return (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {deviceLabel(s.userAgent)}
                      {browser ? ` · ${browser}` : ''}
                    </p>
                    {s.current && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {s.ip ? `${s.ip} · ` : ''}Last used {formatWhen(s.lastUsedAt ?? s.createdAt)}
                  </p>
                </div>
                {!s.current && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRevoke(s.id)}
                    disabled={revokeOne.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
