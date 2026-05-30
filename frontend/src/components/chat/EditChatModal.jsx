import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useUpdateGroupMutation } from '@/queries/chat.queries';

export default function EditChatModal({ chat, open, onClose }) {
  const [name, setName] = useState(chat?.name ?? '');
  const [description, setDescription] = useState(chat?.description ?? '');
  const mutation = useUpdateGroupMutation(chat?.id);

  useEffect(() => {
    if (open) {
      setName(chat?.name ?? '');
      setDescription(chat?.description ?? '');
    }
  }, [open, chat?.name, chat?.description]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      await mutation.mutateAsync({
        name: trimmedName,
        description: description.trim(),
      });
      toast.success('Chat updated');
      onClose();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not update chat.';
      toast.error(message);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit chat">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            Name
          </span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoFocus
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            rows={4}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="Add a description for this chat"
          />
          <span className="mt-1 block text-right text-xs text-slate-400">
            {description.length}/1000
          </span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
