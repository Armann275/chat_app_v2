import * as prefsService from '../services/preferences.service.js';

export async function getMine(req, res) {
  const preferences = await prefsService.getUserPrefs(req.user.id);
  res.json({ success: true, data: { preferences } });
}

export async function updateMine(req, res) {
  const preferences = await prefsService.updateUserPrefs(req.user.id, {
    darkMode: req.body.darkMode,
    notificationsEnabled: req.body.notificationsEnabled,
  });
  res.json({ success: true, data: { preferences } });
}

export async function getChat(req, res) {
  const preferences = await prefsService.getChatPrefs(req.user.id, req.params.id);
  res.json({ success: true, data: { preferences } });
}

export async function updateChat(req, res) {
  // Only forward keys the client actually sent so an explicit `mutedUntil: null`
  // (unmute) clears the value, while an absent key leaves it unchanged.
  const patch = {};
  if ('mutedUntil' in req.body) {
    patch.mutedUntil = req.body.mutedUntil ? new Date(req.body.mutedUntil) : null;
  }
  if ('archived' in req.body) patch.archived = req.body.archived;
  if ('notifications' in req.body) patch.notifications = req.body.notifications;

  const preferences = await prefsService.updateChatPrefs(req.user.id, req.params.id, patch);
  res.json({ success: true, data: { preferences } });
}
