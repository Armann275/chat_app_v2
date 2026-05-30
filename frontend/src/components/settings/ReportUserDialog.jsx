import { useState } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useReportUserMutation } from '@/queries/block.queries';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'self_harm', label: 'Self-harm or threats' },
  { value: 'other', label: 'Other' },
];

export default function ReportUserDialog({ open, onClose, userId, username }) {
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const reportMutation = useReportUserMutation();

  const handleSubmit = async () => {
    try {
      await reportMutation.mutateAsync({
        userId,
        reason,
        details: details.trim() || undefined,
      });
      toast.success('Report submitted');
      setDetails('');
      onClose?.();
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not submit report.';
      toast.error(message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={username ? `Report ${username}` : 'Report user'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={reportMutation.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleSubmit} disabled={reportMutation.isPending}>
            {reportMutation.isPending ? 'Submitting…' : 'Submit report'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Details (optional)
          </label>
          <textarea
            rows={4}
            value={details}
            maxLength={1000}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Give the moderation team some context."
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {details.length}/1000
          </p>
        </div>
      </div>
    </Modal>
  );
}
