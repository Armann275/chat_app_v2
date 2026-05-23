import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { useSearchMessagesQuery } from '@/queries/message.queries';
import { useChatsQuery } from '@/queries/chat.queries';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

function chatLabel(chat) {
  if (!chat) return 'Unknown chat';
  if (chat.type === 'group') return chat.name ?? 'Untitled group';
  return 'Direct chat';
}

function groupByChat(messages) {
  const groups = new Map();
  for (const m of messages) {
    if (!groups.has(m.chatId)) groups.set(m.chatId, []);
    groups.get(m.chatId).push(m);
  }
  return groups;
}

export default function SearchModal({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim(), 250);
  const searchQuery = useSearchMessagesQuery({ q: debounced });
  const chatsQuery = useChatsQuery();

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  const handlePick = (chatId) => {
    handleClose();
    navigate(`/chats/${chatId}`);
  };

  const chatById = new Map((chatsQuery.data ?? []).map((c) => [c.id, c]));
  const groups = groupByChat(searchQuery.data ?? []);

  return (
    <Modal open={open} onClose={handleClose} title="Search messages" size="lg">
      <div className="space-y-3">
        <Input
          placeholder="Search across all your chats"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        <div className="max-h-96 min-h-[12rem] overflow-y-auto">
          {debounced.length === 0 ? (
            <p className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400">
              <Search className="h-4 w-4" /> Type to search messages.
            </p>
          ) : searchQuery.isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner />
            </div>
          ) : searchQuery.isError ? (
            <p className="py-6 text-sm text-red-600">Could not search. Please try again.</p>
          ) : groups.size === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No messages match &ldquo;{debounced}&rdquo;.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {[...groups.entries()].map(([chatId, msgs]) => (
                <li key={chatId}>
                  <p className="px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {chatLabel(chatById.get(chatId))}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {msgs.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => handlePick(chatId)}
                          className="flex w-full flex-col gap-0.5 rounded-md border border-slate-200 px-3 py-2 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
                        >
                          <span className="line-clamp-2 text-sm text-slate-900 dark:text-slate-100">
                            {m.content}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {format(new Date(m.createdAt), 'MMM d, HH:mm')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
