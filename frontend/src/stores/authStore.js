import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  status: 'loading',
  accessToken: null,
  user: null,

  setAuth: ({ accessToken, user }) =>
    set({ status: 'authed', accessToken, user }),

  setGuest: () => set({ status: 'guest', accessToken: null, user: null }),

  setUser: (user) => set((s) => ({ ...s, user })),

  clearAuth: () => set({ status: 'guest', accessToken: null, user: null }),
}));

export const getAccessToken = () => useAuthStore.getState().accessToken;
