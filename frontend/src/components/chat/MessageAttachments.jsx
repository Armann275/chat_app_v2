import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { resolveAttachmentUrl } from '@/api/upload.api';
import ImageLightbox from './ImageLightbox';
import WaveformPlayer from './WaveformPlayer';
import { cn } from '@/utils/cn';

function formatSize(bytes) {
  if (bytes == null) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function ImageAttachment({ attachment, isOwn, onOpen }) {
  const url = resolveAttachmentUrl(attachment.url);
  return (
    <button
      type="button"
      onClick={() => onOpen(url)}
      className={cn(
        'block overflow-hidden rounded-lg',
        isOwn ? 'bg-indigo-700/30' : 'bg-slate-100 dark:bg-slate-700',
      )}
    >
      <img
        src={url}
        alt=""
        loading="lazy"
        className="max-h-72 w-auto object-cover"
        style={{
          aspectRatio:
            attachment.width && attachment.height
              ? `${attachment.width} / ${attachment.height}`
              : undefined,
        }}
      />
    </button>
  );
}

function VideoAttachment({ attachment }) {
  const url = resolveAttachmentUrl(attachment.url);
  return (
    <video
      src={url}
      controls
      preload="metadata"
      className="max-h-72 rounded-lg bg-black"
    />
  );
}

function FileAttachment({ attachment, isOwn }) {
  const url = resolveAttachmentUrl(attachment.url);
  return (
    <a
      href={url}
      download
      className={cn(
        'flex items-center gap-3 rounded-md border px-2 py-2',
        isOwn
          ? 'border-indigo-300/40 bg-indigo-700/20 text-white hover:bg-indigo-700/30'
          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
      )}
    >
      <FileText className="h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {attachment.mime?.split('/').pop() ?? 'file'} attachment
        </p>
        <p className="truncate text-xs opacity-75">{formatSize(attachment.size)}</p>
      </div>
      <Download className="h-4 w-4 opacity-70" />
    </a>
  );
}

function VoiceAttachment({ attachment, isOwn }) {
  const url = resolveAttachmentUrl(attachment.url);
  return (
    <div
      className={cn(
        'w-full max-w-[260px] rounded-md px-2 py-1',
        isOwn ? 'bg-indigo-700/20' : 'bg-slate-100 dark:bg-slate-700',
      )}
    >
      <WaveformPlayer
        src={url}
        peaks={attachment.waveformPeaks}
        duration={attachment.durationSeconds}
        dim={isOwn}
      />
    </div>
  );
}

export default function MessageAttachments({ attachments, isOwn }) {
  const [lightboxSrc, setLightboxSrc] = useState(null);
  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-1 flex flex-col gap-1">
      {attachments.map((a) => {
        if (a.kind === 'image') {
          return (
            <ImageAttachment
              key={a.id}
              attachment={a}
              isOwn={isOwn}
              onOpen={(src) => setLightboxSrc(src)}
            />
          );
        }
        if (a.kind === 'video') {
          return <VideoAttachment key={a.id} attachment={a} />;
        }
        if (a.kind === 'voice') {
          return <VoiceAttachment key={a.id} attachment={a} isOwn={isOwn} />;
        }
        return <FileAttachment key={a.id} attachment={a} isOwn={isOwn} />;
      })}
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
