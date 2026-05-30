import * as pollService from '../services/poll.service.js';

export async function createPoll(req, res) {
  const poll = await pollService.createPoll(req.user.id, req.params.id, {
    question: req.body.question,
    options: req.body.options,
    multiChoice: req.body.multiChoice,
    closesAt: req.body.closesAt,
  });
  res.status(201).json({ success: true, data: { poll } });
}

export async function listForChat(req, res) {
  const polls = await pollService.listForChat(req.user.id, req.params.id);
  res.json({ success: true, data: { polls } });
}

export async function getPoll(req, res) {
  const poll = await pollService.getPoll(req.user.id, req.params.pollId);
  res.json({ success: true, data: { poll } });
}

export async function vote(req, res) {
  const poll = await pollService.vote(
    req.user.id, req.params.pollId, req.params.optionId,
  );
  res.json({ success: true, data: { poll } });
}

export async function unvote(req, res) {
  const poll = await pollService.unvote(
    req.user.id, req.params.pollId, req.params.optionId,
  );
  res.json({ success: true, data: { poll } });
}

export async function closePoll(req, res) {
  const poll = await pollService.closePoll(req.user.id, req.params.pollId);
  res.json({ success: true, data: { poll } });
}
