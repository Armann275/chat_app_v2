import { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/utils/cn';

function formatTime(secs) {
  if (!Number.isFinite(secs)) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function effectiveDuration(el, fallback) {
  const d = el?.duration;
  if (Number.isFinite(d) && d > 0) return d;
  if (Number.isFinite(fallback) && fallback > 0) return fallback;
  return 0;
}

export default function WaveformPlayer({ src, peaks, duration, dim }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);

  const peaksData = useMemo(() => {
    if (Array.isArray(peaks) && peaks.length > 0) return peaks;
    return Array.from({ length: 48 }, () => 0.5);
  }, [peaks]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return undefined;

    const onTime = () => {
      const total = effectiveDuration(el, duration);
      setCurrentTime(el.currentTime);
      setProgress(total > 0 ? Math.min(1, el.currentTime / total) : 0);
      if (
        !Number.isFinite(el.duration) &&
        total > 0 &&
        el.currentTime >= total - 0.05
      ) {
        el.pause();
        try { el.currentTime = 0; } catch { /* ignore */ }
        setPlaying(false);
        setProgress(0);
        setCurrentTime(0);
      }
    };

    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const onError = () => {
      const code = el.error?.code;
      const map = {
        1: 'aborted',
        2: 'network error',
        3: 'decode error',
        4: 'source not supported',
      };
      setErrorMsg(`Audio ${map[code] ?? 'error'}`);
      setPlaying(false);
    };

    el.addEventListener('timeupdate', onTime);
    el.addEventListener('ended', onEnd);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('ended', onEnd);
      el.removeEventListener('error', onError);
    };
  }, [duration]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      return;
    }
    const playPromise = el.play();
    if (playPromise?.then) {
      playPromise
        .then(() => {
          setPlaying(true);
          setErrorMsg(null);
        })
        .catch((err) => {
          console.warn('voice playback failed', err);
          setErrorMsg(err?.message ?? 'Could not play this clip');
          setPlaying(false);
        });
    } else {
      setPlaying(true);
    }
  };

  const seekToFraction = (fraction) => {
    const el = audioRef.current;
    if (!el) return;
    const total = effectiveDuration(el, duration);
    if (total <= 0) return;
    try {
      el.currentTime = Math.max(0, Math.min(total, fraction * total));
    } catch {
      /* ignore */
    }
  };

  const displaySeconds = playing ? currentTime : duration ?? 0;

  // When the custom player fails (decode/source error etc.), fall back to the
  // browser's native <audio controls> so the user can still listen.
  if (errorMsg) {
    return (
      <div className="flex w-full flex-col gap-1">
        <audio src={src} controls preload="metadata" className="w-full" />
        <p
          className={cn(
            'text-[10px]',
            dim ? 'text-indigo-100' : 'text-amber-600 dark:text-amber-400',
          )}
        >
          Waveform unavailable ({errorMsg}).{' '}
          <a href={src} target="_blank" rel="noreferrer" className="underline">
            Open file
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          dim
            ? 'bg-white/20 text-white hover:bg-white/30'
            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-200',
        )}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div
        className="relative flex h-8 flex-1 cursor-pointer items-center gap-px"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={progress}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          seekToFraction((e.clientX - rect.left) / rect.width);
        }}
      >
        {peaksData.map((p, i) => (
          <span
            key={i}
            style={{ height: `${Math.max(8, Math.min(100, p * 100))}%` }}
            className={cn(
              'w-[3px] rounded-sm',
              i / peaksData.length < progress
                ? dim
                  ? 'bg-white'
                  : 'bg-indigo-600 dark:bg-indigo-400'
                : dim
                  ? 'bg-white/40'
                  : 'bg-slate-300 dark:bg-slate-600',
            )}
          />
        ))}
      </div>

      <span
        className={cn(
          'min-w-[2.5rem] text-right text-xs tabular-nums',
          dim ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400',
        )}
      >
        {formatTime(displaySeconds)}
      </span>

      <audio ref={audioRef} src={src} preload="auto" />
    </div>
  );
}
