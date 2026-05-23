import * as messageService from '../services/message.service.js';

export async function send(req, res) {
  const message = await messageService.sendMessage({
    chatId: req.params.id,
    senderId: req.user.id,
    content: req.body.content,
    replyToMessageId: req.body.replyToMessageId ?? null,
    asThreadReply: !!req.body.asThreadReply,
    attachmentIds: Array.isArray(req.body.attachmentIds) ? req.body.attachmentIds : [],
  });
  res.status(201).json({ success: true, data: { message } });
}

export async function list(req, res) {
  const messages = await messageService.getMessages(req.user.id, req.params.id, {
    limit: req.query.limit ?? 50,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { messages } });
}

export async function markSeen(req, res) {
  await messageService.markSeen(req.user.id, req.params.id, req.params.msgId);
  res.json({ success: true, data: { seen: true } });
}

export async function edit(req, res) {
  const message = await messageService.editMessage(
    req.user.id,
    req.params.id,
    req.params.msgId,
    req.body.content,
  );
  res.json({ success: true, data: { message } });
}

export async function remove(req, res) {
  const result = await messageService.deleteMessage(
    req.user.id,
    req.params.id,
    req.params.msgId,
    req.query.mode === 'for_everyone' ? 'for_everyone' : 'for_me',
  );
  res.json({ success: true, data: result });
}

export async function search(req, res) {
  const messages = await messageService.searchMessages(req.user.id, {
    q: req.query.q,
    chatId: req.query.chatId,
    limit: req.query.limit ?? 50,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { messages } });
}

export async function unreadCounts(req, res) {
  const counts = await messageService.getUnreadCounts(req.user.id);
  res.json({ success: true, data: { counts } });
}

export async function thread(req, res) {
  const data = await messageService.getThreadMessages(
    req.user.id, req.params.id, req.params.msgId,
    { limit: req.query.limit ?? 50, offset: req.query.offset ?? 0 },
  );
  res.json({ success: true, data });
}
