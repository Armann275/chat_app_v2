import * as linkPreviewRepo from '../repositories/linkPreview.repository.js';
import { emitToChat } from '../sockets/realtime.js';
import { logger } from '../config/logger.js';

const URL_RE = /https?:\/\/[^\s<>"]+/gi;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function toDto(row) {
  if (!row) return null;
  return {
    url: row.url,
    title: row.title ?? null,
    description: row.description ?? null,
    imageUrl: row.image_url ?? null,
    fetchedAt: row.fetched_at,
  };
}

function extractUrls(text) {
  return Array.from(new Set([...text.matchAll(URL_RE)].map((m) => m[0].replace(/[.,)\]]+$/, ''))));
}

async function fetchOpenGraph(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'chat-app-link-preview/1.0' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const meta = (prop) => {
      const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i');
      return html.match(re)?.[1] ?? null;
    };
    const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null;
    return {
      title: meta('og:title') ?? titleTag,
      description: meta('og:description') ?? meta('description'),
      imageUrl: meta('og:image'),
    };
  } catch {
    return null;
  }
}

export async function enqueueForMessage({ chatId, messageId, content }) {
  const urls = extractUrls(content);
  if (urls.length === 0) return;

  for (const url of urls) {
    queueMicrotask(async () => {
      try {
        const cached = await linkPreviewRepo.get(url);
        const fresh = !cached || (Date.now() - new Date(cached.fetched_at).getTime() > TTL_MS);
        let row = cached;
        if (fresh) {
          const og = await fetchOpenGraph(url);
          if (og) {
            row = await linkPreviewRepo.upsert({ url, ...og });
          }
        }
        if (row) {
          emitToChat(chatId, 'message:preview-attached', {
            messageId, preview: toDto(row),
          });
        }
      } catch (err) {
        logger.warn('link preview fetch failed', { url, err: err.message });
      }
    });
  }
}

export async function getCached(url) {
  return toDto(await linkPreviewRepo.get(url));
}
