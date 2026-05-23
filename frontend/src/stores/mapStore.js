import { create } from 'zustand';

export const useMapStore = create((set) => ({
  friendLocations: {},

  upsertFriend: (loc) =>
    set((s) => ({
      friendLocations: { ...s.friendLocations, [loc.userId]: loc },
    })),

  removeFriend: (userId) =>
    set((s) => {
      if (!s.friendLocations[userId]) return s;
      const next = { ...s.friendLocations };
      delete next[userId];
      return { friendLocations: next };
    }),

  hydrate: (locations) =>
    set({
      friendLocations: Object.fromEntries(
        (locations ?? []).map((l) => [l.userId, l]),
      ),
    }),

  clear: () => set({ friendLocations: {} }),
}));
