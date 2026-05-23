import { CornerUpLeft } from 'lucide-react';

export default function ReplyQuote({ message, sender, onJump, dim }) {
  if (!message) {
    return (
      <div className={`mb-1 flex items-center gap-1.5 rounded px-2 py-1 text-xs italic ${dim ? 'bg-indigo-700/60 text-indigo-100' : 'bg-slate-200/70 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
        <CornerUpLeft className="h-3 w-3" />
        <span>Replying to a message</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onJump}
      className={`mb-1 block w-full rounded border-l-2 px-2 py-1 text-left text-xs ${dim ? 'border-indigo-200/60 bg-indigo-700/40 text-indigo-100' : 'border-indigo-400 bg-slate-200/60 text-slate-700 dark:bg-slate-700/60 dark:text-slate-200'}`}
    >
      <p className="font-semibold">{sender?.username ?? 'Unknown'}</p>
      <p className="line-clamp-2 opacity-80">{message.content || (message.deletedAt ? 'Message deleted' : '')}</p>
    </button>
  );
}
