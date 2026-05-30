import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { useRedeemInviteMutation } from '@/queries/inviteLink.queries';

export default function InviteRedeemPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const mutation = useRedeemInviteMutation();
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const triedRef = useRef(false);

  useEffect(() => {
    if (triedRef.current || !code) return;
    triedRef.current = true;
    setStatus('joining');
    mutation
      .mutateAsync(code)
      .then((result) => {
        setStatus('done');
        if (result?.alreadyMember) {
          toast('You were already in this chat');
        } else {
          toast.success('Joined chat');
        }
        if (result?.chatId) {
          navigate(`/chats/${result.chatId}`, { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      })
      .catch((err) => {
        setStatus('error');
        setError(err?.response?.data?.message ?? 'Invite is no longer valid');
      });
  }, [code, mutation, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {status === 'joining' && (
          <>
            <Spinner />
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              Redeeming invite…
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Could not join
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{error}</p>
            <Button className="mt-4" onClick={() => navigate('/')}>Go home</Button>
          </>
        )}
      </div>
    </div>
  );
}
