import { toast } from 'sonner';
import { Bell } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import {
  useMyPreferencesQuery,
  useUpdateMyPreferencesMutation,
} from '@/queries/preferences.queries';

export default function NotificationsPage() {
  const prefsQuery = useMyPreferencesQuery();
  const updateMutation = useUpdateMyPreferencesMutation();
  const prefs = prefsQuery.data;

  const toggle = async (key) => {
    try {
      await updateMutation.mutateAsync({ [key]: !prefs[key] });
      toast.success('Preferences updated');
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Could not update preferences.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
        <Bell className="h-5 w-5" />
        Notifications
      </h1>

      {prefsQuery.isLoading || !prefs ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Allow notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Show toasts for new messages and mentions. Per-chat overrides apply on top of this.
              </p>
            </div>
            <Button
              variant={prefs.notificationsEnabled ? 'secondary' : 'primary'}
              size="sm"
              onClick={() => toggle('notificationsEnabled')}
              disabled={updateMutation.isPending}
            >
              {prefs.notificationsEnabled ? 'On' : 'Off'}
            </Button>
          </div>
          <p className="pt-2 text-xs text-slate-500 dark:text-slate-400">
            Per-chat mute &amp; archive lives on each chat — open a chat and click the settings icon
            in the header to change it.
          </p>
        </div>
      )}
    </div>
  );
}
