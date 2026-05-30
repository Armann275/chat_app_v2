import { env } from '../config/env.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors/errors.js';
import * as aiRepo from '../repositories/aiAssistant.repository.js';
import { askGemini, isGeminiConfigured } from '../ai/geminiClient.js';
import { AiNotConfiguredError } from '../errors/errors.js';

const TITLE_MAX = 60;

function toSessionDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toMessageDto(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

async function loadOwnedSession(userId, sessionId) {
  const session = await aiRepo.findSessionById(sessionId);
  if (!session) throw new NotFoundError('AI session not found');
  if (session.user_id !== userId) {
    throw new ForbiddenError('You do not have access to this session');
  }
  return session;
}

export async function createSession(userId) {
  const session = await aiRepo.createSession(userId, null);
  return toSessionDto(session);
}

export async function listSessions(userId, { limit = 50, offset = 0 } = {}) {
  const list = await aiRepo.listSessionsForUser(userId, {
    limit: Number(limit),
    offset: Number(offset),
  });
  return list.map(toSessionDto);
}

export async function getSessionWithMessages(userId, sessionId) {
  const session = await loadOwnedSession(userId, sessionId);
  const messages = await aiRepo.listMessages(sessionId, { limit: 500, offset: 0 });
  return {
    session: toSessionDto(session),
    messages: messages.map(toMessageDto),
  };
}

export async function deleteSession(userId, sessionId) {
  await loadOwnedSession(userId, sessionId);
  await aiRepo.deleteSession(sessionId);
}

export async function sendMessage(userId, sessionId, content) {
  if (!isGeminiConfigured()) throw new AiNotConfiguredError();

  const trimmed = (content ?? '').trim();
  if (!trimmed) throw new ValidationError('Message content is required');

  const session = await loadOwnedSession(userId, sessionId);

  const userMessage = await aiRepo.insertMessage(sessionId, 'user', trimmed);

  const history = await aiRepo.listRecentMessages(
    sessionId,
    env.ai.historyMaxMessages,
  );
  const priorHistory = history.filter((m) => m.id !== userMessage.id);

  const replyText = await askGemini({
    history: priorHistory,
    userMessage: trimmed,
  });

  const assistantMessage = await aiRepo.insertMessage(
    sessionId,
    'assistant',
    replyText,
  );

  let updatedSession = session;
  if (!session.title) {
    const title = trimmed.length > TITLE_MAX
      ? `${trimmed.slice(0, TITLE_MAX).trimEnd()}…`
      : trimmed;
    updatedSession = await aiRepo.updateSessionTitle(sessionId, title);
  } else {
    await aiRepo.touchSession(sessionId);
  }

  return {
    session: toSessionDto(updatedSession),
    userMessage: toMessageDto(userMessage),
    assistantMessage: toMessageDto(assistantMessage),
  };
}
