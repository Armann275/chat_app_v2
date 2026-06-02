import * as avatarService from '../services/avatar.service.js';
import * as storageService from '../services/storage.service.js';
import { ValidationError } from '../errors/errors.js';

export async function setGenerated(req, res) {
  const { style, seed } = req.body;
  const user = await avatarService.applyGeneratedAvatar({
    userId: req.user.id,
    style,
    seed,
  });
  res.json({ success: true, data: { user } });
}

export async function setCustom(req, res) {
  if (!req.file) throw new ValidationError('No file uploaded');
  const { url: photoUrl } = await storageService.persistUpload(req.file, {
    folder: 'avatars',
  });
  const user = await avatarService.applyCustomPhoto({
    userId: req.user.id,
    photoUrl,
  });
  res.json({ success: true, data: { user } });
}

export async function clearCustom(req, res) {
  const user = await avatarService.removeCustomPhoto({ userId: req.user.id });
  res.json({ success: true, data: { user } });
}
