import * as totpService from '../services/totp.service.js';

export async function status(req, res) {
  const enabled = await totpService.isEnabled(req.user.id);
  res.json({ success: true, data: { enabled } });
}

export async function beginSetup(req, res) {
  const result = await totpService.beginSetup(req.user.id);
  res.json({ success: true, data: result });
}

export async function enable(req, res) {
  const result = await totpService.enable(req.user.id, req.body.code);
  res.json({ success: true, data: result });
}

export async function disable(req, res) {
  const result = await totpService.disable(req.user.id, req.body.code);
  res.json({ success: true, data: result });
}

export async function regenerateBackupCodes(req, res) {
  const result = await totpService.regenerateBackupCodes(req.user.id);
  res.json({ success: true, data: result });
}
