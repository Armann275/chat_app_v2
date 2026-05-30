import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import { formatDistanceToNowStrict } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { resolveAttachmentUrl } from '@/api/upload.api';

const FALLBACK_CENTER = [20, 0];
const FALLBACK_ZOOM = 2;

function initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name[0].toUpperCase();
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function formatLastShared(updatedAt) {
  if (!updatedAt) return null;
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'just now';
  return `${formatDistanceToNowStrict(date)} ago`;
}

function avatarIcon({ url, name, ring = 'ring-white', updatedAt }) {
  const resolved = url ? resolveAttachmentUrl(url) : null;
  const inner = resolved
    ? `<img src="${escapeHtml(resolved)}" alt="" style="width:100%;height:100%;object-fit:cover;" />`
    : `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#4338ca;font-weight:600;font-size:14px;">${escapeHtml(initialsFor(name))}</span>`;

  const lastShared = formatLastShared(updatedAt);
  const height = lastShared ? 70 : 56;

  return L.divIcon({
    className: 'avatar-marker',
    iconSize: [56, height],
    iconAnchor: [28, height],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="${ring}" style="width:40px;height:40px;border-radius:9999px;overflow:hidden;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4);background:#e0e7ff;">
          ${inner}
        </div>
        ${name ? `<span style="margin-top:2px;background:rgba(255,255,255,0.92);color:#1e293b;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,0.15);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(name)}</span>` : ''}
        ${lastShared ? `<span style="margin-top:1px;background:rgba(15,23,42,0.78);color:white;padding:1px 5px;border-radius:4px;font-size:9px;font-weight:500;box-shadow:0 1px 2px rgba(0,0,0,0.15);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(lastShared)}</span>` : ''}
      </div>
    `,
  });
}

function fitToPoints(points) {
  if (!points || points.length === 0) {
    return { center: FALLBACK_CENTER, zoom: FALLBACK_ZOOM };
  }
  if (points.length === 1) {
    return { center: [points[0].latitude, points[0].longitude], zoom: 13 };
  }
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  return {
    center: [
      (Math.min(...lats) + Math.max(...lats)) / 2,
      (Math.min(...lngs) + Math.max(...lngs)) / 2,
    ],
    zoom: 4,
  };
}

function FitBoundsOnce({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length < 2) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function FriendMap({ friends, myLocation }) {
  const points = useMemo(() => {
    const all = [...(friends ?? [])];
    if (myLocation) all.push(myLocation);
    return all;
  }, [friends, myLocation]);

  const initial = useMemo(() => fitToPoints(points), []);

  return (
    <MapContainer
      center={initial.center}
      zoom={initial.zoom}
      style={{ width: '100%', height: '100%' }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <FitBoundsOnce points={points} />

      {myLocation && (
        <Marker
          position={[myLocation.latitude, myLocation.longitude]}
          icon={avatarIcon({
            url: myLocation.user?.displayAvatarUrl ?? myLocation.user?.avatarUrl,
            name: myLocation.user?.username ?? 'Me',
            ring: 'ring-indigo-500',
          })}
        />
      )}

      {friends?.map((f) => (
        <Marker
          key={f.userId}
          position={[f.latitude, f.longitude]}
          icon={avatarIcon({
            url: f.displayAvatarUrl,
            name: f.username,
            updatedAt: f.updatedAt,
          })}
        />
      ))}
    </MapContainer>
  );
}
