import * as pollRepo from '../repositories/poll.repository.js';
import * as chatRepo from '../repositories/chat.repository.js';
import { emitToChat } from '../sockets/realtime.js';
import { canEditChat } from '../utils/chatPermissions.js';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '../errors/errors.js';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 12;
const MAX_QUESTION = 500;
const MAX_OPTION_TEXT = 200;

async function ensureMember(chatId, userId) {
  const membership = await chatRepo.getMembership(chatId, userId);
  if (!membership) throw new ForbiddenError('Not a member of this chat');
  return membership;
}

function pollDto(poll, options, tally, myVotes) {
  const counts = new Map(tally.map((t) => [t.option_id, t.votes]));
  return {
    id: poll.id,
    chatId: poll.chat_id,
    question: poll.question,
    multiChoice: poll.multi_choice,
    closesAt: poll.closes_at ?? null,
    closedAt: poll.closed_at ?? null,
    createdBy: poll.created_by,
    createdAt: poll.created_at,
    options: options.map((o) => ({
      id: o.id,
      text: o.text,
      orderIndex: o.order_index,
      votes: counts.get(o.id) ?? 0,
      mine: myVotes?.includes(o.id) ?? false,
    })),
  };
}

function isClosed(poll) {
  if (poll.closed_at) return true;
  if (poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now()) return true;
  return false;
}

export async function createPoll(currentUserId, chatId, { question, options, multiChoice = false, closesAt = null }) {
  const trimmedQ = typeof question === 'string' ? question.trim() : '';
  if (!trimmedQ) throw new ValidationError('question is required');
  if (trimmedQ.length > MAX_QUESTION) {
    throw new ValidationError(`question must be at most ${MAX_QUESTION} characters`);
  }

  if (!Array.isArray(options)) throw new ValidationError('options must be an array');
  const cleanOpts = options
    .map((o) => (typeof o === 'string' ? o.trim() : ''))
    .filter((o) => o.length > 0);
  if (cleanOpts.length < MIN_OPTIONS || cleanOpts.length > MAX_OPTIONS) {
    throw new ValidationError(
      `poll must have between ${MIN_OPTIONS} and ${MAX_OPTIONS} options`,
    );
  }
  if (cleanOpts.some((o) => o.length > MAX_OPTION_TEXT)) {
    throw new ValidationError(`option text must be at most ${MAX_OPTION_TEXT} characters`);
  }

  let closesAtIso = null;
  if (closesAt != null) {
    const d = new Date(closesAt);
    if (Number.isNaN(d.getTime())) {
      throw new ValidationError('closesAt must be a valid ISO timestamp');
    }
    if (d.getTime() <= Date.now()) {
      throw new ValidationError('closesAt must be in the future');
    }
    closesAtIso = d.toISOString();
  }

  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  if (chat.type === 'direct') {
    throw new ValidationError('Polls are not supported in direct chats');
  }
  await ensureMember(chatId, currentUserId);

  const { poll, options: optionRows } = await pollRepo.createPollWithOptions({
    chatId,
    question: trimmedQ,
    multiChoice: Boolean(multiChoice),
    closesAt: closesAtIso,
    createdBy: currentUserId,
    options: cleanOpts,
  });

  const dto = pollDto(poll, optionRows, [], []);
  emitToChat(chatId, 'poll:created', dto);
  return dto;
}

export async function listForChat(currentUserId, chatId) {
  const chat = await chatRepo.getChatById(chatId);
  if (!chat) throw new NotFoundError('Chat not found');
  await ensureMember(chatId, currentUserId);

  const polls = await pollRepo.listByChat(chatId);
  const out = [];
  for (const p of polls) {
    const [options, t, mine] = await Promise.all([
      pollRepo.listOptions(p.id),
      pollRepo.tally(p.id),
      pollRepo.listUserVotes(p.id, currentUserId),
    ]);
    out.push(pollDto(p, options, t, mine));
  }
  return out;
}

export async function getPoll(currentUserId, pollId) {
  const poll = await pollRepo.findById(pollId);
  if (!poll) throw new NotFoundError('Poll not found');
  await ensureMember(poll.chat_id, currentUserId);

  const [options, t, mine] = await Promise.all([
    pollRepo.listOptions(pollId),
    pollRepo.tally(pollId),
    pollRepo.listUserVotes(pollId, currentUserId),
  ]);
  return pollDto(poll, options, t, mine);
}

export async function vote(currentUserId, pollId, optionId) {
  const poll = await pollRepo.findById(pollId);
  if (!poll) throw new NotFoundError('Poll not found');
  if (isClosed(poll)) throw new ConflictError('Poll is closed');
  await ensureMember(poll.chat_id, currentUserId);

  const option = await pollRepo.findOption(optionId);
  if (!option || option.poll_id !== pollId) {
    throw new NotFoundError('Option not found in this poll');
  }

  await pollRepo.addVote({
    pollId, optionId, userId: currentUserId,
    replaceForSingleChoice: !poll.multi_choice,
  });

  const dto = await getPoll(currentUserId, pollId);
  emitToChat(poll.chat_id, 'poll:voted', {
    pollId, userId: currentUserId, optionId,
  });
  return dto;
}

export async function unvote(currentUserId, pollId, optionId) {
  const poll = await pollRepo.findById(pollId);
  if (!poll) throw new NotFoundError('Poll not found');
  if (isClosed(poll)) throw new ConflictError('Poll is closed');
  await ensureMember(poll.chat_id, currentUserId);

  await pollRepo.removeVote({ pollId, optionId, userId: currentUserId });
  const dto = await getPoll(currentUserId, pollId);
  emitToChat(poll.chat_id, 'poll:voted', {
    pollId, userId: currentUserId, optionId, removed: true,
  });
  return dto;
}

export async function closePoll(currentUserId, pollId) {
  const poll = await pollRepo.findById(pollId);
  if (!poll) throw new NotFoundError('Poll not found');

  const membership = await ensureMember(poll.chat_id, currentUserId);
  if (poll.created_by !== currentUserId && !canEditChat(membership.role)) {
    throw new ForbiddenError('Only the poll creator or an admin can close this poll');
  }

  if (poll.closed_at) {
    return getPoll(currentUserId, pollId);
  }

  await pollRepo.close(pollId);
  const dto = await getPoll(currentUserId, pollId);
  emitToChat(poll.chat_id, 'poll:closed', { pollId });
  return dto;
}
