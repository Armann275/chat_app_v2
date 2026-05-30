import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from '@/routes/router';
import { useBootAuth } from '@/hooks/useBootAuth';
import { useSocket } from '@/hooks/useSocket';
import { useSyncOnReconnect } from '@/hooks/useSyncOnReconnect';
import CallOverlay from '@/components/call/CallOverlay';

export default function App() {
  useBootAuth();
  useSocket();
  useSyncOnReconnect();

  return (
    <>
      <RouterProvider router={router} />
      <CallOverlay />
      <Toaster position="top-right" richColors />
    </>
  );
}
