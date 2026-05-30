import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';

export default function AIAssistantInput({ disabled, sending, onSend }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || sending || disabled) return;
    onSend(trimmed);
    setValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={disabled}
          placeholder={disabled ? 'Select or create a session…' : 'Ask anything about this project…'}
          className={cn(
            'min-h-[40px] flex-1 resize-none rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-900',
          )}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || sending || !value.trim()}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? <Spinner size="sm" className="border-white/40 border-t-white" /> : <Send className="h-4 w-4" />}
          Send
        </button>
      </div>
      <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        Enter to send · Shift+Enter for newline
      </p>
    </div>
  );
}
