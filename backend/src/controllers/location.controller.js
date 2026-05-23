import * as locationService from '../services/location.service.js';

export async function updateMyLocation(req, res) {
  const { latitude, longitude } = req.body;
  const result = await locationService.updateLocation(
    req.user.id,
    Number(latitude),
    Number(longitude),
  );
  res.json({ success: true, data: { location: result } });
}

export async function clearMyLocation(req, res) {
  await locationService.clearLocation(req.user.id);
  res.json({ success: true, data: { cleared: true } });
}

export async function getMyPrivacy(req, res) {
  const privacy = await locationService.getPrivacy(req.user.id);
  res.json({ success: true, data: { privacy } });
}

export async function setMyPrivacy(req, res) {
  const { mode, visibleFriendIds } = req.body;
  const privacy = await locationService.setPrivacy(req.user.id, {
    mode,
    visibleFriendIds,
  });
  res.json({ success: true, data: { privacy } });
}

export async function getFriendsOnMap(req, res) {
  const friends = await locationService.getFriendsOnMap(req.user.id);
  res.json({ success: true, data: { friends } });
}
