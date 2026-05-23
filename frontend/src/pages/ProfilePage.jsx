import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { useProfileQuery, useUpdateProfileMutation } from '@/queries/user.queries';
import PrivacySettings from '@/components/settings/PrivacySettings';

const profileSchema = z.object({
  avatarUrl: z
    .string()
    .trim()
    .max(1024, 'Must be 1024 characters or fewer')
    .url('Must be a valid URL')
    .or(z.literal(''))
    .optional(),
  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or fewer')
    .optional(),
});

export default function ProfilePage() {
  const profileQuery = useProfileQuery();
  const updateMutation = useUpdateProfileMutation();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { avatarUrl: '', bio: '' },
  });

  useEffect(() => {
    if (profileQuery.data) {
      reset({
        avatarUrl: profileQuery.data.avatarUrl ?? '',
        bio: profileQuery.data.bio ?? '',
      });
    }
  }, [profileQuery.data, reset]);

  const onSubmit = async (values) => {
    try {
      await updateMutation.mutateAsync({
        avatarUrl: values.avatarUrl?.trim() ? values.avatarUrl.trim() : null,
        bio: values.bio?.length ? values.bio : null,
      });
      toast.success('Profile updated');
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not update profile. Please try again.';
      toast.error(message);
    }
  };

  if (profileQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="p-6 text-sm text-red-600">
        Could not load profile. Please refresh and try again.
      </div>
    );
  }

  const user = profileQuery.data;
  const previewAvatar = watch('avatarUrl');

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Profile
      </h1>

      <section className="mt-6 flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Avatar src={previewAvatar || user.avatarUrl} name={user.username} size="xl" />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
            {user.username}
          </p>
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">
            {user.email}
          </p>
        </div>
      </section>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        noValidate
      >
        <Input
          label="Avatar URL"
          type="url"
          placeholder="https://…"
          error={errors.avatarUrl?.message}
          {...register('avatarUrl')}
        />

        <div className="space-y-1">
          <label
            htmlFor="bio"
            className="block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Bio
          </label>
          <textarea
            id="bio"
            rows={4}
            placeholder="Tell people a little about yourself"
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            {...register('bio')}
          />
          {errors.bio && (
            <p className="text-sm text-red-600" role="alert">
              {errors.bio.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              reset({ avatarUrl: user.avatarUrl ?? '', bio: user.bio ?? '' })
            }
            disabled={!isDirty || updateMutation.isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <PrivacySettings />
      </div>
    </div>
  );
}
