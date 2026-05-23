import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,
  pendingVerificationUserId: null,
  pendingVerificationEmail: null,

  setAuth: ({ accessToken, user }) =>
    set({
      status: 'authed',
      accessToken,
      user,
      pendingVerificationUserId: null,
      pendingVerificationEmail: null,
    }),

  setGuest: () =>
    set({
      status: 'guest',
      accessToken: null,
      user: null,
      pendingVerificationUserId: null,
      pendingVerificationEmail: null,
    }),

  setPendingVerification: ({ userId, email }) =>
    set({
      status: 'pending_verification',
      accessToken: null,
      user: null,
      pendingVerificationUserId: userId,
      pendingVerificationEmail: email ?? null,
    }),

  setUser: (user) => set((s) => ({ ...s, user })),

  clearAuth: () =>
    set({
      status: 'guest',
      accessToken: null,
      user: null,
      pendingVerificationUserId: null,
      pendingVerificationEmail: null,
    }),
}));

export const getAccessToken = () => useAuthStore.getState().accessToken;
