import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import {
  useVerifyEmailMutation,
  useResendCodeMutation,
} from '@/queries/auth.queries';

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

const RESEND_COOLDOWN_S = 60;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.pendingVerificationUserId);
  const email = useAuthStore((s) => s.pendingVerificationEmail);
  const setGuest = useAuthStore((s) => s.setGuest);

  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendCodeMutation();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (!userId) navigate('/register', { replace: true });
  }, [userId, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  if (!userId) return null;

  const onSubmit = async ({ code }) => {
    try {
      await verifyMutation.mutateAsync({ userId, code });
      toast.success('Email verified');
      navigate('/avatar-setup', { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not verify code. Please try again.';
      toast.error(message);
    }
  };

  const onResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendMutation.mutateAsync({ userId });
      toast.success('Code re-sent');
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not resend code.';
      toast.error(message);
    }
  };

  const onChangeAccount = () => {
    setGuest();
    navigate('/register', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Verify your email
        </h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          We sent a 6-digit code{email ? ` to ${email}` : ''}. Enter it below to finish creating your account.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Verification code
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              {...register('code')}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-2xl tracking-[0.5em] text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            {errors.code && (
              <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={verifyMutation.isPending}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {verifyMutation.isPending ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onResend}
            disabled={cooldown > 0 || resendMutation.isPending}
            className="text-indigo-600 hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </button>
          <button
            type="button"
            onClick={onChangeAccount}
            className="text-slate-500 hover:underline dark:text-slate-400"
          >
            Wrong email?
          </button>
        </div>
      </div>
    </main>
  );
}
