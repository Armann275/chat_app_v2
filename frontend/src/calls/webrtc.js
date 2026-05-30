import { getSocket } from '@/socket/client';
import { useCallStore } from '@/stores/callStore';
import { SocketEvents } from '@/socket/events';

const DEFAULT_ICE = [{ urls: 'stun:stun.l.google.com:19302' }];

let pc = null;
let pendingRemoteCandidates = [];
let pendingOffer = null;
let pendingOfferCallId = null;

function emit(event, payload) {
  const s = getSocket();
  if (!s) return;
  s.emit(event, payload);
}

async function ensureLocalStream(type) {
  const constraints = {
    audio: true,
    video: type === 'video' ? { width: 1280, height: 720 } : false,
  };
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  useCallStore.getState().setLocalStream(stream);
  return stream;
}

function createPeerConnection(callId) {
  const conn = new RTCPeerConnection({ iceServers: DEFAULT_ICE });

  conn.onicecandidate = (e) => {
    if (e.candidate) {
      emit(SocketEvents.CallIceCandidate, { callId, candidate: e.candidate });
    }
  };

  conn.ontrack = (e) => {
    const [stream] = e.streams;
    if (stream) useCallStore.getState().setRemoteStream(stream);
  };

  conn.onconnectionstatechange = () => {
    if (conn.connectionState === 'connected') {
      useCallStore.getState().setActive();
    }
  };

  return conn;
}

function attachLocalTracks(connection, stream) {
  for (const track of stream.getTracks()) {
    connection.addTrack(track, stream);
  }
}

async function drainPendingCandidates() {
  if (!pc || pendingRemoteCandidates.length === 0) return;
  for (const c of pendingRemoteCandidates) {
    try {
      await pc.addIceCandidate(c);
    } catch {
      // Ignore individual ICE add failures.
    }
  }
  pendingRemoteCandidates = [];
}

// Closes the active peer connection without touching the UI/store state.
// `cleanup()` is the heavier reset that also clears the store.
function closePeerConnection() {
  if (pc) {
    pc.onicecandidate = null;
    pc.ontrack = null;
    pc.onconnectionstatechange = null;
    try {
      pc.close();
    } catch {
      // ignore
    }
    pc = null;
  }
  pendingRemoteCandidates = [];
}

export async function startOutgoingCall({ callId, type }) {
  closePeerConnection();
  const stream = await ensureLocalStream(type);
  pc = createPeerConnection(callId);
  attachLocalTracks(pc, stream);

  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: type === 'video',
  });
  await pc.setLocalDescription(offer);
  emit(SocketEvents.CallOffer, { callId, sdp: offer });
}

// Receiver path: invoked AFTER the user clicks Accept. Sets up media + peer
// connection, then processes any offer that arrived while the call was ringing.
export async function answerIncomingCall({ callId, type }) {
  closePeerConnection();
  const stream = await ensureLocalStream(type);
  pc = createPeerConnection(callId);
  attachLocalTracks(pc, stream);

  if (pendingOffer && pendingOfferCallId === callId) {
    await pc.setRemoteDescription(pendingOffer);
    pendingOffer = null;
    pendingOfferCallId = null;
    await drainPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    emit(SocketEvents.CallAnswer, { callId, sdp: answer });
  }
}

export async function handleRemoteOffer({ callId, sdp }) {
  // If the user hasn't accepted yet, the peer connection isn't built.
  // Stash the offer; `answerIncomingCall` will consume it on accept.
  if (!pc) {
    pendingOffer = sdp;
    pendingOfferCallId = callId;
    return;
  }
  await pc.setRemoteDescription(sdp);
  await drainPendingCandidates();
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  emit(SocketEvents.CallAnswer, { callId, sdp: answer });
}

export async function handleRemoteAnswer({ sdp }) {
  if (!pc) return;
  await pc.setRemoteDescription(sdp);
  await drainPendingCandidates();
}

export async function handleRemoteIceCandidate({ candidate }) {
  if (!candidate) return;
  if (!pc || !pc.remoteDescription) {
    pendingRemoteCandidates.push(candidate);
    return;
  }
  try {
    await pc.addIceCandidate(candidate);
  } catch {
    // Ignore.
  }
}

export function cleanup() {
  closePeerConnection();
  pendingOffer = null;
  pendingOfferCallId = null;
  useCallStore.getState().reset();
}
