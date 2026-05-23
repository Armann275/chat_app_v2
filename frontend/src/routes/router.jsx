import { createBrowserRouter } from 'react-router-dom';
import HomePage from '@/pages/HomePage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import VerifyEmailPage from '@/pages/VerifyEmailPage';
import AvatarSetupPage from '@/pages/AvatarSetupPage';
import ProfilePage from '@/pages/ProfilePage';
import ChatPage from '@/pages/ChatPage';
import StarredPage from '@/pages/StarredPage';
import NotificationsPage from '@/pages/NotificationsPage';
import FriendsPage from '@/pages/FriendsPage';
import MapPage from '@/pages/MapPage';
import ProtectedRoute from '@/routes/ProtectedRoute';
import GuestRoute from '@/routes/GuestRoute';
import AppShell from '@/components/layout/AppShell';

export const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/avatar-setup', element: <AvatarSetupPage /> },
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/profile', element: <ProfilePage /> },
          { path: '/chats/:chatId', element: <ChatPage /> },
          { path: '/starred', element: <StarredPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/friends', element: <FriendsPage /> },
          { path: '/map', element: <MapPage /> },
        ],
      },
    ],
  },
]);
