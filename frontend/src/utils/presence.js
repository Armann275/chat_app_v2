import { formatDistanceToNow } from 'date-fns';

// Human-readable "last seen" label from a timestamp. Returns a neutral
// "Offline" when we have no last-seen information (e.g. hidden by privacy).
export function formatLastSeen(lastSeenAt) {
  if (!lastSeenAt) return 'Offline';
  const date = new Date(lastSeenAt);
  if (Number.isNaN(date.getTime())) return 'Offline';
  return `last seen ${formatDistanceToNow(date, { addSuffix: true })}`;
}
