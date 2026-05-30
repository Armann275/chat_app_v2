import { useEffect, useState } from 'react';
import { Map as MapIcon, Lock, Ghost, EyeOff } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import FriendMap from '@/components/map/FriendMap';
import MapPrivacyDrawer from '@/components/map/MapPrivacyDrawer';
import {
  useMapFriendsQuery,
  useMapPrivacyQuery,
  useClearMyLocationMutation,
} from '@/queries/map.queries';
import { useMapStore } from '@/stores/mapStore';
import { useAuthStore } from '@/stores/authStore';
import { useLocationSharing } from '@/hooks/useLocationSharing';

const FRESH_WINDOW_MS = 24 * 60 * 60 * 1000;
const TICK_INTERVAL_MS = 60_000;

export default function MapPage() {
  const friendsQuery = useMapFriendsQuery();
  const privacyQuery = useMapPrivacyQuery();
  const clearMyLocation = useClearMyLocationMutation();
  const me = useAuthStore((s) => s.user);
  const hydrate = useMapStore((s) => s.hydrate);
  const friendLocations = useMapStore((s) => s.friendLocations);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [, setTick] = useState(0);
  const { supported, lastSent } = useLocationSharing(sharing);

  useEffect(() => {
    if (friendsQuery.data) hydrate(friendsQuery.data);
  }, [friendsQuery.data, hydrate]);

  // Re-render every minute so "X ago" labels stay current and stale friends
  // drop off without a refetch. The effect also evicts entries from the
  // store so reconnects don't replay locations older than the cutoff.
  useEffect(() => {
    const sweep = () => {
      setTick((t) => t + 1);
      const now = Date.now();
      const current = useMapStore.getState().friendLocations;
      for (const loc of Object.values(current)) {
        if (!loc.updatedAt) continue;
        const ts = new Date(loc.updatedAt).getTime();
        if (!Number.isFinite(ts) || now - ts > FRESH_WINDOW_MS) {
          useMapStore.getState().removeFriend(loc.userId);
        }
      }
    };
    sweep();
    const id = setInterval(sweep, TICK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Defensive display-time filter (handles entries within the window of the
  // last sweep tick).
  const friends = [];
  {
    const now = Date.now();
    for (const loc of Object.values(friendLocations)) {
      if (!loc.updatedAt) continue;
      const ts = new Date(loc.updatedAt).getTime();
      if (!Number.isFinite(ts) || now - ts > FRESH_WINDOW_MS) continue;
      friends.push(loc);
    }
  }
  const myLocation = lastSent
    ? {
        latitude: lastSent.coords.latitude,
        longitude: lastSent.coords.longitude,
        user: me,
      }
    : null;

  const privacyMode = privacyQuery.data?.mode ?? 'nobody';
  const ghostMode = privacyMode === 'nobody';

  const handleToggleSharing = async () => {
    if (sharing) {
      setSharing(false);
      try {
        await clearMyLocation.mutateAsync();
      } catch {
        /* server-side clear is best-effort; UI state still flips */
      }
    } else {
      if (ghostMode) {
        setDrawerOpen(true);
        return;
      }
      setSharing(true);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Friend Map
          </h1>
          {ghostMode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Ghost className="h-3 w-3" /> Ghost Mode
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setDrawerOpen(true)}
          >
            <Lock className="h-4 w-4" /> Privacy
          </Button>
          <Button
            type="button"
            size="sm"
            variant={sharing ? 'primary' : 'secondary'}
            onClick={handleToggleSharing}
            disabled={!supported}
            title={supported ? undefined : 'Geolocation is not supported in this browser'}
          >
            {sharing ? (
              <>
                <EyeOff className="h-4 w-4" /> Stop sharing
              </>
            ) : (
              'Share my location'
            )}
          </Button>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {friendsQuery.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : (
          <FriendMap friends={friends} myLocation={myLocation} />
        )}
      </div>

      <MapPrivacyDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
