import { Link } from 'react-router-dom';
import { Bell, LogOut, Menu, Star, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useLogoutMutation } from '@/queries/auth.queries';
import { useUiStore } from '@/stores/uiStore';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/ui/ThemeToggle';
import SearchBar from '@/components/chat/SearchBar';

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logoutMutation = useLogoutMutation();
  const openSidebar = useUiStore((s) => s.openSidebar);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      toast.error('Could not sign out. Please try again.');
    }
  };

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openSidebar}
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 md:hidden dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Open chats"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/" className="text-base font-semibold text-slate-900 dark:text-slate-100">
          Chat
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <SearchBar />
        <Link
          to="/starred"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-500 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Starred messages"
          title="Starred messages"
        >
          <Star className="h-4 w-4" />
        </Link>
        <Link
          to="/notifications"
          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Notifications"
          title="Notification settings"
        >
          <Bell className="h-4 w-4" />
        </Link>
        <ThemeToggle />
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Open profile"
        >
          <Avatar src={user?.avatarUrl} name={user?.username} size="sm" />
          <span className="hidden text-sm font-medium text-slate-700 sm:inline dark:text-slate-200">
            {user?.username ?? 'Profile'}
          </span>
          <User className="h-4 w-4 text-slate-500 sm:hidden dark:text-slate-400" />
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">
            {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
          </span>
        </Button>
      </div>
    </header>
  );
}
