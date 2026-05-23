import { create } from 'zustand';

export const useSocketStore = create((set) => ({
  status: 'disconnected',
  // Map<chatId, Set<userId>>
  typingByChat: new Map(),
  // Map<userId, { online: boolean, lastSeenAt?: string }>
  presence: new Map(),

  setStatus: (status) => set({ status }),

  setUserTyping: (chatId, userId, isTyping) =>
    set((s) => {
      const next = new Map(s.typingByChat);
      const users = new Set(next.get(chatId) ?? []);
      if (isTyping) users.add(userId);
      else users.delete(userId);
      if (users.size === 0) next.delete(chatId);
      else next.set(chatId, users);
      return { typingByChat: next };
    }),

  setPresence: (userId, info) =>
    set((s) => {
      const next = new Map(s.presence);
      next.set(userId, info);
      return { presence: next };
    }),

  reset: () =>
    set({
      status: 'disconnected',
      typingByChat: new Map(),
      presence: new Map(),
    }),
}));

export function selectIsOnline(userId) {
  return (state) => state.presence.get(userId)?.online === true;
}

export function selectTypingUserIds(chatId) {
  return (state) => state.typingByChat.get(chatId);
}
