import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  useForgotPasswordMutation,
  useResetPasswordMutation,
} from '@/queries/auth.queries';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email'),
});

const resetSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const inputClass =
  'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const forgotMutation = useForgotPasswordMutation();
  const resetMutation = useResetPasswordMutation();
  const [email, setEmail] = useState(null);

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const resetForm = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { code: '', newPassword: '' },
  });

  const onRequestCode = async ({ email: value }) => {
    try {
      await forgotMutation.mutateAsync({ email: value });
      setEmail(value);
      toast.success('A reset code is on its way to your email.');
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not send reset code. Please try again.';
      toast.error(message);
    }
  };

  const onReset = async ({ code, newPassword }) => {
    try {
      await resetMutation.mutateAsync({ email, code, newPassword });
      toast.success('Password reset. Please sign in with your new password.');
      navigate('/login', { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not reset password. Please try again.';
      toast.error(message);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Reset your password
        </h1>

        {!email ? (
          <>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              Enter your account email and we'll send you a 6-digit code.
            </p>
            <form
              onSubmit={emailForm.handleSubmit(onRequestCode)}
              className="space-y-4"
              noValidate
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Email
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  {...emailForm.register('email')}
                  className={inputClass}
                />
                {emailForm.formState.errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {emailForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={forgotMutation.isPending}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {forgotMutation.isPending ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
              We sent a 6-digit code to {email}. Enter it below with your new password.
            </p>
            <form
              onSubmit={resetForm.handleSubmit(onReset)}
              className="space-y-4"
              noValidate
            >
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Reset code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  autoFocus
                  {...resetForm.register('code')}
                  className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
                />
                {resetForm.formState.errors.code && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.code.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  New password
                </label>
                <input
                  type="password"
                  autoComplete="new-password"
                  {...resetForm.register('newPassword')}
                  className={inputClass}
                />
                {resetForm.formState.errors.newPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={resetMutation.isPending}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {resetMutation.isPending ? 'Resetting…' : 'Reset password'}
              </button>
              <button
                type="button"
                onClick={() => setEmail(null)}
                className="block w-full text-center text-sm text-slate-600 hover:underline dark:text-slate-400"
              >
                Use a different email
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
