import { create } from 'zustand';

export const useLinkPreviewStore = create((set) => ({
  // Map<url, preview>
  byUrl: new Map(),
  setPreview: (preview) =>
    set((s) => {
      if (!preview?.url) return s;
      const next = new Map(s.byUrl);
      next.set(preview.url, preview);
      return { byUrl: next };
    }),
  reset: () => set({ byUrl: new Map() }),
}));

export function selectPreviewForUrl(url) {
  return (state) => state.byUrl.get(url);
}
