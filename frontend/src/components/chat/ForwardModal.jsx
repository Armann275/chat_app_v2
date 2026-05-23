import { useState } from 'react';
import { toast } from 'sonner';
import { Users, User } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { useChatsQuery } from '@/queries/chat.queries';
import { useForwardMessagesMutation } from '@/queries/forward.queries';

function chatDisplayName(chat) {
  if (chat.type === 'group') return chat.name ?? 'Untitled group';
  return chat.otherUser?.username ?? 'Direct chat';
}

export default function ForwardModal({ open, onClose, messageIds }) {
  const chatsQuery = useChatsQuery({ enabled: open });
  const forwardMutation = useForwardMessagesMutation();
  const [picked, setPicked] = useState(new Set());

  const handleClose = () => {
    setPicked(new Set());
    onClose();
  };

  const toggle = (chatId) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const submit = async () => {
    if (picked.size === 0) return;
    try {
      await forwardMutation.mutateAsync({
        messageIds,
        toChatIds: Array.from(picked),
      });
      toast.success(`Forwarded to ${picked.size} chat${picked.size === 1 ? '' : 's'}`);
      handleClose();
    } catch (err) {
      const msg = err?.response?.data?.message ?? 'Could not forward message.';
      toast.error(msg);
    }
  };

  const chats = chatsQuery.data ?? [];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Forward message"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={picked.size === 0 || forwardMutation.isPending}
          >
            {forwardMutation.isPending ? 'Forwarding…' : `Forward (${picked.size})`}
          </Button>
        </>
      }
    >
      <div className="max-h-80 overflow-y-auto">
        {chats.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            You have no other chats to forward to.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {chats.map((chat) => {
              const Icon = chat.type === 'group' ? Users : User;
              const title = chatDisplayName(chat);
              const checked = picked.has(chat.id);
              return (
                <li key={chat.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(chat.id)}
                      className="h-4 w-4"
                    />
                    <Avatar
                      src={chat.type === 'direct' ? chat.otherUser?.avatarUrl : null}
                      name={title}
                      size="sm"
                    />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm text-slate-900 dark:text-slate-100">
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{title}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
