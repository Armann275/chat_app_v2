import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Phone } from 'lucide-react';
import { useCallStore } from '@/stores/callStore';
import {
  useAcceptCallMutation,
  useRejectCallMutation,
  useHangupCallMutation,
} from '@/queries/call.queries';
import { answerIncomingCall, cleanup } from '@/calls/webrtc';
import { startRingtone, stopRingtone } from '@/calls/ringtone';

function VideoTile({ stream, muted, label, mirror = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <div className="relative overflow-hidden rounded-lg bg-black">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full object-cover ${mirror ? 'scale-x-[-1]' : ''}`}
      />
      {label && (
        <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
          {label}
        </span>
      )}
    </div>
  );
}

export default function CallOverlay() {
  const status = useCallStore((s) => s.status);
  const call = useCallStore((s) => s.call);
  const localStream = useCallStore((s) => s.localStream);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const micEnabled = useCallStore((s) => s.micEnabled);
  const cameraEnabled = useCallStore((s) => s.cameraEnabled);
  const toggleMic = useCallStore((s) => s.toggleMic);
  const toggleCamera = useCallStore((s) => s.toggleCamera);

  const acceptMutation = useAcceptCallMutation();
  const rejectMutation = useRejectCallMutation();
  const hangupMutation = useHangupCallMutation();

  // Ring while the call is being established; stop once connected or ended.
  useEffect(() => {
    if (status === 'incoming') startRingtone('incoming');
    else if (status === 'outgoing') startRingtone('outgoing');
    else stopRingtone();
    return stopRingtone;
  }, [status]);

  if (status === 'idle' || !call) return null;

  const isVideo = call.type === 'video';

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(call.id);
      await answerIncomingCall({ callId: call.id, type: call.type });
    } catch (err) {
      cleanup();
      toast.error(err?.response?.data?.message ?? 'Could not accept the call.');
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync(call.id);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not reject the call.');
    } finally {
      cleanup();
    }
  };

  const handleHangup = async () => {
    try {
      await hangupMutation.mutateAsync(call.id);
    } catch {
      // Backend may already have ended the call; treat as best-effort.
    } finally {
      cleanup();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">
            {status === 'incoming' && 'Incoming call'}
            {status === 'outgoing' && 'Calling…'}
            {status === 'active' && (isVideo ? 'Video call' : 'Voice call')}
          </p>
          <p className="text-xs text-white/60">
            {isVideo ? 'Video' : 'Voice'} · {call.id.slice(0, 8)}
          </p>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-4">
        {isVideo && remoteStream ? (
          <div className="h-full w-full max-w-4xl">
            <VideoTile stream={remoteStream} muted={false} label="Remote" />
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-white/10 text-5xl font-light">
              {isVideo ? <VideoIcon className="h-12 w-12" /> : <Phone className="h-12 w-12" />}
            </div>
            <p className="mt-4 text-sm text-white/70">
              {status === 'active' ? 'Connected' : status === 'outgoing' ? 'Waiting for the other side…' : 'Ringing…'}
            </p>
          </div>
        )}

        {isVideo && localStream && (
          <div className="absolute bottom-6 right-6 h-32 w-44 overflow-hidden rounded-lg border border-white/20 shadow-lg">
            <VideoTile stream={localStream} muted label="You" mirror />
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 border-t border-white/10 px-4 py-4">
        {status === 'incoming' ? (
          <>
            <button
              type="button"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 disabled:opacity-60"
              aria-label="Reject call"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-60"
              aria-label="Accept call"
            >
              <Phone className="h-6 w-6" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleMic}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label={micEnabled ? 'Mute mic' : 'Unmute mic'}
            >
              {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </button>
            {isVideo && (
              <button
                type="button"
                onClick={toggleCamera}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
              >
                {cameraEnabled ? <VideoIcon className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            )}
            <button
              type="button"
              onClick={handleHangup}
              disabled={hangupMutation.isPending}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 disabled:opacity-60"
              aria-label="Hang up"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
