import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useLoginMutation } from '@/queries/auth.queries';
import { useVerify2faMutation } from '@/queries/totp.queries';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const loginMutation = useLoginMutation();
  const verify2fa = useVerify2faMutation();
  const [twoFactorToken, setTwoFactorToken] = useState(null);
  const [code, setCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const redirectAfterLogin = () => {
    const redirectTo = location.state?.from ?? '/';
    navigate(redirectTo, { replace: true });
  };

  const onSubmit = async (values) => {
    try {
      const result = await loginMutation.mutateAsync(values);
      if (result?.requires2fa) {
        setTwoFactorToken(result.twoFactorToken);
        return;
      }
      redirectAfterLogin();
    } catch (err) {
      const details = err?.response?.data?.details;
      if (details?.requiresEmailVerification) {
        toast.info('Please verify your email to continue');
        navigate('/verify-email', { replace: true });
        return;
      }
      const message =
        err?.response?.data?.message ?? 'Could not log in. Please try again.';
      toast.error(message);
    }
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    try {
      await verify2fa.mutateAsync({ token: twoFactorToken, code: code.trim() });
      redirectAfterLogin();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Invalid code.');
    }
  };

  if (twoFactorToken) {
    return (
      <form onSubmit={handleVerify2fa} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Enter the 6-digit code from your authenticator app, or a backup code.
        </p>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Verification code
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={16}
            autoFocus
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-center font-mono text-lg tracking-widest text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <button
          type="submit"
          disabled={verify2fa.isPending || code.trim().length < 6}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {verify2fa.isPending ? 'Verifying…' : 'Verify and sign in'}
        </button>

        <button
          type="button"
          onClick={() => {
            setTwoFactorToken(null);
            setCode('');
          }}
          className="block w-full text-center text-sm text-slate-600 hover:underline dark:text-slate-400"
        >
          Use a different account
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Email
        </label>
        <input
          type="email"
          autoComplete="email"
          {...register('email')}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Password
        </label>
        <input
          type="password"
          autoComplete="current-password"
          {...register('password')}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        )}
        <div className="mt-1 text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || loginMutation.isPending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-indigo-600 hover:underline">
          Register
        </Link>
      </p>
    </form>
  );
}
