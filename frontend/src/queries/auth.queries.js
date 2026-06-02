import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/api/auth.api';
import { useAuthStore } from '@/stores/authStore';

export const authKeys = {
  me: ['auth', 'me'],
};

export function useLoginMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const setPendingVerification = useAuthStore((s) => s.setPendingVerification);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      if (result?.requires2fa) return; // Wait for 2FA verification.
      const { user, accessToken } = result;
      setAuth({ user, accessToken });
      queryClient.setQueryData(authKeys.me, user);
    },
    onError: (err) => {
      const details = err?.response?.data?.details;
      if (details?.requiresEmailVerification && details.userId) {
        setPendingVerification({ userId: details.userId });
      }
    },
  });
}

export function useRegisterMutation() {
  const setPendingVerification = useAuthStore((s) => s.setPendingVerification);

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ user }) => {
      setPendingVerification({ userId: user.id, email: user.email });
    },
  });
}

export function useVerifyEmailMutation() {
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.verifyEmail,
    onSuccess: ({ user, accessToken }) => {
      setAuth({ user, accessToken });
      queryClient.setQueryData(authKeys.me, user);
    },
  });
}

export function useResendCodeMutation() {
  return useMutation({
    mutationFn: authApi.resendCode,
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: authApi.forgotPassword,
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: authApi.resetPassword,
  });
}

export function useLogoutMutation() {
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      queryClient.clear();
    },
  });
}

export function useMeQuery({ enabled = true } = {}) {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
  });
}
