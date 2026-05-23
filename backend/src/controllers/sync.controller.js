import * as syncService from '../services/sync.service.js';

export async function delta(req, res) {
  const data = await syncService.getDelta(req.user.id, req.query.lastSyncedAt);
  res.json({ success: true, data });
}

export async function offlineQueue(req, res) {
  const results = await syncService.processOfflineQueue(req.user.id, req.body.items);
  res.json({ success: true, data: { results } });
}

export async function getReadCursor(req, res) {
  const cursor = await syncService.getReadCursor(req.user.id, req.params.id);
  res.json({ success: true, data: { cursor } });
}

export async function setReadCursor(req, res) {
  const cursor = await syncService.setReadCursor(
    req.user.id, req.params.id, req.body.lastReadMessageId ?? null,
  );
  res.json({ success: true, data: { cursor } });
}
