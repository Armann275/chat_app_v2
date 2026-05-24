import { jest } from '@jest/globals';

const pinRepoMock = {
  pin: jest.fn(),
  unpin: jest.fn(),
  listForChat: jest.fn(),
};
const messageRepoMock = { getById: jest.fn() };
const chatRepoMock = { getChatById: jest.fn() };
const chatServiceMock = { assertMembership: jest.fn() };
const realtimeMock = { emitToChat: jest.fn(), setRealtimeEmitter: jest.fn() };

jest.unstable_mockModule('../../../src/repositories/pin.repository.js', () => pinRepoMock);
jest.unstable_mockModule('../../../src/repositories/message.repository.js', () => messageRepoMock);
jest.unstable_mockModule('../../../src/repositories/chat.repository.js', () => chatRepoMock);
jest.unstable_mockModule('../../../src/services/chat.service.js', () => chatServiceMock);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const pinService = await import('../../../src/services/pin.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MSG = 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';

const baseMessage = {
  id: MSG, chat_id: CHAT, sender_id: ME, content: 'hi',
  reply_to_message_id: null, edited_at: null, deleted_at: null,
  created_at: new Date(), updated_at: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  chatServiceMock.assertMembership.mockResolvedValue({ role: 'admin' });
  chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
});

describe('pin.service', () => {
  test('pin requires membership and a real message in this chat', async () => {
    messageRepoMock.getById.mockResolvedValue({ ...baseMessage, chat_id: 'other' });
    await expect(pinService.pin(ME, CHAT, MSG)).rejects.toMatchObject({ statusCode: 403 });
  });

  test('pin emits message:pinned', async () => {
    messageRepoMock.getById.mockResolvedValue(baseMessage);
    await pinService.pin(ME, CHAT, MSG);
    expect(pinRepoMock.pin).toHaveBeenCalledWith({
      chatId: CHAT, messageId: MSG, pinnedBy: ME,
    });
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'message:pinned',
      { chatId: CHAT, messageId: MSG, pinnedBy: ME },
    );
  });

  test('unpin emits message:unpinned', async () => {
    messageRepoMock.getById.mockResolvedValue(baseMessage);
    await pinService.unpin(ME, CHAT, MSG);
    expect(pinRepoMock.unpin).toHaveBeenCalledWith({ chatId: CHAT, messageId: MSG });
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'message:unpinned',
      { chatId: CHAT, messageId: MSG },
    );
  });

  test('listPins requires membership and maps rows', async () => {
    pinRepoMock.listForChat.mockResolvedValue([
      {
        chat_id: CHAT, message_id: MSG, pinned_by: ME, pinned_at: new Date(),
        id: MSG, m_chat_id: CHAT, sender_id: ME, content: 'hi',
        reply_to_message_id: null, edited_at: null, deleted_at: null,
        created_at: new Date(), updated_at: new Date(),
      },
    ]);
    const out = await pinService.listPins(ME, CHAT);
    expect(out).toHaveLength(1);
    expect(out[0].messageId).toBe(MSG);
    expect(out[0].message.content).toBe('hi');
  });
});
