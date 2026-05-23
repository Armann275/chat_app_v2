import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Check, ShieldAlert, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  useAcceptChatRequestMutation,
  useRejectChatRequestMutation,
} from '@/queries/chat.queries';

export default function RequestChatBanner({ chat }) {
  const navigate = useNavigate();
  const acceptMutation = useAcceptChatRequestMutation();
  const rejectMutation = useRejectChatRequestMutation();

  const otherName = chat.members?.find(
    (m) => m.userId === chat.requestedByUserId,
  )?.user?.username
    ?? chat.otherUser?.username
    ?? 'This user';

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync(chat.id);
      toast.success('Chat accepted');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not accept chat.');
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Reject this chat? The conversation will be deleted.')) return;
    try {
      await rejectMutation.mutateAsync(chat.id);
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not reject chat.');
    }
  };

  const pending = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/40">
      <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
          {otherName} wants to chat with you
        </p>
        <p className="text-xs text-amber-800 dark:text-amber-300/80">
          You can&apos;t reply until you accept this request.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" onClick={handleAccept} disabled={pending}>
          <Check className="mr-1 h-4 w-4" /> Accept
        </Button>
        <Button type="button" variant="secondary" onClick={handleReject} disabled={pending}>
          <X className="mr-1 h-4 w-4" /> Reject
        </Button>
      </div>
    </div>
  );
}
