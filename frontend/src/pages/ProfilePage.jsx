import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import {
  useProfileQuery,
  useUpdateProfileMutation,
} from '@/queries/user.queries';
import {
  useUploadCustomPhotoMutation,
  useClearCustomPhotoMutation,
} from '@/queries/avatar.queries';
import PrivacySettings from '@/components/settings/PrivacySettings';
import BlockedUsersSection from '@/components/settings/BlockedUsersSection';
import SessionsSection from '@/components/settings/SessionsSection';
import TwoFactorSection from '@/components/settings/TwoFactorSection';

const profileSchema = z.object({
  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or fewer')
    .optional(),
});

export default function ProfilePage() {
  const profileQuery = useProfileQuery();
  const updateMutation = useUpdateProfileMutation();
  const uploadCustom = useUploadCustomPhotoMutation();
  const clearCustom = useClearCustomPhotoMutation();
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { bio: '' },
  });

  useEffect(() => {
    if (profileQuery.data) {
      reset({ bio: profileQuery.data.bio ?? '' });
    }
  }, [profileQuery.data, reset]);

  const onSubmit = async (values) => {
    try {
      await updateMutation.mutateAsync({
        bio: values.bio?.length ? values.bio : null,
      });
      toast.success('Profile updated');
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not update profile. Please try again.';
      toast.error(message);
    }
  };

  const handleCustomFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please pick an image file');
      return;
    }
    try {
      await uploadCustom.mutateAsync(file);
      toast.success('Photo updated');
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not upload photo.';
      toast.error(message);
    }
  };

  const handleClearCustom = async () => {
    try {
      await clearCustom.mutateAsync();
      toast.success('Custom photo removed');
    } catch (err) {
      const message =
        err?.response?.data?.message ?? 'Could not remove photo.';
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
  const hasCustom = user.avatarSource === 'custom' && user.customPhotoUrl;

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Profile
      </h1>

      <section className="mt-6 flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <Avatar user={user} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
            {user.username}
          </p>
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">
            {user.email}
          </p>
        </div>
      </section>

      <section className="mt-6 space-y-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Avatar
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {user.avatarSource === 'custom'
            ? 'A custom photo is currently shown.'
            : user.avatarSource === 'generated'
              ? 'Your generated avatar is currently shown.'
              : 'No avatar yet — scan one or upload a photo.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/avatar-setup')}
          >
            {user.avatarSource === 'generated' ? 'Change avatar' : 'Pick avatar'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadCustom.isPending}
          >
            {uploadCustom.isPending ? 'Uploading…' : 'Upload custom photo'}
          </Button>
          {hasCustom && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClearCustom}
              disabled={clearCustom.isPending}
            >
              Remove custom photo
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCustomFile}
          />
        </div>
      </section>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-6 space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
        noValidate
      >
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
            onClick={() => reset({ bio: user.bio ?? '' })}
            disabled={!isDirty || updateMutation.isPending}
          >
            Reset
          </Button>
          <Button type="submit" disabled={!isDirty || updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>

      <div className="mt-6">
        <PrivacySettings />
      </div>

      <div className="mt-6">
        <TwoFactorSection />
      </div>

      <div className="mt-6">
        <SessionsSection />
      </div>

      <div className="mt-6">
        <BlockedUsersSection />
      </div>
    </div>
  );
}
