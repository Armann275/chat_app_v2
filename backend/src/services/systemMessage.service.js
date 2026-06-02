import * as messageRepo from '../repositories/message.repository.js';
import { emitToChat } from '../sockets/realtime.js';

// Server-rendered, human-readable text for each system event. The structured
// `system_event` payload is stored alongside so clients can re-render richly
// later, but `content` is the source of truth for search/notifications/old
// clients.
function renderText(event, spec) {
  const actor = spec.actorUsername ?? 'Someone';
  const target = spec.targetUsername ?? 'someone';
  switch (event) {
    case 'group_created':
      return `${actor} created the group`;
    case 'channel_created':
      return `${actor} created the channel`;
    case 'member_added':
      return `${actor} added ${target}`;
    case 'member_removed':
      return `${actor} removed ${target}`;
    case 'member_left':
      return `${actor} left`;
    case 'group_renamed':
      return `${actor} changed the group name to “${spec.name}”`;
    case 'role_changed':
      return `${target} is now ${spec.role === 'admin' ? 'an admin' : spec.role}`;
    case 'call_missed':
      return `Missed ${spec.callType === 'video' ? 'video' : 'voice'} call`;
    case 'call_ended':
      return spec.duration
        ? `${spec.callType === 'video' ? 'Video' : 'Voice'} call ended · ${spec.duration}`
        : `${spec.callType === 'video' ? 'Video' : 'Voice'} call ended`;
    default:
      return '';
  }
}

function toDto(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    senderId: row.sender_id,
    content: row.content,
    type: row.type ?? 'system',
    systemEvent: row.system_event ?? null,
    replyToMessageId: null,
    forwardedFromMessageId: null,
    threadRootId: null,
    editedAt: null,
    deletedAt: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    reactions: [],
    attachments: [],
  };
}

/**
 * Persist a system (event) message and broadcast it on the same `message:new`
 * channel that user messages use, so it appears live and loads with history.
 *
 * `spec` must include `event` and `actorId`; optional `targetId`,
 * `actorUsername`, `targetUsername`, and any event-specific fields
 * (`name`, `role`, `callType`, `duration`) used for rendering.
 */
export async function createSystemMessage(chatId, spec) {
  const { event, actorId, targetId = null } = spec;
  const content = renderText(event, spec);
  const { event: _e, actorId: _a, targetId: _t, ...rest } = spec;
  const systemEvent = { event, actorId, targetId, ...rest };

  const row = await messageRepo.create({
    chatId,
    senderId: actorId,
    content,
    type: 'system',
    systemEvent,
  });

  const dto = toDto(row);
  emitToChat(chatId, 'message:new', dto);
  return dto;
}
