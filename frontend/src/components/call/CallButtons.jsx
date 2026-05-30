import { toast } from 'sonner';
import { Phone, Video } from 'lucide-react';
import { useCallStore } from '@/stores/callStore';
import { useInitiateCallMutation } from '@/queries/call.queries';
import { startOutgoingCall, cleanup } from '@/calls/webrtc';

export default function CallButtons({ chatId }) {
  const setOutgoing = useCallStore((s) => s.setOutgoing);
  const status = useCallStore((s) => s.status);
  const initiate = useInitiateCallMutation();

  const startCall = async (type) => {
    if (status !== 'idle') {
      toast.error('Another call is already in progress');
      return;
    }
    try {
      const call = await initiate.mutateAsync({ chatId, type });
      setOutgoing({ call });
      await startOutgoingCall({ callId: call.id, type });
    } catch (err) {
      cleanup();
      const message = err?.response?.data?.message ?? 'Could not start the call.';
      toast.error(message);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => startCall('voice')}
        disabled={initiate.isPending}
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Voice call"
        title="Voice call"
      >
        <Phone className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => startCall('video')}
        disabled={initiate.isPending}
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Video call"
        title="Video call"
      >
        <Video className="h-4 w-4" />
      </button>
    </>
  );
}
