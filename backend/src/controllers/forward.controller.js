import * as messageService from '../services/message.service.js';

export async function forward(req, res) {
  const messages = await messageService.forwardMessages(req.user.id, {
    messageIds: req.body.messageIds,
    toChatIds: req.body.toChatIds,
  });
  res.status(201).json({ success: true, data: { messages } });
}
