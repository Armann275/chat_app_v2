import { create } from 'zustand';

// Possible UI states:
//  - idle: no call
//  - outgoing: we initiated, waiting for the other side
//  - incoming: someone is calling us, awaiting accept/reject
//  - active: media connected
const initialState = {
  status: 'idle',
  call: null,           // { id, chatId, initiatorId, type, ... }
  fromUserId: null,     // for incoming: who initiated
  localStream: null,
  remoteStream: null,
  cameraEnabled: true,
  micEnabled: true,
  error: null,
};

export const useCallStore = create((set, get) => ({
  ...initialState,

  setIncoming: ({ call, fromUserId }) =>
    set({ status: 'incoming', call, fromUserId }),

  setOutgoing: ({ call }) => set({ status: 'outgoing', call, fromUserId: null }),

  setActive: () => set({ status: 'active' }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  toggleMic: () =>
    set((s) => {
      const next = !s.micEnabled;
      s.localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
      return { micEnabled: next };
    }),

  toggleCamera: () =>
    set((s) => {
      const next = !s.cameraEnabled;
      s.localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
      return { cameraEnabled: next };
    }),

  setError: (error) => set({ error }),

  reset: () => {
    const { localStream } = get();
    localStream?.getTracks().forEach((t) => t.stop());
    set({ ...initialState });
  },
}));
