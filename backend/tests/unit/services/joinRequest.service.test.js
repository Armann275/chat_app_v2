import { jest } from '@jest/globals';

const joinRepoMock = {
  upsertPending: jest.fn(),
  find: jest.fn(),
  listPending: jest.fn(),
  decide: jest.fn(),
};

const chatRepoMock = {
  getChatById: jest.fn(),
  getMembership: jest.fn(),
  addMember: jest.fn(),
};

const realtimeMock = {
  emitToChat: jest.fn(),
  emitToUser: jest.fn(),
  joinUserToChat: jest.fn(),
  setRealtimeEmitter: jest.fn(),
};

jest.unstable_mockModule(
  '../../../src/repositories/joinRequest.repository.js',
  () => joinRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/chat.repository.js',
  () => chatRepoMock,
);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const service = await import('../../../src/services/joinRequest.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('joinRequest.service.request', () => {
  test('rejects unknown chat', async () => {
    chatRepoMock.getChatById.mockResolvedValue(null);
    await expect(service.request(ME, CHAT)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('rejects direct chats', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ type: 'direct' });
    await expect(service.request(ME, CHAT)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('rejects invite-only chats', async () => {
    chatRepoMock.getChatById.mockResolvedValue({
      id: CHAT, type: 'group', join_mode: 'invite_only',
    });
    await expect(service.request(ME, CHAT)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('rejects when already a member', async () => {
    chatRepoMock.getChatById.mockResolvedValue({
      id: CHAT, type: 'group', join_mode: 'request',
    });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'member' });
    await expect(service.request(ME, CHAT)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('open mode joins immediately', async () => {
    chatRepoMock.getChatById.mockResolvedValue({
      id: CHAT, type: 'group', join_mode: 'open',
    });
    chatRepoMock.getMembership.mockResolvedValue(null);

    const result = await service.request(ME, CHAT);
    expect(chatRepoMock.addMember).toHaveBeenCalledWith({
      chatId: CHAT, userId: ME, role: 'member',
    });
    expect(result).toEqual({ chatId: CHAT, joined: true });
    expect(joinRepoMock.upsertPending).not.toHaveBeenCalled();
  });

  test('request mode creates pending and emits', async () => {
    chatRepoMock.getChatById.mockResolvedValue({
      id: CHAT, type: 'group', join_mode: 'request',
    });
    chatRepoMock.getMembership.mockResolvedValue(null);
    joinRepoMock.upsertPending.mockResolvedValue({
      chat_id: CHAT, user_id: ME, status: 'pending',
      message: 'hi', requested_at: new Date(),
      decided_by: null, decided_at: null,
    });

    const result = await service.request(ME, CHAT, { message: '  hi  ' });
    expect(joinRepoMock.upsertPending).toHaveBeenCalledWith({
      chatId: CHAT, userId: ME, message: 'hi',
    });
    expect(result.status).toBe('pending');
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'chat:join-request', expect.objectContaining({ userId: ME }),
    );
  });
});

describe('joinRequest.service.approve', () => {
  test('rejects non-admin', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'moderator' });
    await expect(service.approve(ME, CHAT, OTHER)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('rejects when no pending request', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    joinRepoMock.find.mockResolvedValue(null);
    await expect(service.approve(ME, CHAT, OTHER)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('approve adds member and emits', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    joinRepoMock.find.mockResolvedValue({
      chat_id: CHAT, user_id: OTHER, status: 'pending',
    });
    joinRepoMock.decide.mockResolvedValue({
      chat_id: CHAT, user_id: OTHER, status: 'approved',
      message: null, requested_at: new Date(), decided_by: ME, decided_at: new Date(),
    });

    const dto = await service.approve(ME, CHAT, OTHER);
    expect(joinRepoMock.decide).toHaveBeenCalledWith({
      chatId: CHAT, userId: OTHER, status: 'approved', decidedBy: ME,
    });
    expect(chatRepoMock.addMember).toHaveBeenCalledWith({
      chatId: CHAT, userId: OTHER, role: 'member',
    });
    expect(realtimeMock.emitToUser).toHaveBeenCalledWith(
      OTHER, 'chat:join-approved', { chatId: CHAT },
    );
    expect(dto.status).toBe('approved');
  });
});

describe('joinRequest.service.reject', () => {
  test('reject does not add member', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    joinRepoMock.find.mockResolvedValue({
      chat_id: CHAT, user_id: OTHER, status: 'pending',
    });
    joinRepoMock.decide.mockResolvedValue({
      chat_id: CHAT, user_id: OTHER, status: 'rejected',
      message: null, requested_at: new Date(), decided_by: ME, decided_at: new Date(),
    });

    await service.reject(ME, CHAT, OTHER);
    expect(chatRepoMock.addMember).not.toHaveBeenCalled();
    expect(realtimeMock.emitToUser).toHaveBeenCalledWith(
      OTHER, 'chat:join-rejected', { chatId: CHAT },
    );
  });
});
