import { useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, ShieldOff, Copy } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  useTotpStatusQuery,
  useBeginTotpSetupMutation,
  useEnableTotpMutation,
  useDisableTotpMutation,
  useRegenerateBackupCodesMutation,
} from '@/queries/totp.queries';

function copyToClipboard(text) {
  if (!navigator?.clipboard?.writeText) return;
  navigator.clipboard.writeText(text).then(
    () => toast.success('Copied to clipboard'),
    () => toast.error('Could not copy'),
  );
}

function BackupCodesPanel({ codes, onAcknowledge }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-900/20">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
        Save these backup codes
      </p>
      <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
        Each code can be used once if you lose access to your authenticator. They will not be shown again.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-1 font-mono text-sm text-amber-950 dark:text-amber-100">
        {codes.map((code) => (
          <li key={code} className="rounded bg-white/60 px-2 py-1 text-center dark:bg-amber-900/40">
            {code}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex justify-end gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => copyToClipboard(codes.join('\n'))}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy all
        </Button>
        {onAcknowledge && (
          <Button size="sm" onClick={onAcknowledge}>I've saved them</Button>
        )}
      </div>
    </div>
  );
}

export default function TwoFactorSection() {
  const statusQuery = useTotpStatusQuery();
  const beginSetup = useBeginTotpSetupMutation();
  const enableMutation = useEnableTotpMutation();
  const disableMutation = useDisableTotpMutation();
  const regenerateMutation = useRegenerateBackupCodesMutation();

  const [setup, setSetup] = useState(null); // { secret, otpauth }
  const [code, setCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [backupCodes, setBackupCodes] = useState(null);

  const enabled = statusQuery.data?.enabled;

  const handleBegin = async () => {
    try {
      const result = await beginSetup.mutateAsync();
      setSetup(result);
      setBackupCodes(null);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not start setup.');
    }
  };

  const handleEnable = async () => {
    try {
      const result = await enableMutation.mutateAsync(code.trim());
      setSetup(null);
      setCode('');
      setBackupCodes(result.backupCodes);
      toast.success('2FA enabled');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not enable 2FA.');
    }
  };

  const handleDisable = async () => {
    try {
      await disableMutation.mutateAsync(disableCode.trim());
      setDisableCode('');
      setBackupCodes(null);
      toast.success('2FA disabled');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not disable 2FA.');
    }
  };

  const handleRegenerate = async () => {
    try {
      const result = await regenerateMutation.mutateAsync();
      setBackupCodes(result.backupCodes);
      toast.success('New backup codes generated');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not regenerate codes.');
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        {enabled ? (
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
        ) : (
          <ShieldOff className="h-4 w-4 text-slate-400" />
        )}
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Two-factor authentication
        </h2>
        {enabled && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            Enabled
          </span>
        )}
      </div>

      {statusQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : statusQuery.isError ? (
        <p className="text-sm text-red-600">Could not load 2FA status.</p>
      ) : !enabled && !setup ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Add a time-based one-time password (TOTP) from an authenticator app for an extra layer of security at sign-in.
          </p>
          {backupCodes && (
            <BackupCodesPanel codes={backupCodes} onAcknowledge={() => setBackupCodes(null)} />
          )}
          <Button onClick={handleBegin} disabled={beginSetup.isPending}>
            {beginSetup.isPending ? 'Starting…' : 'Enable 2FA'}
          </Button>
        </div>
      ) : !enabled && setup ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Add this account to your authenticator app, then enter the 6-digit code it shows.
          </p>
          <div className="rounded-md border border-slate-200 p-3 text-xs dark:border-slate-700">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-200">Secret</span>
              <button
                type="button"
                onClick={() => copyToClipboard(setup.secret)}
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <code className="block break-all rounded bg-slate-100 p-2 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {setup.secret}
            </code>
            <div className="mt-3 mb-2 flex items-center justify-between gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-200">
                otpauth URI
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(setup.otpauth)}
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline dark:text-indigo-400"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <code className="block break-all rounded bg-slate-100 p-2 font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {setup.otpauth}
            </code>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Code from authenticator
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEnable} disabled={enableMutation.isPending || code.trim().length < 6}>
              {enableMutation.isPending ? 'Verifying…' : 'Verify and enable'}
            </Button>
            <Button variant="ghost" onClick={() => setSetup(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Two-factor authentication is active. You'll be asked for a code when you sign in.
          </p>
          {backupCodes && (
            <BackupCodesPanel codes={backupCodes} onAcknowledge={() => setBackupCodes(null)} />
          )}
          <div className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Disable 2FA
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Enter a current 6-digit code to turn off two-factor authentication.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="123456"
                className="w-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <Button
                variant="danger"
                onClick={handleDisable}
                disabled={disableMutation.isPending || disableCode.trim().length < 6}
              >
                {disableMutation.isPending ? 'Disabling…' : 'Disable'}
              </Button>
            </div>
          </div>
          <div>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
            >
              {regenerateMutation.isPending ? 'Generating…' : 'Regenerate backup codes'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
