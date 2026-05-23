import { create } from 'zustand';

const STORAGE_KEY = 'chat-app:offline-queue';

function load() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export const useOfflineQueueStore = create((set, get) => ({
  items: load(),
  enqueue: (item) => {
    const next = [...get().items, item];
    persist(next);
    set({ items: next });
  },
  removeByTempId: (tempId) => {
    const next = get().items.filter((i) => i.tempId !== tempId);
    persist(next);
    set({ items: next });
  },
  clear: () => {
    persist([]);
    set({ items: [] });
  },
}));
