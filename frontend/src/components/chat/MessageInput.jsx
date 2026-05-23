import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CornerUpLeft,
  FileText,
  Mic,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { useSendMessageMutation } from '@/queries/message.queries';
import { useDraftQuery, useSaveDraftMutation, useClearDraftMutation } from '@/queries/draft.queries';
import { uploadFile } from '@/api/upload.api';
import MentionAutocomplete from './MentionAutocomplete';
import VoiceRecorder from './VoiceRecorder';
import { emitTyping } from '@/socket/client';
import { cn } from '@/utils/cn';

const MAX_LEN = 4000;
const TYPING_IDLE_MS = 2500;
const DRAFT_SAVE_MS = 800;

function makeOptimistic({ chatId, senderId, content, replyToMessageId, asThreadReply, pendingAttachments }) {
  const tempId = `temp-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  return {
    id: tempId,
    chatId,
    senderId,
    content,
    replyToMessageId: replyToMessageId ?? null,
    forwardedFromMessageId: null,
    threadRootId: asThreadReply ? (replyToMessageId ?? null) : null,
    editedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    status: 'pending',
    reactions: [],
    attachments: pendingAttachments ?? [],
  };
}

function detectMentionToken(text, caretIndex) {
  const before = text.slice(0, caretIndex);
  const match = /(?:^|\s)@([a-zA-Z0-9_]{0,32})$/.exec(before);
  if (!match) return null;
  return { query: match[1], start: caretIndex - match[1].length - 1 };
}

function classifyKind(mime) {
  if (mime?.startsWith('image/')) return 'image';
  if (mime?.startsWith('video/')) return 'video';
  if (mime?.startsWith('audio/')) return 'voice';
  return 'file';
}

async function readImageDimensions(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: undefined, height: undefined });
    };
    img.src = url;
  });
}

export default function MessageInput({
  chat,
  replyTarget,
  onClearReply,
  asThreadReply,
}) {
  const chatId = chat.id;
  const me = useAuthStore((s) => s.user);
  const [value, setValue] = useState('');
  const [mentionToken, setMentionToken] = useState(null);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [pending, setPending] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const sendMutation = useSendMessageMutation(chatId);
  const draftQuery = useDraftQuery(chatId, { enabled: !asThreadReply });
  const saveDraftMutation = useSaveDraftMutation(chatId);
  const clearDraftMutation = useClearDraftMutation(chatId);

  const typingRef = useRef(false);
  const typingTimerRef = useRef(null);
  const draftTimerRef = useRef(null);
  const draftLoadedRef = useRef(false);

  useEffect(() => {
    draftLoadedRef.current = false;
  }, [chatId]);

  useEffect(() => {
    if (asThreadReply) return;
    if (draftLoadedRef.current) return;
    if (draftQuery.data?.content) setValue(draftQuery.data.content);
    draftLoadedRef.current = true;
  }, [draftQuery.data, chatId, asThreadReply]);

  const stopTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = null;
    if (typingRef.current) {
      typingRef.current = false;
      emitTyping(chatId, false);
    }
  };

  const noteTyping = () => {
    if (!typingRef.current) {
      typingRef.current = true;
      emitTyping(chatId, true);
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const scheduleDraftSave = (next) => {
    if (asThreadReply) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      if (next.length === 0) {
        clearDraftMutation.mutate(undefined, { onError: () => {} });
      } else {
        saveDraftMutation.mutate(next, { onError: () => {} });
      }
    }, DRAFT_SAVE_MS);
  };

  useEffect(() => () => {
    stopTyping();
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    pending.forEach((p) => p.previewUrl && URL.revokeObjectURL(p.previewUrl));
  }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const members = useMemo(() => chat.members ?? [], [chat.members]);
  const mentionMatches = useMemo(() => {
    if (!mentionToken) return [];
    const q = mentionToken.query.toLowerCase();
    return members
      .map((m) => m.user)
      .filter((u) => u && u.id !== me?.id && (u.username ?? '').toLowerCase().includes(q))
      .slice(0, 6);
  }, [mentionToken, members, me?.id]);

  const addFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const items = [];
    for (const file of fileList) {
      const kind = classifyKind(file.type);
      const previewUrl = kind === 'image' ? URL.createObjectURL(file) : null;
      items.push({
        id: `att-${crypto.randomUUID()}`,
        file,
        previewUrl,
        kind,
        uploading: true,
        meta: kind === 'image' ? await readImageDimensions(file) : {},
      });
    }
    setPending((curr) => [...curr, ...items]);
    items.forEach((item) => {
      uploadFile(item.file, item.meta)
        .then((attachment) => {
          setPending((curr) =>
            curr.map((p) =>
              p.id === item.id
                ? { ...p, uploading: false, attachmentId: attachment.id }
                : p,
            ),
          );
        })
        .catch((err) => {
          const msg = err?.response?.data?.message ?? err?.message ?? 'Upload failed';
          setPending((curr) =>
            curr.map((p) =>
              p.id === item.id ? { ...p, uploading: false, error: msg } : p,
            ),
          );
          toast.error(`Upload failed: ${msg}`);
        });
    });
  };

  const removePending = (id) => {
    setPending((curr) => {
      const item = curr.find((p) => p.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return curr.filter((p) => p.id !== id);
    });
  };

  const onPaste = (e) => {
    const files = Array.from(e.clipboardData?.files ?? []);
    if (files.length > 0) {
      e.preventDefault();
      addFiles(files);
    }
  };

  const onDropFiles = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length > 0) addFiles(files);
  };

  const updateValue = (next, caretIndex) => {
    setValue(next);
    if (next.length > 0) noteTyping();
    else stopTyping();
    scheduleDraftSave(next);
    setMentionToken(detectMentionToken(next, caretIndex ?? next.length));
    setMentionIdx(0);
  };

  const insertMention = (user) => {
    if (!mentionToken) return;
    const before = value.slice(0, mentionToken.start);
    const after = value.slice((mentionToken.start ?? 0) + mentionToken.query.length + 1);
    const next = `${before}@${user.username} ${after}`;
    setValue(next);
    setMentionToken(null);
    requestAnimationFrame(() => {
      const caret = before.length + user.username.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  };

  const handleVoiceReady = async ({ blob, peaks, duration }) => {
    setVoiceOpen(false);
    if (!blob) return;
    const filename = `voice-${Date.now()}.${(blob.type.split('/')[1] ?? 'webm').replace(/;.*/, '')}`;
    const file = new File([blob], filename, { type: blob.type });
    try {
      const attachment = await uploadFile(file, {
        durationSeconds: duration,
        waveformPeaks: peaks,
      });
      await sendMutation.mutateAsync({
        content: '',
        replyToMessageId: replyTarget?.id ?? null,
        asThreadReply,
        attachmentIds: [attachment.id],
        optimisticMessage: makeOptimistic({
          chatId,
          senderId: me?.id,
          content: '',
          replyToMessageId: replyTarget?.id ?? null,
          asThreadReply,
          pendingAttachments: [{
            id: attachment.id,
            kind: 'voice',
            url: attachment.url,
            mime: attachment.mime,
            size: attachment.size,
            durationSeconds: duration,
            waveformPeaks: peaks,
          }],
        }),
      });
      onClearReply?.();
    } catch (err) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Could not send voice message.';
      toast.error(msg);
    }
  };

  const submit = async () => {
    const content = value.trim();
    const ready = pending.filter((p) => p.attachmentId);
    const uploading = pending.some((p) => p.uploading);
    if (uploading) {
      toast.message('Wait — uploads still in progress.');
      return;
    }
    if (content.length === 0 && ready.length === 0) return;
    if (content.length > MAX_LEN) return;

    setValue('');
    setPending([]);
    setMentionToken(null);
    stopTyping();
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (!asThreadReply) clearDraftMutation.mutate(undefined, { onError: () => {} });

    const optimisticMessage = makeOptimistic({
      chatId,
      senderId: me?.id,
      content,
      replyToMessageId: replyTarget?.id ?? null,
      asThreadReply,
      pendingAttachments: ready.map((p) => ({
        id: p.attachmentId,
        kind: p.kind,
        url: p.previewUrl ?? '',
        mime: p.file.type,
        size: p.file.size,
      })),
    });

    try {
      await sendMutation.mutateAsync({
        content,
        replyToMessageId: replyTarget?.id ?? null,
        asThreadReply,
        attachmentIds: ready.map((p) => p.attachmentId),
        optimisticMessage,
      });
      onClearReply?.();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not send message. Please try again.';
      toast.error(message);
      setValue(content);
    } finally {
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (mentionMatches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionMatches.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIdx((i) => (i - 1 + mentionMatches.length) % mentionMatches.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionMatches[mentionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionToken(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const disableSend =
    (value.trim().length === 0 && pending.filter((p) => p.attachmentId).length === 0) ||
    value.length > MAX_LEN ||
    pending.some((p) => p.uploading);

  return (
    <div
      className="relative border-t border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDropFiles}
    >
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded border-2 border-dashed border-indigo-400 bg-indigo-50/80 text-sm font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200">
          Drop to attach
        </div>
      )}

      {replyTarget && (
        <div className="mb-2 flex items-start justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex min-w-0 items-start gap-1.5">
            <CornerUpLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
            <div className="min-w-0">
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                Replying{replyTarget.senderName ? ` to ${replyTarget.senderName}` : ''}
                {asThreadReply ? ' in thread' : ''}
              </p>
              <p className="truncate text-slate-500 dark:text-slate-400">{replyTarget.content}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClearReply}
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
            aria-label="Clear reply"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {voiceOpen && (
        <div className="mb-2">
          <VoiceRecorder
            onCancel={() => setVoiceOpen(false)}
            onReady={handleVoiceReady}
          />
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {pending.map((p) => (
            <div
              key={p.id}
              className={cn(
                'group relative flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800',
                p.error && 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/40',
              )}
            >
              {p.kind === 'image' && p.previewUrl ? (
                <img src={p.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
              <div className="min-w-0">
                <p className="max-w-[10rem] truncate font-medium text-slate-700 dark:text-slate-200">
                  {p.file.name}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {p.uploading ? 'Uploading…' : p.error ? p.error : 'Ready'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removePending(p.id)}
                className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="relative flex items-end gap-2"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Attach files"
          title="Attach files"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setVoiceOpen((v) => !v)}
          className={cn(
            'rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800',
            voiceOpen && 'bg-slate-100 text-indigo-600 dark:bg-slate-800 dark:text-indigo-300',
          )}
          aria-label="Record voice message"
          title="Voice message"
        >
          <Mic className="h-4 w-4" />
        </button>

        <div className="relative flex-1">
          <MentionAutocomplete
            matches={mentionMatches}
            activeIndex={mentionIdx}
            onPick={insertMention}
          />
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => updateValue(e.target.value, e.target.selectionStart)}
            onClick={(e) => {
              const caret = e.target.selectionStart;
              setMentionToken(detectMentionToken(value, caret));
            }}
            onBlur={() => {
              stopTyping();
              setMentionToken(null);
            }}
            onPaste={onPaste}
            onKeyDown={handleKeyDown}
            placeholder={asThreadReply ? 'Reply in thread…' : 'Write a message'}
            className="max-h-40 min-h-[2.5rem] w-full resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <Button type="submit" disabled={disableSend} aria-label="Send">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
