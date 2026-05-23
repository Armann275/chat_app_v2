import { jest } from '@jest/globals';

const syncRepoMock = {
  getDeltaSince: jest.fn(),
  upsertReadCursor: jest.fn(),
  getReadCursor: jest.fn(),
};
const messageRepoMock = { getById: jest.fn() };
const chatServiceMock = { assertMembership: jest.fn() };
const messageServiceMock = { sendMessage: jest.fn() };

jest.unstable_mockModule(
  '../../../src/repositories/sync.repository.js',
  () => syncRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/message.repository.js',
  () => messageRepoMock,
);
jest.unstable_mockModule('../../../src/services/chat.service.js', () => chatServiceMock);
jest.unstable_mockModule('../../../src/services/message.service.js', () => messageServiceMock);

const syncService = await import('../../../src/services/sync.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MSG = 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';
const OTHER_CHAT = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

const baseMessageRow = {
  id: MSG,
  chat_id: CHAT,
  sender_id: ME,
  content: 'hi',
  reply_to_message_id: null,
  forwarded_from_message_id: null,
  thread_root_id: null,
  edited_at: null,
  deleted_at: null,
  created_at: new Date('2026-04-01T00:00:00Z'),
  updated_at: new Date('2026-04-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
  chatServiceMock.assertMembership.mockResolvedValue({});
});

describe('sync.service.getDelta', () => {
  test('defaults to epoch when sinceISO missing and maps rows to dtos', async () => {
    syncRepoMock.getDeltaSince.mockResolvedValue({
      messages: [baseMessageRow],
      receipts: [{
        message_id: MSG, user_id: ME,
        delivered_at: new Date('2026-04-02T00:00:00Z'),
        seen_at: null,
      }],
    });

    const out = await syncService.getDelta(ME, undefined);

    expect(syncRepoMock.getDeltaSince).toHaveBeenCalledTimes(1);
    const [calledUserId, calledSince] = syncRepoMock.getDeltaSince.mock.calls[0];
    expect(calledUserId).toBe(ME);
    expect(calledSince.getTime()).toBe(0);

    expect(out.messages).toEqual([{
      id: MSG, chatId: CHAT, senderId: ME, content: 'hi',
      replyToMessageId: null, forwardedFromMessageId: null, threadRootId: null,
      editedAt: null, deletedAt: null,
      createdAt: baseMessageRow.created_at,
      updatedAt: baseMessageRow.updated_at,
    }]);
    expect(out.receipts).toEqual([{
      messageId: MSG, userId: ME,
      deliveredAt: new Date('2026-04-02T00:00:00Z'),
      seenAt: null,
    }]);
    expect(typeof out.serverTime).toBe('string');
    expect(Number.isNaN(new Date(out.serverTime).getTime())).toBe(false);
  });

  test('passes the parsed sinceISO when provided', async () => {
    syncRepoMock.getDeltaSince.mockResolvedValue({ messages: [], receipts: [] });
    const iso = '2026-03-15T12:00:00.000Z';
    await syncService.getDelta(ME, iso);
    const [, calledSince] = syncRepoMock.getDeltaSince.mock.calls[0];
    expect(calledSince.toISOString()).toBe(iso);
  });

  test('rejects invalid lastSyncedAt', async () => {
    await expect(
      syncService.getDelta(ME, 'not-a-date'),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(syncRepoMock.getDeltaSince).not.toHaveBeenCalled();
  });
});

describe('sync.service.setReadCursor', () => {
  test('requires membership', async () => {
    chatServiceMock.assertMembership.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 }),
    );
    await expect(
      syncService.setReadCursor(ME, CHAT, MSG),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(syncRepoMock.upsertReadCursor).not.toHaveBeenCalled();
  });

  test('throws NotFound when message does not exist', async () => {
    messageRepoMock.getById.mockResolvedValue(null);
    await expect(
      syncService.setReadCursor(ME, CHAT, MSG),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(syncRepoMock.upsertReadCursor).not.toHaveBeenCalled();
  });

  test('throws NotFound when message belongs to a different chat', async () => {
    messageRepoMock.getById.mockResolvedValue({ ...baseMessageRow, chat_id: OTHER_CHAT });
    await expect(
      syncService.setReadCursor(ME, CHAT, MSG),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(syncRepoMock.upsertReadCursor).not.toHaveBeenCalled();
  });

  test('upserts and returns dto when message is in chat', async () => {
    messageRepoMock.getById.mockResolvedValue(baseMessageRow);
    const lastReadAt = new Date('2026-04-03T00:00:00Z');
    syncRepoMock.upsertReadCursor.mockResolvedValue({
      user_id: ME, chat_id: CHAT, last_read_message_id: MSG, last_read_at: lastReadAt,
    });

    const out = await syncService.setReadCursor(ME, CHAT, MSG);
    expect(syncRepoMock.upsertReadCursor).toHaveBeenCalledWith({
      userId: ME, chatId: CHAT, lastReadMessageId: MSG,
    });
    expect(out).toEqual({ chatId: CHAT, lastReadMessageId: MSG, lastReadAt });
  });

  test('allows clearing cursor with null lastReadMessageId without message lookup', async () => {
    const lastReadAt = new Date('2026-04-04T00:00:00Z');
    syncRepoMock.upsertReadCursor.mockResolvedValue({
      user_id: ME, chat_id: CHAT, last_read_message_id: null, last_read_at: lastReadAt,
    });
    const out = await syncService.setReadCursor(ME, CHAT, null);
    expect(messageRepoMock.getById).not.toHaveBeenCalled();
    expect(out).toEqual({ chatId: CHAT, lastReadMessageId: null, lastReadAt });
  });
});

describe('sync.service.getReadCursor', () => {
  test('requires membership', async () => {
    chatServiceMock.assertMembership.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 }),
    );
    await expect(
      syncService.getReadCursor(ME, CHAT),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(syncRepoMock.getReadCursor).not.toHaveBeenCalled();
  });

  test('returns null when no cursor stored', async () => {
    syncRepoMock.getReadCursor.mockResolvedValue(undefined);
    expect(await syncService.getReadCursor(ME, CHAT)).toBeNull();
  });

  test('maps row to dto', async () => {
    const lastReadAt = new Date('2026-04-05T00:00:00Z');
    syncRepoMock.getReadCursor.mockResolvedValue({
      user_id: ME, chat_id: CHAT, last_read_message_id: MSG, last_read_at: lastReadAt,
    });
    expect(await syncService.getReadCursor(ME, CHAT)).toEqual({
      chatId: CHAT, lastReadMessageId: MSG, lastReadAt,
    });
  });
});

describe('sync.service.processOfflineQueue', () => {
  test('returns empty list for empty/missing input', async () => {
    expect(await syncService.processOfflineQueue(ME, [])).toEqual([]);
    expect(await syncService.processOfflineQueue(ME, undefined)).toEqual([]);
    expect(messageServiceMock.sendMessage).not.toHaveBeenCalled();
  });

  test('maps each item via sendMessage and returns tempId → realId on success', async () => {
    const msgDto = { id: MSG, chatId: CHAT, senderId: ME, content: 'queued', createdAt: new Date() };
    messageServiceMock.sendMessage.mockResolvedValue(msgDto);

    const out = await syncService.processOfflineQueue(ME, [
      { tempId: 't1', chatId: CHAT, content: 'queued' },
    ]);

    expect(messageServiceMock.sendMessage).toHaveBeenCalledWith({
      chatId: CHAT, senderId: ME, content: 'queued', replyToMessageId: null,
    });
    expect(out).toEqual([{ tempId: 't1', ok: true, message: msgDto }]);
  });

  test('forwards replyToMessageId when provided', async () => {
    const msgDto = { id: MSG, chatId: CHAT, senderId: ME, content: 'r' };
    messageServiceMock.sendMessage.mockResolvedValue(msgDto);

    await syncService.processOfflineQueue(ME, [
      { tempId: 't2', chatId: CHAT, content: 'r', replyToMessageId: 'other-msg' },
    ]);
    expect(messageServiceMock.sendMessage).toHaveBeenCalledWith({
      chatId: CHAT, senderId: ME, content: 'r', replyToMessageId: 'other-msg',
    });
  });

  test('captures per-item failures without aborting the batch', async () => {
    const dto = { id: MSG, chatId: CHAT, senderId: ME, content: 'ok' };
    messageServiceMock.sendMessage
      .mockRejectedValueOnce(Object.assign(new Error('not a member'), {
        code: 'FORBIDDEN', statusCode: 403,
      }))
      .mockResolvedValueOnce(dto);

    const out = await syncService.processOfflineQueue(ME, [
      { tempId: 't1', chatId: OTHER_CHAT, content: 'nope' },
      { tempId: 't2', chatId: CHAT, content: 'ok' },
    ]);

    expect(messageServiceMock.sendMessage).toHaveBeenCalledTimes(2);
    expect(out).toEqual([
      { tempId: 't1', ok: false, code: 'FORBIDDEN', error: 'not a member' },
      { tempId: 't2', ok: true, message: dto },
    ]);
  });

  test('defaults code to INTERNAL_ERROR when error has none', async () => {
    messageServiceMock.sendMessage.mockRejectedValue(new Error('boom'));
    const out = await syncService.processOfflineQueue(ME, [
      { tempId: 't3', chatId: CHAT, content: 'x' },
    ]);
    expect(out).toEqual([
      { tempId: 't3', ok: false, code: 'INTERNAL_ERROR', error: 'boom' },
    ]);
  });
});
