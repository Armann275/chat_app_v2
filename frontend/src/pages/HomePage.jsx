import { Link } from 'react-router-dom';
import { MessagesSquare } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

export default function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <MessagesSquare className="mx-auto h-10 w-10 text-indigo-600 dark:text-indigo-400" />
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Welcome{user?.username ? `, ${user.username}` : ''}
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          Pick a chat from the sidebar to get started, or set up your profile first.
        </p>
        <Link
          to="/profile"
          className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Edit profile
        </Link>
      </div>
    </div>
  );
}
