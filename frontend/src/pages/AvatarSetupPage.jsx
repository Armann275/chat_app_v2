import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import AvatarPickerStep from '@/components/auth/AvatarPickerStep';

export default function AvatarSetupPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const finish = () => navigate('/', { replace: true });

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-900">
      <div className="mx-auto w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Pick your avatar
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Choose a style and re-roll until you find one you like. You can change it or upload a real photo later from your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={finish}
            className="shrink-0 text-sm text-slate-500 hover:underline dark:text-slate-400"
          >
            Skip for now
          </button>
        </div>
        <AvatarPickerStep initialSeed={user?.username} onComplete={finish} />
      </div>
    </main>
  );
}
