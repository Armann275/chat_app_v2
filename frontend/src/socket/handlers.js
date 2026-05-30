import { toast } from 'sonner';
import { messageKeys } from '@/queries/message.queries';
import { chatKeys } from '@/queries/chat.queries';
import { pinKeys } from '@/queries/pin.queries';
import { friendKeys } from '@/queries/friend.queries';
import { privacyKeys } from '@/queries/privacy.queries';
import { appendToThreadCache } from '@/queries/thread.queries';
import { joinRequestKeys } from '@/queries/joinRequest.queries';
import { pollKeys } from '@/queries/poll.queries';
import { useSocketStore } from '@/stores/socketStore';
import { useLinkPreviewStore } from '@/stores/linkPreviewStore';
import { useMapStore } from '@/stores/mapStore';
import { mapKeys } from '@/queries/map.queries';
import { callKeys } from '@/queries/call.queries';
import { useCallStore } from '@/stores/callStore';
import { useAuthStore } from '@/stores/authStore';
import * as webrtc from '@/calls/webrtc';
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

function isViewingChat(chatId) {
  if (typeof window === 'undefined') return false;
  return window.location.pathname.includes(`/chats/${chatId}`);
}

function updateChatListForNewMessage(queryClient, message, myId) {
  queryClient.setQueryData(chatKeys.list, (chats) => {
    if (!Array.isArray(chats)) return chats;
    const idx = chats.findIndex((c) => c.id === message.chatId);
    if (idx === -1) return chats;
    const existing = chats[idx];
    const isMine = message.senderId === myId;
    const viewing = isViewingChat(message.chatId);
    const isThreadReply = Boolean(message.threadRootId);

    const attachmentKind = message.attachments?.[0]?.kind ?? null;
    const senderUsername =
      message.sender?.username ?? existing.lastMessage?.senderUsername ?? null;

    const updated = {
      ...existing,
      // Bump unread for any incoming message I haven't seen yet (unless I'm here).
      unreadCount:
        !isMine && !viewing
          ? (existing.unreadCount ?? 0) + 1
          : existing.unreadCount ?? 0,
    };

    // Preview/order only reflect top-level messages, matching the backend.
    if (!isThreadReply) {
      updated.lastMessage = {
        id: message.id,
        senderId: message.senderId,
        senderUsername,
        content: message.content ?? '',
        createdAt: message.createdAt,
        deletedAt: message.deletedAt ?? null,
        attachmentKind,
      };
      updated.lastMessageAt = message.createdAt;

      const rest = chats.slice(0, idx).concat(chats.slice(idx + 1));
      return [updated, ...rest];
    }

    const next = chats.slice();
    next[idx] = updated;
    return next;
  });
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
    const myId = useAuthStore.getState().user?.id;
    updateChatListForNewMessage(queryClient, message, myId);
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

  socket.on(SocketEvents.ChatUpdated, ({ chat }) => {
    if (!chat?.id) return;
    queryClient.setQueryData(chatKeys.detail(chat.id), (prev) =>
      prev ? { ...prev, ...chat } : prev,
    );
    queryClient.invalidateQueries({ queryKey: chatKeys.list });
  });

  socket.on(SocketEvents.ChatDisappearingUpdated, ({ chatId, disappearingSeconds }) => {
    queryClient.setQueryData(chatKeys.detail(chatId), (prev) =>
      prev ? { ...prev, disappearingSeconds } : prev,
    );
    queryClient.invalidateQueries({ queryKey: chatKeys.list });
  });

  socket.on(SocketEvents.ChatMemberRoleChanged, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    queryClient.invalidateQueries({ queryKey: chatKeys.members(chatId) });
  });

  socket.on(SocketEvents.ChatMemberAdded, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
    queryClient.invalidateQueries({ queryKey: chatKeys.members(chatId) });
    queryClient.invalidateQueries({ queryKey: joinRequestKeys.list(chatId) });
  });

  socket.on(SocketEvents.ChatJoined, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: chatKeys.list });
    if (chatId) queryClient.invalidateQueries({ queryKey: chatKeys.detail(chatId) });
  });

  socket.on(SocketEvents.ChatJoinRequest, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: joinRequestKeys.list(chatId) });
  });

  socket.on(SocketEvents.ChatJoinApproved, ({ chatId }) => {
    queryClient.invalidateQueries({ queryKey: chatKeys.list });
    toast.success('Your join request was approved');
  });

  socket.on(SocketEvents.ChatJoinRejected, () => {
    toast('Your join request was declined');
  });

  socket.on(SocketEvents.PollCreated, (poll) => {
    queryClient.setQueryData(pollKeys.list(poll.chatId), (prev) =>
      prev ? [poll, ...prev.filter((p) => p.id !== poll.id)] : [poll],
    );
    queryClient.setQueryData(pollKeys.detail(poll.id), poll);
  });

  socket.on(SocketEvents.PollVoted, ({ pollId }) => {
    queryClient.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
    const lists = queryClient.getQueriesData({ queryKey: ['polls', 'list'] });
    for (const [key] of lists) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  });

  socket.on(SocketEvents.PollClosed, ({ pollId }) => {
    queryClient.invalidateQueries({ queryKey: pollKeys.detail(pollId) });
    const lists = queryClient.getQueriesData({ queryKey: ['polls', 'list'] });
    for (const [key] of lists) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  });

  socket.on(SocketEvents.CallInitiated, (call) => {
    const me = useAuthStore.getState().user;
    if (!me || !call) return;
    if (call.initiatorId === me.id) return; // Already handled locally by initiator.
    if (useCallStore.getState().status !== 'idle') return;
    useCallStore.getState().setIncoming({ call, fromUserId: call.initiatorId });
    toast.message('Incoming call', {
      description: call.type === 'video' ? 'Video call' : 'Voice call',
    });
  });

  socket.on(SocketEvents.CallAccepted, () => {
    // The active-state flip happens via peer-connection state change.
  });

  socket.on(SocketEvents.CallRejected, () => {
    toast('Call rejected');
    webrtc.cleanup();
    queryClient.invalidateQueries({ queryKey: callKeys.history });
  });

  socket.on(SocketEvents.CallEnded, () => {
    webrtc.cleanup();
    queryClient.invalidateQueries({ queryKey: callKeys.history });
  });

  socket.on(SocketEvents.CallMissed, (call) => {
    const me = useAuthStore.getState().user;
    if (call?.initiatorId && me?.id && call.initiatorId !== me.id) {
      toast('Missed call');
    }
    webrtc.cleanup();
    queryClient.invalidateQueries({ queryKey: callKeys.history });
  });

  socket.on(SocketEvents.CallOffer, (payload) => {
    webrtc.handleRemoteOffer(payload).catch(() => {});
  });

  socket.on(SocketEvents.CallAnswer, (payload) => {
    webrtc.handleRemoteAnswer(payload).catch(() => {});
  });

  socket.on(SocketEvents.CallIceCandidate, (payload) => {
    webrtc.handleRemoteIceCandidate(payload).catch(() => {});
  });

  socket.on(SocketEvents.FriendLocation, (payload) => {
    useMapStore.getState().upsertFriend(payload);
    queryClient.invalidateQueries({ queryKey: mapKeys.friends });
  });
  socket.on(SocketEvents.FriendLocationCleared, ({ userId }) => {
    useMapStore.getState().removeFriend(userId);
    queryClient.invalidateQueries({ queryKey: mapKeys.friends });
  });
}

export function unregisterSocketHandlers(socket) {
  if (!socket) return;
  socket.off();
  socket.io.off('reconnect_attempt');
}
