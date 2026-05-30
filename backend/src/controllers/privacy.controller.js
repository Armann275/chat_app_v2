import * as privacyService from '../services/privacy.service.js';

export async function getMine(req, res) {
  const privacy = await privacyService.getMine(req.user.id);
  res.json({ success: true, data: { privacy } });
}

export async function updateMine(req, res) {
  const privacy = await privacyService.updateMine(req.user.id, {
    whoCanMessage: req.body.whoCanMessage,
    lastSeenVisibility: req.body.lastSeenVisibility,
    profilePhotoVisibility: req.body.profilePhotoVisibility,
  });
  res.json({ success: true, data: { privacy } });
}
