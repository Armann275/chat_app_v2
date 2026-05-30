import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useCreatePollMutation } from '@/queries/poll.queries';

export default function CreatePollModal({ chatId, open, onClose }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multiChoice, setMultiChoice] = useState(false);
  const [closesAt, setClosesAt] = useState('');
  const mutation = useCreatePollMutation(chatId);

  const reset = () => {
    setQuestion('');
    setOptions(['', '']);
    setMultiChoice(false);
    setClosesAt('');
  };

  const updateOption = (i, value) => {
    setOptions((curr) => curr.map((o, idx) => (idx === i ? value : o)));
  };

  const addOption = () => {
    if (options.length >= 12) return;
    setOptions((curr) => [...curr, '']);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions((curr) => curr.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanOpts = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim()) {
      toast.error('Question is required');
      return;
    }
    if (cleanOpts.length < 2) {
      toast.error('Need at least 2 options');
      return;
    }
    try {
      await mutation.mutateAsync({
        question: question.trim(),
        options: cleanOpts,
        multiChoice,
        closesAt: closesAt || null,
      });
      reset();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not create poll');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New poll" size="lg">
      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            Question
          </span>
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={500}
            placeholder="What should we have for lunch?"
            autoFocus
          />
        </label>

        <div className="space-y-1.5">
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Options
          </span>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                maxLength={200}
                placeholder={`Option ${i + 1}`}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Remove option"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {options.length < 12 && (
            <Button type="button" variant="ghost" size="sm" onClick={addOption}>
              <Plus className="h-4 w-4" /> Add option
            </Button>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={multiChoice}
            onChange={(e) => setMultiChoice(e.target.checked)}
          />
          <span className="text-slate-700 dark:text-slate-200">Allow multiple choices</span>
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
            Closes at (optional)
          </span>
          <Input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating…' : 'Create poll'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
