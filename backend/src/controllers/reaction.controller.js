import * as reactionService from '../services/reaction.service.js';

export async function add(req, res) {
  await reactionService.addReaction(
    req.user.id,
    req.params.id,
    req.params.msgId,
    req.body.emoji,
  );
  res.status(201).json({ success: true, data: { added: true } });
}

export async function remove(req, res) {
  await reactionService.removeReaction(
    req.user.id,
    req.params.id,
    req.params.msgId,
    decodeURIComponent(req.params.emoji),
  );
  res.json({ success: true, data: { removed: true } });
}

export async function list(req, res) {
  const reactions = await reactionService.listReactions(
    req.user.id,
    req.params.id,
    req.params.msgId,
  );
  res.json({ success: true, data: { reactions } });
}
