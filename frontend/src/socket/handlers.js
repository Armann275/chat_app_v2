import { toast } from 'sonner';
import { messageKeys } from '@/queries/message.queries';
import { chatKeys } from '@/queries/chat.queries';
import { pinKeys } from '@/queries/pin.queries';
import { friendKeys } from '@/queries/friend.queries';
import { privacyKeys } from '@/queries/privacy.queries';
import { appendToThreadCache } from '@/queries/thread.queries';
import { useSocketStore } from '@/stores/socketStore';
import { useLinkPreviewStore } from '@/stores/linkPreviewStore';
import { SocketEvents } from './events';

function upsertMessageInList(queryClient, chatId, message) {
  queryClient.setQueryData(messageKeys.list(chatId), (prev) => {
    if (!prev) return prev;
    const [first, ...rest] = prev.pages;
    if (!first) return prev;
    if (first.some((m) => m.id === message.id)) {
      return {
        ...prev,
        pages: [first.map((m) => (m.id === message.id ? message : m)), ...rest],
      };
    }
    return { ...prev, pages: [[message, ...first], ...rest] };
  });
}

function patchMessageInList(queryClient, chatId, messageId, patcher) {
  queryClient.setQueryData(messageKeys.list(chatId), (prev) => {
    if (!prev) return prev;
    return {
      ...prev,
      pages: prev.pages.map((page) =>
        page.map((m) => (m.id === messageId ? patcher(m) : m)),
      ),
    };
  });
}

function patchMessageInAllLists(queryClient, messageId, patcher) {
  const lists = queryClient.getQueriesData({ queryKey: ['messages', 'list'] });
  for (const [key] of lists) {
    const chatId = key[2];
    patchMessageInList(queryClient, chatId, messageId, patcher);
  }
}

export function registerSocketHandlers(socket, queryClient) {
  const setStatus = useSocketStore.getState().setStatus;
  const setUserTyping = useSocketStore.getState().setUserTyping;
  const setPresence = useSocketStore.getState().setPresence;

  socket.on('connect', () => setStatus('connected'));
  socket.on('disconnect', () => setStatus('disconnected'));
  socket.on('connect_error', () => setStatus('disconnected'));
  socket.io.on('reconnect_attempt', () => setStatus('connecting'));

  socket.on(SocketEvents.MessageNew, (message) => {
    upsertMessageInList(queryClient, message.chatId, message);
    if (message.threadRootId) {
      appendToThreadCache(queryClient, message.threadRootId, message);
    }
    queryClient.invalidateQueries({ queryKey: chatKeys.list });
    queryClient.invalidateQueries({ queryKey: chatKeys.requests });
  });

  socket.on(SocketEvents.MessageEdited, (message) => {
    patchMessageInList(queryClient, message.chatId, message.id, () => message);
  });

  socket.on(SocketEvents.MessageDeleted, ({ id, deletedAt }) => {
    patchMessageInAllLists(queryClient, id, (m) => ({
      ...m, deletedAt: deletedAt ?? new Date().toISOString(), content: '',
    }));
  });

  socket.on(SocketEvents.MessageSeen, ({ messageId, userId, seenAt }) => {
    patchMessageInAllLists(queryClient, messageId, (m) => ({
      ...m,
      seenBy: { ...(m.seenBy ?? {}), [userId]: seenAt },
      status: 'seen',
    }));
  });

  socket.on(SocketEvents.MessagePinned, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: pinKeys.forChat(chatId) });
  });
  socket.on(SocketEvents.MessageUnpinned, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: pinKeys.forChat(chatId) });
  });

  socket.on(SocketEvents.ReactionAdded, ({ messageId, userId, emoji }) => {
    patchMessageInAllLists(queryClient, messageId, (m) => {
      const reactions = m.reactions ?? [];
      if (reactions.some((r) => r.userId === userId && r.emoji === emoji)) return m;
      return {
        ...m,
        reactions: [...reactions, { userId, emoji, createdAt: new Date().toISOString() }],
      };
    });
  });
  socket.on(SocketEvents.ReactionRemoved, ({ messageId, userId, emoji }) => {
    patchMessageInAllLists(queryClient, messageId, (m) => ({
      ...m,
      reactions: (m.reactions ?? []).filter(
        (r) => !(r.userId === userId && r.emoji === emoji),
      ),
    }));
  });

  socket.on(SocketEvents.ThreadReply, ({ message }) => {
    if (!message?.threadRootId) return;
    appendToThreadCache(queryClient, message.threadRootId, message);
  });

  socket.on(SocketEvents.MessagePreviewAttached, ({ preview }) => {
    if (preview?.url) useLinkPreviewStore.getState().setPreview(preview);
  });

  socket.on(SocketEvents.MessageMentioned, ({ chatId, byUserId }) => {
    toast.message(`You were mentioned`, {
      description: `User ${byUserId.slice(0, 8)} mentioned you in a chat.`,
      action: {
        label: 'Open',
        onClick: () => {
          window.location.assign(`/chats/${chatId}`);
        },
      },
    });
  });

  socket.on(SocketEvents.TypingStart, ({ chatId, userId }) => {
    setUserTyping(chatId, userId, true);
  });
  socket.on(SocketEvents.TypingStop, ({ chatId, userId }) => {
    setUserTyping(chatId, userId, false);
  });

  socket.on(SocketEvents.PresenceOnline, ({ userId }) => {
    setPresence(userId, { online: true });
  });
  socket.on(SocketEvents.PresenceOffline, ({ userId, lastSeenAt }) => {
    setPresence(userId, { online: false, lastSeenAt });
  });

  socket.on(SocketEvents.FriendRequestReceived, ({ request }) => {
    queryClient.invalidateQueries({ queryKey: friendKeys.incoming });
    const name = request?.user?.username;
    toast.message('New friend request', {
      description: name ? `${name} wants to be friends.` : 'You have a new friend request.',
      action: { label: 'Open', onClick: () => window.location.assign('/friends') },
    });
  });
  socket.on(SocketEvents.FriendRequestAccepted, () => {
    queryClient.invalidateQueries({ queryKey: friendKeys.outgoing });
    queryClient.invalidateQueries({ queryKey: friendKeys.list });
    toast.success('Friend request accepted');
  });
  socket.on(SocketEvents.FriendRequestRejected, () => {
    queryClient.invalidateQueries({ queryKey: friendKeys.outgoing });
  });
  socket.on(SocketEvents.FriendRequestCancelled, () => {
    queryClient.invalidateQueries({ queryKey: friendKeys.incoming });
  });
  socket.on(SocketEvents.FriendRemoved, () => {
    queryClient.invalidateQueries({ queryKey: friendKeys.list });
  });

  socket.on(SocketEvents.PrivacyUpdated, (payload) => {
    queryClient.setQueryData(privacyKeys.mine, payload);
  });

  socket.on(SocketEvents.ChatRequestReceived, ({ chat }) => {
    queryClient.invalidateQueries({ queryKey: chatKeys.requests });
    const name = chat?.otherUser?.username;
    toast.message('New chat request', {
      description: name ? `${name} sent you a chat request.` : 'You have a new chat request.',
      action: { label: 'Open', onClick: () => window.location.assign('/') },
    });
  });
  socket.on(SocketEvents.ChatRequestAccepted, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: chatKeys.list });
    queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    toast.success('Your chat request was accepted');
  });
  socket.on(SocketEvents.ChatRequestRejected, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: chatKeys.list });
    queryClient.removeQueries({ queryKey: chatKeys.detail(chatId) });
    toast('Your chat request was declined');
  });
  socket.on(SocketEvents.ChatStatusChanged, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    queryClient.invalidateQueries({ queryKey: chatKeys.list });
    queryClient.invalidateQueries({ queryKey: chatKeys.requests });
  });
}

export function unregisterSocketHandlers(socket) {
  if (!socket) return;
  socket.off();
  socket.io.off('reconnect_attempt');
}
