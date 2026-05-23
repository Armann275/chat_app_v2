import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSocket } from '@/socket/client';

const MIN_INTERVAL_MS = 60_000;
const MIN_DISTANCE_M = 200;

function haversineMeters(a, b) {
  const R = 6_371_000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function useLocationSharing(enabled) {
  const [supported] = useState(
    typeof navigator !== 'undefined' && 'geolocation' in navigator,
  );
  const [lastSent, setLastSent] = useState(null);
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(null);

  useEffect(() => {
    if (!enabled || !supported) return undefined;

    const onPosition = (pos) => {
      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      const now = Date.now();
      const prev = lastSentRef.current;
      const farEnough =
        !prev || haversineMeters(prev.coords, coords) >= MIN_DISTANCE_M;
      const longEnough = !prev || now - prev.at >= MIN_INTERVAL_MS;

      if (prev && !farEnough && !longEnough) return;

      const socket = getSocket();
      socket.emit('location:update', coords, (ack) => {
        if (ack?.ok) {
          lastSentRef.current = { coords, at: now };
          setLastSent({ coords, at: now });
        }
      });
    };

    const onError = (err) => {
      toast.error(
        err.code === err.PERMISSION_DENIED
          ? 'Location permission denied. Enable it in your browser settings to share your location.'
          : 'Could not read your location.',
      );
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: false,
      maximumAge: 30_000,
      timeout: 15_000,
    });

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [enabled, supported]);

  return { supported, lastSent };
}
