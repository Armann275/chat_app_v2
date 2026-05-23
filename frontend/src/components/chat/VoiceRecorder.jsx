import { useEffect, useRef, useState } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import WaveformPlayer from './WaveformPlayer';
import Button from '@/components/ui/Button';

const PEAK_BUCKETS = 64;

async function computePeaksAndDuration(blob) {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return { peaks: null, duration: null };
    const ctx = new Ctx();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const channel = audioBuffer.getChannelData(0);
    const bucketSize = Math.max(1, Math.floor(channel.length / PEAK_BUCKETS));
    const peaks = [];
    for (let i = 0; i < PEAK_BUCKETS; i++) {
      const start = i * bucketSize;
      const end = Math.min(channel.length, start + bucketSize);
      let max = 0;
      for (let j = start; j < end; j++) {
        const v = Math.abs(channel[j]);
        if (v > max) max = v;
      }
      peaks.push(Number(max.toFixed(3)));
    }
    const duration = audioBuffer.duration;
    ctx.close?.();
    return { peaks, duration };
  } catch {
    return { peaks: null, duration: null };
  }
}

export default function VoiceRecorder({ onCancel, onReady }) {
  const [phase, setPhase] = useState('idle'); // idle | recording | preview
  const [blob, setBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [peaks, setPeaks] = useState(null);
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const tickRef = useRef(null);
  const streamRef = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        const recorded = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const { peaks: p, duration: d } = await computePeaksAndDuration(recorded);
        setBlob(recorded);
        setPeaks(p);
        setDuration(d ?? elapsed);
        setPreviewUrl(URL.createObjectURL(recorded));
        setPhase('preview');
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setPhase('recording');
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch (err) {
      toast.error(err?.message ?? 'Could not access microphone.');
      onCancel?.();
    }
  };

  const stop = () => {
    mediaRecorderRef.current?.stop();
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setPeaks(null);
    setDuration(0);
    setElapsed(0);
    setPhase('idle');
  };

  useEffect(() => () => {
    if (tickRef.current) clearInterval(tickRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  // Auto-start when mounted
  useEffect(() => {
    if (phase === 'idle') start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800">
      {phase === 'recording' && (
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 animate-pulse rounded-full bg-red-500" />
          <span className="font-mono text-sm tabular-nums text-slate-700 dark:text-slate-200">
            {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}
          </span>
          <span className="flex-1 text-xs text-slate-500 dark:text-slate-400">Recording…</span>
          <Button size="sm" variant="secondary" onClick={() => { reset(); onCancel?.(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={stop}>
            <Square className="h-4 w-4" /> Stop
          </Button>
        </div>
      )}
      {phase === 'preview' && previewUrl && (
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <WaveformPlayer src={previewUrl} peaks={peaks} duration={duration} />
          </div>
          <Button size="sm" variant="secondary" onClick={() => { reset(); onCancel?.(); }}>
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={() => onReady?.({ blob, peaks, duration })}
          >
            <Send className="h-4 w-4" /> Send
          </Button>
        </div>
      )}
      {phase === 'idle' && (
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-slate-500" />
          <span className="text-sm text-slate-500">Requesting microphone…</span>
        </div>
      )}
    </div>
  );
}
