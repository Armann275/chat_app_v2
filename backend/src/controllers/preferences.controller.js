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
  const preferences = await prefsService.updateChatPrefs(req.user.id, req.params.id, {
    mutedUntil: req.body.mutedUntil ? new Date(req.body.mutedUntil) : undefined,
    archived: req.body.archived,
    notifications: req.body.notifications,
  });
  res.json({ success: true, data: { preferences } });
}
