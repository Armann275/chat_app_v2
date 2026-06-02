import { useSocketStore } from '@/stores/socketStore';
import { formatLastSeen } from '@/utils/presence';
import { cn } from '@/utils/cn';

// Live "Online" / "last seen …" label for a user. Prefers real-time presence
// from the socket store, falling back to the user's persisted lastSeenAt.
export default function PresenceStatus({ userId, lastSeenAt, className }) {
  const presence = useSocketStore((s) => s.presence.get(userId));
  const online = presence?.online === true;
  const effectiveLastSeen = presence?.lastSeenAt ?? lastSeenAt;

  if (online) {
    return (
      <span className={cn(className, 'text-emerald-600 dark:text-emerald-400')}>
        Online
      </span>
    );
  }
  return <span className={className}>{formatLastSeen(effectiveLastSeen)}</span>;
}
