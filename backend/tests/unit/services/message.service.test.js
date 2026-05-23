import { jest } from '@jest/globals';

const messageRepoMock = {
  create: jest.fn(),
  getByChat: jest.fn(),
  getById: jest.fn(),
  searchInChat: jest.fn(),
  searchAll: jest.fn(),
  editMessage: jest.fn(),
  softDeleteForEveryone: jest.fn(),
  hideForUser: jest.fn(),
};
const receiptRepoMock = {
  markDelivered: jest.fn(),
  markSeen: jest.fn(),
  getUnreadCount: jest.fn(),
  getUnreadCountsForUser: jest.fn(),
};
const chatServiceMock = {
  assertMembership: jest.fn(),
};
const realtimeMock = {
  emitToChat: jest.fn(),
  emitToUser: jest.fn(),
  setRealtimeEmitter: jest.fn(),
  setUserEmitter: jest.fn(),
};
const mentionRepoMock = {
  createMentions: jest.fn(),
  listForMessage: jest.fn(),
};
const chatRepoMock = {
  getMembers: jest.fn().mockResolvedValue([]),
};

jest.unstable_mockModule(
  '../../../src/repositories/message.repository.js',
  () => messageRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/messageReceipt.repository.js',
  () => receiptRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/mention.repository.js',
  () => mentionRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/chat.repository.js',
  () => chatRepoMock,
);
jest.unstable_mockModule('../../../src/services/chat.service.js', () => chatServiceMock);
jest.unstable_mockModule('../../../src/services/linkPreview.service.js', () => ({
  enqueueForMessage: jest.fn().mockResolvedValue(undefined),
  getCached: jest.fn(),
}));
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const messageService = await import('../../../src/services/message.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MSG = 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';

const baseMessageRow = {
  id: MSG,
  chat_id: CHAT,
  sender_id: ME,
  content: 'hello',
  edited_at: null,
  deleted_at: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('message.service.sendMessage', () => {
  test('rejects non-members (assertMembership throws)', async () => {
    chatServiceMock.assertMembership.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 }),
    );
    await expect(
      messageService.sendMessage({ chatId: CHAT, senderId: ME, content: 'hi' }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(messageRepoMock.create).not.toHaveBeenCalled();
  });

  test('persists, emits message:new, returns dto', async () => {
    chatServiceMock.assertMembership.mockResolvedValue({});
    messageRepoMock.create.mockResolvedValue(baseMessageRow);

    const dto = await messageService.sendMessage({
      chatId: CHAT, senderId: ME, content: 'hello',
    });

    expect(messageRepoMock.create).toHaveBeenCalledWith({
      chatId: CHAT, senderId: ME, content: 'hello',
      replyToMessageId: null, forwardedFromMessageId: null, threadRootId: null,
    });
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(CHAT, 'message:new', dto);
    expect(dto).toMatchObject({ id: MSG, chatId: CHAT, senderId: ME, content: 'hello' });
  });
});

describe('message.service.getMessages', () => {
  test('rejects non-members', async () => {
    chatServiceMock.assertMembership.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 }),
    );
    await expect(
      messageService.getMessages(ME, CHAT, { limit: 10, offset: 0 }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('returns mapped rows for members', async () => {
    chatServiceMock.assertMembership.mockResolvedValue({});
    messageRepoMock.getByChat.mockResolvedValue([baseMessageRow]);
    const list = await messageService.getMessages(ME, CHAT, { limit: 50, offset: 0 });
    expect(messageRepoMock.getByChat).toHaveBeenCalledWith(CHAT, ME, { limit: 50, offset: 0 });
    expect(list[0].chatId).toBe(CHAT);
  });
});

describe('message.service.markSeen', () => {
  test('throws NotFound when message missing', async () => {
    chatServiceMock.assertMembership.mockResolvedValue({});
    messageRepoMock.getById.mockResolvedValue(null);
    await expect(messageService.markSeen(ME, CHAT, MSG)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('rejects when message belongs to another chat', async () => {
    chatServiceMock.assertMembership.mockResolvedValue({});
    messageRepoMock.getById.mockResolvedValue({ ...baseMessageRow, chat_id: 'other' });
    await expect(messageService.markSeen(ME, CHAT, MSG)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('marks seen and broadcasts message:seen', async () => {
    chatServiceMock.assertMembership.mockResolvedValue({});
    messageRepoMock.getById.mockResolvedValue(baseMessageRow);

    await messageService.markSeen(ME, CHAT, MSG);
    expect(receiptRepoMock.markSeen).toHaveBeenCalledWith({ messageId: MSG, userId: ME });
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT,
      'message:seen',
      expect.objectContaining({ messageId: MSG, userId: ME }),
    );
  });
});

describe('message.service.searchMessages', () => {
  test('searches in a single chat (member only)', async () => {
    chatServiceMock.assertMembership.mockResolvedValue({});
    messageRepoMock.searchInChat.mockResolvedValue([baseMessageRow]);

    const out = await messageService.searchMessages(ME, { q: 'hello', chatId: CHAT });
    expect(chatServiceMock.assertMembership).toHaveBeenCalledWith(CHAT, ME);
    expect(messageRepoMock.searchInChat).toHaveBeenCalledWith(CHAT, ME, 'hello', {
      limit: 50, offset: 0,
    });
    expect(out).toHaveLength(1);
  });

  test('without chatId, searches across all member chats', async () => {
    messageRepoMock.searchAll.mockResolvedValue([baseMessageRow]);
    const out = await messageService.searchMessages(ME, { q: 'hello' });
    expect(chatServiceMock.assertMembership).not.toHaveBeenCalled();
    expect(messageRepoMock.searchAll).toHaveBeenCalledWith(ME, 'hello', {
      limit: 50, offset: 0,
    });
    expect(out).toHaveLength(1);
  });
});

describe('message.service.getUnreadCounts', () => {
  test('returns mapped counts', async () => {
    receiptRepoMock.getUnreadCountsForUser.mockResolvedValue([
      { chat_id: CHAT, unread: 3 },
    ]);
    const out = await messageService.getUnreadCounts(ME);
    expect(out).toEqual([{ chatId: CHAT, unread: 3 }]);
  });
});

describe('message.service.editMessage', () => {
  beforeEach(() => chatServiceMock.assertMembership.mockResolvedValue({}));

  test('rejects non-sender', async () => {
    messageRepoMock.getById.mockResolvedValue({ ...baseMessageRow, sender_id: 'other' });
    await expect(messageService.editMessage(ME, CHAT, MSG, 'new')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('rejects deleted message', async () => {
    messageRepoMock.getById.mockResolvedValue({ ...baseMessageRow, deleted_at: new Date() });
    await expect(messageService.editMessage(ME, CHAT, MSG, 'new')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects message in another chat', async () => {
    messageRepoMock.getById.mockResolvedValue({ ...baseMessageRow, chat_id: 'other' });
    await expect(messageService.editMessage(ME, CHAT, MSG, 'new')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('throws NotFound on missing message', async () => {
    messageRepoMock.getById.mockResolvedValue(null);
    await expect(messageService.editMessage(ME, CHAT, MSG, 'new')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('updates content + emits message:edited', async () => {
    messageRepoMock.getById.mockResolvedValue(baseMessageRow);
    messageRepoMock.editMessage.mockResolvedValue({
      ...baseMessageRow, content: 'edited', edited_at: new Date(),
    });

    const dto = await messageService.editMessage(ME, CHAT, MSG, 'edited');
    expect(messageRepoMock.editMessage).toHaveBeenCalledWith(MSG, 'edited');
    expect(dto.content).toBe('edited');
    expect(dto.editedAt).toBeInstanceOf(Date);
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(CHAT, 'message:edited', dto);
  });
});

describe('message.service.deleteMessage', () => {
  beforeEach(() => chatServiceMock.assertMembership.mockResolvedValue({}));

  test('non-sender cannot delete for everyone', async () => {
    messageRepoMock.getById.mockResolvedValue({ ...baseMessageRow, sender_id: 'other' });
    await expect(
      messageService.deleteMessage(ME, CHAT, MSG, 'for_everyone'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('sender deletes for everyone -> emits message:deleted', async () => {
    messageRepoMock.getById.mockResolvedValue(baseMessageRow);
    messageRepoMock.softDeleteForEveryone.mockResolvedValue({
      ...baseMessageRow, deleted_at: new Date(),
    });

    const dto = await messageService.deleteMessage(ME, CHAT, MSG, 'for_everyone');
    expect(messageRepoMock.softDeleteForEveryone).toHaveBeenCalledWith(MSG);
    expect(dto.deletedAt).toBeInstanceOf(Date);
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'message:deleted',
      expect.objectContaining({ id: MSG, mode: 'for_everyone' }),
    );
  });

  test('non-sender deleting for_me hides only for caller', async () => {
    messageRepoMock.getById.mockResolvedValue({ ...baseMessageRow, sender_id: 'other' });
    const out = await messageService.deleteMessage(ME, CHAT, MSG, 'for_me');
    expect(messageRepoMock.hideForUser).toHaveBeenCalledWith(MSG, ME);
    expect(out).toEqual({ id: MSG, hiddenForUser: true });
    expect(realtimeMock.emitToChat).not.toHaveBeenCalled();
  });

  test('idempotent: second delete-for-everyone does not re-emit', async () => {
    messageRepoMock.getById.mockResolvedValue({
      ...baseMessageRow, deleted_at: new Date(),
    });
    await messageService.deleteMessage(ME, CHAT, MSG, 'for_everyone');
    expect(messageRepoMock.softDeleteForEveryone).not.toHaveBeenCalled();
    expect(realtimeMock.emitToChat).not.toHaveBeenCalled();
  });
});
