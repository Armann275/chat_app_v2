import { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import PollCard from './PollCard';
import CreatePollModal from './CreatePollModal';
import { usePollsQuery } from '@/queries/poll.queries';

export default function PollsModal({ chat, open, onClose }) {
  const [creating, setCreating] = useState(false);
  const pollsQuery = usePollsQuery(chat?.id, { enabled: open && Boolean(chat?.id) });

  return (
    <>
      <Modal open={open && !creating} onClose={onClose} title="Polls" size="lg">
        <div className="mb-3 flex justify-end">
          <Button onClick={() => setCreating(true)} size="sm">
            <Plus className="h-4 w-4" /> New poll
          </Button>
        </div>
        {pollsQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : (pollsQuery.data ?? []).length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            No polls yet.
          </p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {pollsQuery.data.map((poll) => (
              <PollCard key={poll.id} poll={poll} chat={chat} />
            ))}
          </div>
        )}
      </Modal>
      <CreatePollModal
        chatId={chat?.id}
        open={creating}
        onClose={() => setCreating(false)}
      />
    </>
  );
}
