// Centered, muted "pill" for system/event messages (member added/removed,
// left group, calls, renames, role changes, etc.). The text is server-rendered
// in `message.content`; structured data lives in `message.systemEvent`.
export default function SystemMessage({ message }) {
  if (!message.content) return null;
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-slate-200/70 px-3 py-1 text-center text-xs text-slate-600 dark:bg-slate-800/70 dark:text-slate-400">
        {message.content}
      </span>
    </div>
  );
}
