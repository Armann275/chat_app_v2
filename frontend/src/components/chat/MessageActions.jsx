import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CornerUpLeft,
  Edit2,
  Forward,
  MessageSquare,
  MoreHorizontal,
  Pin,
  PinOff,
  Smile,
  Star,
  Trash2,
} from 'lucide-react';
import { cn } from '@/utils/cn';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉'];
const MENU_GAP = 4;
const MENU_MIN_HEIGHT = 220;
const MENU_WIDTH = 200;

export default function MessageActions({
  isOwn,
  isDeleted,
  isPinned,
  isStarred,
  onReact,
  onReply,
  onReplyInThread,
  onEdit,
  onDelete,
  onPinToggle,
  onStarToggle,
  onForward,
}) {
  const [open, setOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const computePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < MENU_MIN_HEIGHT && spaceAbove > spaceBelow;
    const left = isOwn
      ? Math.max(8, Math.min(vw - MENU_WIDTH - 8, rect.right - MENU_WIDTH))
      : Math.max(8, Math.min(vw - MENU_WIDTH - 8, rect.left));
    setPos({
      left,
      top: openUp ? null : rect.bottom + MENU_GAP,
      bottom: openUp ? vh - rect.top + MENU_GAP : null,
    });
  };

  useLayoutEffect(() => {
    if (!open) return undefined;
    computePosition();
    const onResize = () => computePosition();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (e) => {
      if (
        !triggerRef.current?.contains(e.target) &&
        !menuRef.current?.contains(e.target)
      ) {
        setOpen(false);
        setShowPicker(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (isDeleted) return null;

  const closeMenu = () => {
    setOpen(false);
    setShowPicker(false);
  };

  const menu = open && pos ? (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top ?? undefined,
        bottom: pos.bottom ?? undefined,
        width: MENU_WIDTH,
      }}
      className="z-50 min-w-[180px] rounded-md border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
    >
      <button
        type="button"
        onMouseEnter={() => setShowPicker(true)}
        onClick={() => setShowPicker((v) => !v)}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        role="menuitem"
      >
        <Smile className="h-4 w-4" /> React
      </button>

      {showPicker && (
        <div className="my-1 flex gap-1 rounded bg-slate-50 px-1 py-1 dark:bg-slate-900">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onReact?.(e);
                closeMenu();
              }}
              className="text-lg transition hover:scale-110"
              aria-label={`React with ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onReply?.();
          closeMenu();
        }}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        role="menuitem"
      >
        <CornerUpLeft className="h-4 w-4" /> Reply
      </button>

      {onReplyInThread && (
        <button
          type="button"
          onClick={() => {
            onReplyInThread();
            closeMenu();
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          role="menuitem"
        >
          <MessageSquare className="h-4 w-4" /> Reply in thread
        </button>
      )}

      {isOwn && (
        <button
          type="button"
          onClick={() => {
            onEdit?.();
            closeMenu();
          }}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          role="menuitem"
        >
          <Edit2 className="h-4 w-4" /> Edit
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          onForward?.();
          closeMenu();
        }}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        role="menuitem"
      >
        <Forward className="h-4 w-4" /> Forward
      </button>

      <button
        type="button"
        onClick={() => {
          onPinToggle?.();
          closeMenu();
        }}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        role="menuitem"
      >
        {isPinned ? (
          <>
            <PinOff className="h-4 w-4" /> Unpin
          </>
        ) : (
          <>
            <Pin className="h-4 w-4" /> Pin
          </>
        )}
      </button>

      <button
        type="button"
        onClick={() => {
          onStarToggle?.();
          closeMenu();
        }}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        role="menuitem"
      >
        <Star
          className={cn(
            'h-4 w-4',
            isStarred && 'fill-amber-400 text-amber-500',
          )}
        />{' '}
        {isStarred ? 'Unstar' : 'Star'}
      </button>

      {isOwn && (
        <>
          <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
          <button
            type="button"
            onClick={() => {
              onDelete?.('for_everyone');
              closeMenu();
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            role="menuitem"
          >
            <Trash2 className="h-4 w-4" /> Delete for everyone
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          onDelete?.('for_me');
          closeMenu();
        }}
        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
        role="menuitem"
      >
        <Trash2 className="h-4 w-4" /> Delete for me
      </button>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setShowPicker(false);
        }}
        className="rounded p-1 text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100 dark:hover:bg-slate-700 dark:hover:text-slate-200"
        aria-label="Message actions"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menu && createPortal(menu, document.body)}
    </>
  );
}
