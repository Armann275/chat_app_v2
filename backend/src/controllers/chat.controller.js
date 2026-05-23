import * as chatService from '../services/chat.service.js';

export async function createDirect(req, res) {
  const chat = await chatService.createDirectChat(req.user.id, req.body.userId);
  res.status(201).json({ success: true, data: { chat } });
}

export async function createGroup(req, res) {
  const chat = await chatService.createGroupChat(req.user.id, {
    name: req.body.name,
    memberIds: req.body.memberIds,
  });
  res.status(201).json({ success: true, data: { chat } });
}

export async function listMine(req, res) {
  const chats = await chatService.listMyChats(req.user.id, {
    limit: req.query.limit ?? 50,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { chats } });
}

export async function getOne(req, res) {
  const chat = await chatService.getChat(req.user.id, req.params.id);
  res.json({ success: true, data: { chat } });
}

export async function getMembers(req, res) {
  const members = await chatService.getMembers(req.user.id, req.params.id);
  res.json({ success: true, data: { members } });
}

export async function addMembers(req, res) {
  const members = await chatService.addMembers(
    req.user.id,
    req.params.id,
    req.body.memberIds,
  );
  res.json({ success: true, data: { members } });
}

export async function removeMember(req, res) {
  await chatService.removeMember(req.user.id, req.params.id, req.params.userId);
  res.json({ success: true, data: { removed: true } });
}

export async function leave(req, res) {
  await chatService.leaveChat(req.user.id, req.params.id);
  res.json({ success: true, data: { left: true } });
}

export async function listRequests(req, res) {
  const chats = await chatService.listRequestChats(req.user.id, {
    limit: req.query.limit ?? 50,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { chats } });
}

export async function acceptRequest(req, res) {
  const chat = await chatService.acceptChatRequest(req.user.id, req.params.id);
  res.json({ success: true, data: { chat } });
}

export async function rejectRequest(req, res) {
  const result = await chatService.rejectChatRequest(req.user.id, req.params.id);
  res.json({ success: true, data: result });
}
