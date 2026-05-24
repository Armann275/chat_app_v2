import * as blockService from '../services/block.service.js';
import * as reportService from '../services/report.service.js';

export async function block(req, res) {
  const result = await blockService.block(req.user.id, req.params.id);
  res.json({ success: true, data: result });
}

export async function unblock(req, res) {
  const result = await blockService.unblock(req.user.id, req.params.id);
  res.json({ success: true, data: result });
}

export async function listBlocked(req, res) {
  const blocked = await blockService.listBlocked(req.user.id);
  res.json({ success: true, data: { blocked } });
}

export async function report(req, res) {
  const result = await reportService.report(req.user.id, req.params.id, {
    reason: req.body.reason,
    details: req.body.details,
  });
  res.status(201).json({ success: true, data: { report: result } });
}
