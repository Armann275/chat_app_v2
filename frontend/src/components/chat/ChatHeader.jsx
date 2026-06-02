import { Users, User, Settings, Pin, Link as LinkIcon, UserCheck, BarChart3, Megaphone, Hourglass } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import PresenceDot from '@/components/chat/PresenceDot';
import PresenceStatus from '@/components/chat/PresenceStatus';
import ChatPrefsMenu from '@/components/chat/ChatPrefsMenu';
import CallButtons from '@/components/call/CallButtons';
import DirectChatActionsMenu from '@/components/chat/DirectChatActionsMenu';
import DisappearingMenu, { formatDisappearing } from '@/components/chat/DisappearingMenu';
import { useAuthStore } from '@/stores/authStore';

function directOther(chat, myId) {
  return chat.members?.find((m) => m.userId !== myId);
}

export default function ChatHeader({
  chat, onOpenMembers, onOpenPins, pinnedCount = 0,
  onOpenInviteLinks, onOpenJoinRequests, onOpenPolls,
  pendingJoinCount = 0,
}) {
  const me = useAuthStore((s) => s.user);

  const isDirect = chat.type === 'direct';
  const isChannel = chat.type === 'channel';
  const isGroupLike = !isDirect;
  const other = isDirect ? directOther(chat, me?.id) : null;
  const title = isGroupLike
    ? chat.name ?? (isChannel ? 'Untitled channel' : 'Untitled group')
    : other?.user?.username ?? 'Direct chat';
  const memberCount = chat.members?.length ?? 0;
  const Icon = isChannel ? Megaphone : isGroupLike ? Users : User;
  const groupSubtitle = `${isChannel ? 'Channel · ' : ''}${memberCount} member${
    memberCount === 1 ? '' : 's'
  }`;

  const myMembership = chat.members?.find((m) => m.userId === me?.id);
  const iAmAdmin = myMembership?.role === 'admin';
  const canEditDisappearing = isDirect || iAmAdmin;
  const disappearingLabel = chat.disappearingSeconds
    ? formatDisappearing(chat.disappearingSeconds)
    : null;

  return (
    <header className="flex flex-col gap-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative">
            <Avatar src={other?.user?.avatarUrl} name={title} size="md" />
            {other && (
              <span className="absolute bottom-0 right-0">
                <PresenceDot userId={other.userId} />
              </span>
            )}
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              <Icon className="h-3.5 w-3.5 opacity-70" />
              <span className="truncate">{title}</span>
            </h2>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {isDirect && other ? (
                <PresenceStatus
                  userId={other.userId}
                  lastSeenAt={other.user?.lastSeenAt}
                />
              ) : (
                groupSubtitle
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isDirect && other && <CallButtons chatId={chat.id} />}
          <DisappearingMenu
            chatId={chat.id}
            disappearingSeconds={chat.disappearingSeconds}
            canEdit={canEditDisappearing}
          />
          <ChatPrefsMenu chatId={chat.id} />
          {onOpenPins && (
            <Button variant="secondary" size="sm" onClick={onOpenPins}>
              <Pin className="h-4 w-4" />
              <span className="hidden sm:inline">
                Pinned{pinnedCount > 0 ? ` · ${pinnedCount}` : ''}
              </span>
            </Button>
          )}
          {isGroupLike && onOpenPolls && (
            <Button variant="secondary" size="sm" onClick={onOpenPolls}>
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Polls</span>
            </Button>
          )}
          {isGroupLike && iAmAdmin && onOpenInviteLinks && (
            <Button variant="secondary" size="sm" onClick={onOpenInviteLinks}>
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Invites</span>
            </Button>
          )}
          {isGroupLike && iAmAdmin && onOpenJoinRequests && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenJoinRequests}
              className="relative"
            >
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Requests</span>
              {pendingJoinCount > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                  {pendingJoinCount}
                </span>
              )}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={onOpenMembers}>
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </Button>
          {isDirect && other && (
            <DirectChatActionsMenu
              chatId={chat.id}
              otherUserId={other.userId}
              otherUsername={other.user?.username}
            />
          )}
        </div>
      </div>
      {disappearingLabel && (
        <div className="flex items-center gap-1.5 border-t border-slate-200 bg-amber-50 px-4 py-1 text-xs text-amber-800 dark:border-slate-800 dark:bg-amber-900/20 dark:text-amber-200">
          <Hourglass className="h-3 w-3" />
          Messages in this chat disappear after {disappearingLabel}.
        </div>
      )}
    </header>
  );
}
