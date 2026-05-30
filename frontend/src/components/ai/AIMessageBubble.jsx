import { Sparkles, User } from 'lucide-react';
import { cn } from '@/utils/cn';

export default function AIMessageBubble({ role, content, pending }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
          <Sparkles className="h-4 w-4" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm',
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100',
          pending && 'italic opacity-70',
        )}
      >
        {content}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
