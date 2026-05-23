import { useMemo } from 'react';
import { useLinkPreviewStore, selectPreviewForUrl } from '@/stores/linkPreviewStore';
import { cn } from '@/utils/cn';

const URL_RE = /(https?:\/\/[^\s<>"]+)/gi;

function firstUrl(text) {
  if (!text) return null;
  const match = text.match(URL_RE);
  return match ? match[0].replace(/[.,)\]]+$/, '') : null;
}

function CardInner({ preview, dim }) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        'mt-1 flex max-w-md overflow-hidden rounded-md border',
        dim
          ? 'border-indigo-300/40 bg-indigo-700/20'
          : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700',
      )}
    >
      {preview.imageUrl && (
        <img
          src={preview.imageUrl}
          alt=""
          loading="lazy"
          className="h-20 w-20 shrink-0 object-cover"
        />
      )}
      <div className="min-w-0 p-2">
        {preview.title && (
          <p className={cn('line-clamp-1 text-xs font-semibold', dim ? 'text-white' : 'text-slate-900 dark:text-slate-100')}>
            {preview.title}
          </p>
        )}
        {preview.description && (
          <p className={cn('mt-0.5 line-clamp-2 text-xs', dim ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400')}>
            {preview.description}
          </p>
        )}
        <p className={cn('mt-1 truncate text-[10px]', dim ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500')}>
          {(() => {
            try {
              return new URL(preview.url).hostname;
            } catch {
              return preview.url;
            }
          })()}
        </p>
      </div>
    </a>
  );
}

export default function LinkPreviewCard({ message, dim }) {
  const url = useMemo(() => firstUrl(message?.content), [message?.content]);
  const preview = useLinkPreviewStore(selectPreviewForUrl(url));
  if (!url || !preview) return null;
  return <CardInner preview={preview} dim={dim} />;
}
