import { jest } from '@jest/globals';

const reactionRepoMock = {
  add: jest.fn(),
  remove: jest.fn(),
  listForMessage: jest.fn(),
};
const messageRepoMock = {
  getById: jest.fn(),
};
const chatServiceMock = {
  assertMembership: jest.fn(),
};
const realtimeMock = {
  emitToChat: jest.fn(),
  setRealtimeEmitter: jest.fn(),
};

jest.unstable_mockModule(
  '../../../src/repositories/reaction.repository.js',
  () => reactionRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/message.repository.js',
  () => messageRepoMock,
);
jest.unstable_mockModule('../../../src/services/chat.service.js', () => chatServiceMock);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const reactionService = await import('../../../src/services/reaction.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const MSG = 'mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm';

const baseMessage = {
  id: MSG, chat_id: CHAT, sender_id: ME,
  content: 'hi', edited_at: null, deleted_at: null,
  created_at: new Date(), updated_at: new Date(),
};

beforeEach(() => {
  jest.clearAllMocks();
  chatServiceMock.assertMembership.mockResolvedValue({});
});

describe('reaction.service.addReaction', () => {
  test('rejects non-members', async () => {
    chatServiceMock.assertMembership.mockRejectedValue(
      Object.assign(new Error('forbidden'), { statusCode: 403 }),
    );
    await expect(
      reactionService.addReaction(ME, CHAT, MSG, '👍'),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(reactionRepoMock.add).not.toHaveBeenCalled();
  });

  test('throws NotFound when message missing', async () => {
    messageRepoMock.getById.mockResolvedValue(null);
    await expect(
      reactionService.addReaction(ME, CHAT, MSG, '👍'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('rejects message in other chat', async () => {
    messageRepoMock.getById.mockResolvedValue({ ...baseMessage, chat_id: 'other' });
    await expect(
      reactionService.addReaction(ME, CHAT, MSG, '👍'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('adds reaction and emits reaction:added', async () => {
    messageRepoMock.getById.mockResolvedValue(baseMessage);
    await reactionService.addReaction(ME, CHAT, MSG, '👍');
    expect(reactionRepoMock.add).toHaveBeenCalledWith({
      messageId: MSG, userId: ME, emoji: '👍',
    });
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'reaction:added',
      { messageId: MSG, userId: ME, emoji: '👍' },
    );
  });
});

describe('reaction.service.removeReaction', () => {
  test('removes and emits reaction:removed', async () => {
    messageRepoMock.getById.mockResolvedValue(baseMessage);
    await reactionService.removeReaction(ME, CHAT, MSG, '👍');
    expect(reactionRepoMock.remove).toHaveBeenCalledWith({
      messageId: MSG, userId: ME, emoji: '👍',
    });
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'reaction:removed',
      { messageId: MSG, userId: ME, emoji: '👍' },
    );
  });
});

describe('reaction.service.listReactions', () => {
  test('returns mapped rows for member', async () => {
    messageRepoMock.getById.mockResolvedValue(baseMessage);
    reactionRepoMock.listForMessage.mockResolvedValue([
      { user_id: ME, emoji: '👍', created_at: new Date('2026-01-01') },
    ]);
    const out = await reactionService.listReactions(ME, CHAT, MSG);
    expect(out).toEqual([
      { userId: ME, emoji: '👍', createdAt: new Date('2026-01-01') },
    ]);
  });
});
