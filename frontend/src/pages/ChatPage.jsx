import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import Spinner from '@/components/ui/Spinner';
import ChatHeader from '@/components/chat/ChatHeader';
import MembersDrawer from '@/components/chat/MembersDrawer';
import PinsDrawer from '@/components/chat/PinsDrawer';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import RequestChatBanner from '@/components/chat/RequestChatBanner';
import TypingIndicator from '@/components/chat/TypingIndicator';
import ForwardModal from '@/components/chat/ForwardModal';
import ThreadPanel from '@/components/chat/ThreadPanel';
import InviteLinksModal from '@/components/chat/InviteLinksModal';
import JoinRequestsModal from '@/components/chat/JoinRequestsModal';
import PollsModal from '@/components/chat/PollsModal';
import { useChatQuery } from '@/queries/chat.queries';
import { useJoinRequestsQuery } from '@/queries/joinRequest.queries';
import {
  useEditMessageMutation,
  useDeleteMessageMutation,
} from '@/queries/message.queries';
import {
  useAddReactionMutation,
  useRemoveReactionMutation,
} from '@/queries/reaction.queries';
import { usePinsQuery, usePinMutation, useUnpinMutation } from '@/queries/pin.queries';
import { useStarredQuery, useStarMutation, useUnstarMutation } from '@/queries/star.queries';
import { useUiStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';

export default function ChatPage() {
  const { chatId } = useParams();
  const me = useAuthStore((s) => s.user);
  const setSelectedChatId = useUiStore((s) => s.setSelectedChatId);
  const clearSelectedChat = useUiStore((s) => s.clearSelectedChat);

  const [membersOpen, setMembersOpen] = useState(false);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [invitesOpen, setInvitesOpen] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [pollsOpen, setPollsOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [forwardTarget, setForwardTarget] = useState(null);
  const [threadRoot, setThreadRoot] = useState(null);

  const chatQuery = useChatQuery(chatId);
  const editMutation = useEditMessageMutation(chatId);
  const deleteMutation = useDeleteMessageMutation(chatId);
  const addReactionMutation = useAddReactionMutation(chatId, me?.id);
  const removeReactionMutation = useRemoveReactionMutation(chatId, me?.id);
  const pinsQuery = usePinsQuery(chatId);
  const pinMutation = usePinMutation(chatId);
  const unpinMutation = useUnpinMutation(chatId);
  const starredQuery = useStarredQuery();
  const starMutation = useStarMutation();
  const unstarMutation = useUnstarMutation();

  useEffect(() => {
    setSelectedChatId(chatId);
    setReplyTarget(null);
    setEditingId(null);
    setForwardTarget(null);
    setThreadRoot(null);
    setPinsOpen(false);
    setInvitesOpen(false);
    setRequestsOpen(false);
    setPollsOpen(false);
    return () => clearSelectedChat();
  }, [chatId, setSelectedChatId, clearSelectedChat]);

  const myMembership = chatQuery.data?.members?.find((m) => m.userId === me?.id);
  const iAmAdmin = myMembership?.role === 'admin';
  const joinRequestsQuery = useJoinRequestsQuery(chatId, {
    enabled: Boolean(chatId) && iAmAdmin && chatQuery.data?.type !== 'direct',
  });

  const pinnedIds = useMemo(
    () => new Set((pinsQuery.data ?? []).map((p) => p.messageId)),
    [pinsQuery.data],
  );
  const starredIds = useMemo(
    () => new Set((starredQuery.data ?? []).map((m) => m.id)),
    [starredQuery.data],
  );

  if (chatQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }
  if (chatQuery.isError) {
    const status = chatQuery.error?.response?.status;
    return (
      <div className="p-6 text-sm text-red-600">
        {status === 403 || status === 404
          ? 'This chat is no longer available.'
          : 'Could not load chat. Refresh and try again.'}
      </div>
    );
  }

  const chat = chatQuery.data;
  const memberById = new Map();
  for (const m of chat.members ?? []) {
    if (m.user) memberById.set(m.userId, m.user);
  }

  const handleSubmitEdit = (message, content) => {
    editMutation.mutate(
      { messageId: message.id, content },
      {
        onError: (err) => {
          const msg = err?.response?.data?.message ?? 'Could not edit message.';
          toast.error(msg);
        },
        onSettled: () => setEditingId(null),
      },
    );
  };

  const handleDelete = (message, mode) => {
    deleteMutation.mutate(
      { messageId: message.id, mode },
      {
        onError: (err) => {
          const msg = err?.response?.data?.message ?? 'Could not delete message.';
          toast.error(msg);
        },
      },
    );
  };

  const handleReact = (message, emoji, mine) => {
    if (mine) {
      removeReactionMutation.mutate({ messageId: message.id, emoji });
    } else {
      addReactionMutation.mutate({ messageId: message.id, emoji });
    }
  };

  const handleReply = (message, sender) => {
    setReplyTarget({
      id: message.id,
      content: message.content ?? '',
      senderName: sender?.username,
    });
  };

  const handleReplyInThread = (message, sender) => {
    setThreadRoot({
      ...message,
      _senderUsername: sender?.username,
    });
  };

  const handlePinToggle = (message) => {
    if (pinnedIds.has(message.id)) {
      unpinMutation.mutate(message.id);
    } else {
      pinMutation.mutate(message.id);
    }
  };

  const handleStarToggle = (message) => {
    if (starredIds.has(message.id)) {
      unstarMutation.mutate(message.id);
    } else {
      starMutation.mutate(message.id);
    }
  };

  const isRequestChat = chat.status === 'request';
  const isRequestRecipient = isRequestChat && chat.requestTargetUserId === me?.id;
  const isRequester = isRequestChat && chat.requestedByUserId === me?.id;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ChatHeader
        chat={chat}
        onOpenMembers={() => setMembersOpen(true)}
        onOpenPins={() => setPinsOpen(true)}
        pinnedCount={pinnedIds.size}
        onOpenInviteLinks={() => setInvitesOpen(true)}
        onOpenJoinRequests={() => setRequestsOpen(true)}
        onOpenPolls={() => setPollsOpen(true)}
        pendingJoinCount={joinRequestsQuery.data?.length ?? 0}
      />
      {isRequestRecipient && <RequestChatBanner chat={chat} />}
      {isRequester && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Waiting for {chat.otherUser?.username ?? 'them'} to accept your chat request. You can still send messages.
        </div>
      )}
      <MessageList
        chat={chat}
        pinnedIds={pinnedIds}
        starredIds={starredIds}
        editingId={editingId}
        onStartEdit={(m) => setEditingId(m.id)}
        onCancelEdit={() => setEditingId(null)}
        onSubmitEdit={handleSubmitEdit}
        onDelete={handleDelete}
        onReact={handleReact}
        onReply={handleReply}
        onReplyInThread={handleReplyInThread}
        onForward={(m) => setForwardTarget(m.id)}
        onPinToggle={handlePinToggle}
        onStarToggle={handleStarToggle}
      />
      <TypingIndicator chat={chat} />
      {isRequestRecipient ? (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Accept the chat request above to reply.
        </div>
      ) : (
        <MessageInput
          chat={chat}
          replyTarget={replyTarget}
          onClearReply={() => setReplyTarget(null)}
        />
      )}

      <MembersDrawer
        chat={chat}
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
      />
      <PinsDrawer
        chat={chat}
        open={pinsOpen}
        onClose={() => setPinsOpen(false)}
      />
      <ForwardModal
        open={Boolean(forwardTarget)}
        onClose={() => setForwardTarget(null)}
        messageIds={forwardTarget ? [forwardTarget] : []}
      />
      <ThreadPanel
        chat={chat}
        rootMessage={threadRoot}
        open={Boolean(threadRoot)}
        onClose={() => setThreadRoot(null)}
      />
      <InviteLinksModal
        chatId={chat.id}
        open={invitesOpen}
        onClose={() => setInvitesOpen(false)}
      />
      <JoinRequestsModal
        chatId={chat.id}
        open={requestsOpen}
        onClose={() => setRequestsOpen(false)}
      />
      <PollsModal
        chat={chat}
        open={pollsOpen}
        onClose={() => setPollsOpen(false)}
      />
    </div>
  );
}
