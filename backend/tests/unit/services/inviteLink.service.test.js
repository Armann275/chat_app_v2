import { jest } from '@jest/globals';

const inviteRepoMock = {
  create: jest.fn(),
  findByCode: jest.fn(),
  findById: jest.fn(),
  listByChat: jest.fn(),
  revoke: jest.fn(),
  incrementUses: jest.fn(),
};

const chatRepoMock = {
  getChatById: jest.fn(),
  getMembership: jest.fn(),
  addMember: jest.fn(),
};

const realtimeMock = {
  emitToChat: jest.fn(),
  emitToUser: jest.fn(),
  setRealtimeEmitter: jest.fn(),
};

jest.unstable_mockModule(
  '../../../src/repositories/inviteLink.repository.js',
  () => inviteRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/chat.repository.js',
  () => chatRepoMock,
);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const service = await import('../../../src/services/inviteLink.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const LINK = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('inviteLink.service.create', () => {
  test('rejects non-admin', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({
      chat_id: CHAT, user_id: ME, role: 'member',
    });
    await expect(service.create(ME, CHAT, {})).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('rejects direct chats', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'direct' });
    await expect(service.create(ME, CHAT, {})).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('rejects invalid maxUses', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    await expect(service.create(ME, CHAT, { maxUses: 0 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('rejects past expiresAt', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    await expect(
      service.create(ME, CHAT, { expiresAt: '2000-01-01T00:00:00Z' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('admin creates link', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    inviteRepoMock.create.mockResolvedValue({
      id: LINK, chat_id: CHAT, code: 'abc', created_by: ME,
      expires_at: null, max_uses: null, uses: 0, revoked_at: null,
      created_at: new Date(),
    });

    const link = await service.create(ME, CHAT, { maxUses: 5 });
    expect(inviteRepoMock.create).toHaveBeenCalledTimes(1);
    expect(link.code).toBe('abc');
    expect(link.maxUses).toBeNull();
  });

  test('retries on unique-violation', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    const dupErr = new Error('duplicate'); dupErr.code = '23505';
    inviteRepoMock.create
      .mockRejectedValueOnce(dupErr)
      .mockResolvedValue({
        id: LINK, chat_id: CHAT, code: 'xyz', created_by: ME,
        expires_at: null, max_uses: null, uses: 0, revoked_at: null,
        created_at: new Date(),
      });

    const link = await service.create(ME, CHAT, {});
    expect(inviteRepoMock.create).toHaveBeenCalledTimes(2);
    expect(link.code).toBe('xyz');
  });
});

describe('inviteLink.service.redeem', () => {
  test('not found', async () => {
    inviteRepoMock.findByCode.mockResolvedValue(null);
    await expect(service.redeem(ME, 'nope')).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('rejects revoked', async () => {
    inviteRepoMock.findByCode.mockResolvedValue({
      id: LINK, chat_id: CHAT, code: 'x', revoked_at: new Date(),
      expires_at: null, max_uses: null, uses: 0,
    });
    await expect(service.redeem(ME, 'x')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects expired', async () => {
    inviteRepoMock.findByCode.mockResolvedValue({
      id: LINK, chat_id: CHAT, code: 'x', revoked_at: null,
      expires_at: new Date(Date.now() - 1000),
      max_uses: null, uses: 0,
    });
    await expect(service.redeem(ME, 'x')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects exhausted', async () => {
    inviteRepoMock.findByCode.mockResolvedValue({
      id: LINK, chat_id: CHAT, code: 'x', revoked_at: null,
      expires_at: null, max_uses: 1, uses: 1,
    });
    await expect(service.redeem(ME, 'x')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects when chat is closed', async () => {
    inviteRepoMock.findByCode.mockResolvedValue({
      id: LINK, chat_id: CHAT, code: 'x', revoked_at: null,
      expires_at: null, max_uses: null, uses: 0,
    });
    chatRepoMock.getChatById.mockResolvedValue({
      id: CHAT, type: 'group', join_mode: 'closed',
    });
    await expect(service.redeem(ME, 'x')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('reports already-member without adding', async () => {
    inviteRepoMock.findByCode.mockResolvedValue({
      id: LINK, chat_id: CHAT, code: 'x', revoked_at: null,
      expires_at: null, max_uses: null, uses: 0,
    });
    chatRepoMock.getChatById.mockResolvedValue({
      id: CHAT, type: 'group', join_mode: 'invite_only',
    });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'member' });

    const result = await service.redeem(ME, 'x');
    expect(result.alreadyMember).toBe(true);
    expect(chatRepoMock.addMember).not.toHaveBeenCalled();
    expect(inviteRepoMock.incrementUses).not.toHaveBeenCalled();
  });

  test('adds member, increments uses, emits events', async () => {
    inviteRepoMock.findByCode.mockResolvedValue({
      id: LINK, chat_id: CHAT, code: 'x', revoked_at: null,
      expires_at: null, max_uses: 5, uses: 1,
    });
    chatRepoMock.getChatById.mockResolvedValue({
      id: CHAT, type: 'group', join_mode: 'invite_only',
    });
    chatRepoMock.getMembership.mockResolvedValue(null);

    const result = await service.redeem(ME, 'x');
    expect(chatRepoMock.addMember).toHaveBeenCalledWith({
      chatId: CHAT, userId: ME, role: 'member',
    });
    expect(inviteRepoMock.incrementUses).toHaveBeenCalledWith(LINK);
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'chat:member-added', expect.objectContaining({ userId: ME }),
    );
    expect(realtimeMock.emitToUser).toHaveBeenCalledWith(
      ME, 'chat:joined', { chatId: CHAT },
    );
    expect(result).toEqual({ chatId: CHAT, joined: true });
  });
});

describe('inviteLink.service.revoke', () => {
  test('admin revokes link belonging to chat', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    inviteRepoMock.findById.mockResolvedValue({
      id: LINK, chat_id: CHAT, revoked_at: null,
    });
    inviteRepoMock.revoke.mockResolvedValue({
      id: LINK, chat_id: CHAT, revoked_at: new Date(),
      code: 'x', created_by: ME, expires_at: null, max_uses: null,
      uses: 0, created_at: new Date(),
    });
    const link = await service.revoke(ME, CHAT, LINK);
    expect(link.revokedAt).not.toBeNull();
  });

  test('rejects when link belongs to different chat', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    inviteRepoMock.findById.mockResolvedValue({
      id: LINK, chat_id: 'other', revoked_at: null,
    });
    await expect(service.revoke(ME, CHAT, LINK)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
