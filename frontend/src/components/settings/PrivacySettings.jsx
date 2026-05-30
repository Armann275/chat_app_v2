import { toast } from 'sonner';
import { Lock, Eye, Image as ImageIcon } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useMyPrivacyQuery, useUpdatePrivacyMutation } from '@/queries/privacy.queries';

const MESSAGE_OPTIONS = [
  { value: 'everyone', label: 'Everyone', description: 'Anyone can start a chat with you.' },
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

const VISIBILITY_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends only' },
  { value: 'nobody', label: 'Nobody' },
];

function PrivacyGroup({ icon: Icon, title, description, name, value, onChange, options, disabled }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
      </div>
      {description && (
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      )}
      <fieldset className="space-y-2" disabled={disabled} aria-busy={disabled}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-start gap-3 rounded-md border border-transparent p-2 hover:border-slate-200 dark:hover:border-slate-700"
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {opt.label}
              </p>
              {opt.description && (
                <p className="text-xs text-slate-500 dark:text-slate-400">{opt.description}</p>
              )}
            </div>
          </label>
        ))}
      </fieldset>
    </section>
  );
}

export default function PrivacySettings() {
  const privacyQuery = useMyPrivacyQuery();
  const updateMutation = useUpdatePrivacyMutation();

  const whoCanMessage = privacyQuery.data?.whoCanMessage ?? 'everyone';
  const lastSeenVisibility = privacyQuery.data?.lastSeenVisibility ?? 'everyone';
  const profilePhotoVisibility = privacyQuery.data?.profilePhotoVisibility ?? 'everyone';

  const update = async (patch, successMessage) => {
    try {
      await updateMutation.mutateAsync(patch);
      toast.success(successMessage);
    } catch (err) {
      const message = err?.response?.data?.message ?? 'Could not update privacy.';
      toast.error(message);
    }
  };

  if (privacyQuery.isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (privacyQuery.isError) {
    return (
      <p className="text-sm text-red-600">Could not load your privacy settings.</p>
    );
  }

  return (
    <div className="space-y-4">
      <PrivacyGroup
        icon={Lock}
        title="Who can message you"
        name="who-can-message"
        value={whoCanMessage}
        onChange={(v) => v !== whoCanMessage && update({ whoCanMessage: v }, 'Privacy updated')}
        options={MESSAGE_OPTIONS}
        disabled={updateMutation.isPending}
      />
      <PrivacyGroup
        icon={Eye}
        title="Last seen visibility"
        description="Who can see when you were last online."
        name="last-seen"
        value={lastSeenVisibility}
        onChange={(v) =>
          v !== lastSeenVisibility && update({ lastSeenVisibility: v }, 'Last seen visibility updated')
        }
        options={VISIBILITY_OPTIONS}
        disabled={updateMutation.isPending}
      />
      <PrivacyGroup
        icon={ImageIcon}
        title="Profile photo visibility"
        description="Who can see your profile photo."
        name="profile-photo"
        value={profilePhotoVisibility}
        onChange={(v) =>
          v !== profilePhotoVisibility &&
          update({ profilePhotoVisibility: v }, 'Profile photo visibility updated')
        }
        options={VISIBILITY_OPTIONS}
        disabled={updateMutation.isPending}
      />
    </div>
  );
}
