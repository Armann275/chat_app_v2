import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useMyPrivacyQuery, useUpdatePrivacyMutation } from '@/queries/privacy.queries';

const OPTIONS = [
  {
    value: 'everyone',
    label: 'Everyone',
    description: 'Anyone can start a chat with you.',
  },
  {
    value: 'friends',
    label: 'Friends only',
    description:
      'Only your friends can message you directly. Others go to a Requests inbox you can accept or reject.',
  },
  {
    value: 'nobody',
    label: 'Nobody',
    description:
      'No one new can start a chat. Existing conversations keep working.',
  },
];

export default function PrivacySettings() {
  const privacyQuery = useMyPrivacyQuery();
  const updateMutation = useUpdatePrivacyMutation();

  const current = privacyQuery.data?.whoCanMessage ?? 'everyone';

  const handleChange = async (value) => {
    if (value === current) return;
    try {
      await updateMutation.mutateAsync(value);
      toast.success('Privacy updated');
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not update privacy.';
      toast.error(message);
    }
  };

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <Lock className="h-4 w-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Who can message you
        </h2>
      </div>

      {privacyQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : privacyQuery.isError ? (
        <p className="text-sm text-red-600">Could not load your privacy settings.</p>
      ) : (
        <fieldset
          className="space-y-2"
          disabled={updateMutation.isPending}
          aria-busy={updateMutation.isPending}
        >
          {OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 hover:border-slate-200 dark:hover:border-slate-700"
            >
              <input
                type="radio"
                name="who-can-message"
                value={opt.value}
                checked={current === opt.value}
                onChange={() => handleChange(opt.value)}
                className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {opt.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {opt.description}
                </p>
              </div>
            </label>
          ))}
        </fieldset>
      )}
    </section>
  );
}
