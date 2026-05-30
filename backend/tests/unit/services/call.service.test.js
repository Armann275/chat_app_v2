import { jest } from '@jest/globals';

const callRepoMock = {
  create: jest.fn(),
  findById: jest.fn(),
  setStatus: jest.fn(),
  addParticipant: jest.fn(),
  markParticipantJoined: jest.fn(),
  markParticipantLeft: jest.fn(),
  listHistoryForUser: jest.fn(),
};

const chatRepoMock = {
  getChatById: jest.fn(),
  getMembership: jest.fn(),
  getMembers: jest.fn(),
};

const realtimeMock = {
  emitToChat: jest.fn(),
  emitToUser: jest.fn(),
};

jest.unstable_mockModule(
  '../../../src/repositories/call.repository.js',
  () => callRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/chat.repository.js',
  () => chatRepoMock,
);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const callService = await import('../../../src/services/call.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const CHAT = 'aaaa1111-1111-1111-1111-111111111111';
const CALL = 'bbbb2222-2222-2222-2222-222222222222';

beforeEach(() => {
  jest.clearAllMocks();
  // Clear leftover missed timers between tests.
  for (const t of callService.__test__.missedTimers.values()) clearTimeout(t);
  callService.__test__.missedTimers.clear();
});

describe('call.service.initiate', () => {
  test('rejects invalid type', async () => {
    await expect(
      callService.initiate(ME, CHAT, 'screen'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects when chat missing', async () => {
    chatRepoMock.getChatById.mockResolvedValue(null);
    await expect(
      callService.initiate(ME, CHAT, 'voice'),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  test('rejects non-direct chats', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    await expect(
      callService.initiate(ME, CHAT, 'voice'),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects non-member', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'direct' });
    chatRepoMock.getMembership.mockResolvedValue(null);
    await expect(
      callService.initiate(ME, CHAT, 'voice'),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('creates a ringing call, adds participants, emits initiated', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'direct' });
    chatRepoMock.getMembership.mockResolvedValue({ user_id: ME, role: 'member' });
    chatRepoMock.getMembers.mockResolvedValue([
      { user_id: ME }, { user_id: OTHER },
    ]);
    callRepoMock.create.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: ME, type: 'video',
      status: 'ringing', started_at: new Date(), ended_at: null,
    });

    const dto = await callService.initiate(ME, CHAT, 'video');
    expect(dto.id).toBe(CALL);
    expect(dto.status).toBe('ringing');
    expect(callRepoMock.addParticipant).toHaveBeenCalledWith(CALL, ME);
    expect(callRepoMock.addParticipant).toHaveBeenCalledWith(CALL, OTHER);
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'call:initiated', expect.objectContaining({ id: CALL }),
    );
    expect(callService.__test__.missedTimers.has(CALL)).toBe(true);
  });
});

describe('call.service.accept', () => {
  test('rejects initiator self-accept', async () => {
    callRepoMock.findById.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: ME, status: 'ringing', type: 'voice',
    });
    await expect(callService.accept(ME, CALL)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('marks active and emits accepted', async () => {
    callRepoMock.findById.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: OTHER, status: 'ringing', type: 'voice',
    });
    chatRepoMock.getMembership.mockResolvedValue({ user_id: ME, role: 'member' });
    callRepoMock.setStatus.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: OTHER,
      status: 'active', type: 'voice', started_at: new Date(),
    });

    const dto = await callService.accept(ME, CALL);
    expect(dto.status).toBe('active');
    expect(callRepoMock.markParticipantJoined).toHaveBeenCalledWith(CALL, ME);
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'call:accepted', expect.objectContaining({ acceptedBy: ME }),
    );
  });
});

describe('call.service.reject', () => {
  test('emits rejected and sets status', async () => {
    callRepoMock.findById.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: OTHER, status: 'ringing', type: 'voice',
    });
    chatRepoMock.getMembership.mockResolvedValue({ user_id: ME, role: 'member' });
    callRepoMock.setStatus.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: OTHER,
      status: 'rejected', type: 'voice', started_at: new Date(), ended_at: new Date(),
    });

    const dto = await callService.reject(ME, CALL);
    expect(dto.status).toBe('rejected');
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'call:rejected', expect.objectContaining({ rejectedBy: ME }),
    );
  });

  test('rejects non-ringing calls', async () => {
    callRepoMock.findById.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: OTHER, status: 'active', type: 'voice',
    });
    await expect(callService.reject(ME, CALL)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

describe('call.service.hangup', () => {
  test('cancels a still-ringing call', async () => {
    callRepoMock.findById.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: ME, status: 'ringing', type: 'voice',
    });
    chatRepoMock.getMembership.mockResolvedValue({ user_id: ME, role: 'member' });
    callRepoMock.setStatus.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: ME,
      status: 'cancelled', type: 'voice', started_at: new Date(), ended_at: new Date(),
    });

    const dto = await callService.hangup(ME, CALL);
    expect(dto.status).toBe('cancelled');
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'call:ended', expect.objectContaining({ endedBy: ME }),
    );
  });

  test('ends an active call', async () => {
    callRepoMock.findById.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: ME, status: 'active', type: 'voice',
    });
    chatRepoMock.getMembership.mockResolvedValue({ user_id: ME, role: 'member' });
    callRepoMock.setStatus.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: ME,
      status: 'ended', type: 'voice', started_at: new Date(), ended_at: new Date(),
    });

    const dto = await callService.hangup(ME, CALL);
    expect(dto.status).toBe('ended');
  });

  test('no-ops on already finished calls', async () => {
    callRepoMock.findById.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: ME, status: 'ended', type: 'voice',
    });
    chatRepoMock.getMembership.mockResolvedValue({ user_id: ME, role: 'member' });

    await callService.hangup(ME, CALL);
    expect(callRepoMock.setStatus).not.toHaveBeenCalled();
  });
});

describe('call.service.relaySignal', () => {
  test('emits to every other member', async () => {
    callRepoMock.findById.mockResolvedValue({
      id: CALL, chat_id: CHAT, initiator_id: ME, status: 'active', type: 'voice',
    });
    chatRepoMock.getMembership.mockResolvedValue({ user_id: ME, role: 'member' });
    chatRepoMock.getMembers.mockResolvedValue([
      { user_id: ME }, { user_id: OTHER },
    ]);

    await callService.relaySignal(ME, CALL, 'call:offer', { sdp: 'x' });
    expect(realtimeMock.emitToUser).toHaveBeenCalledWith(
      OTHER, 'call:offer', { callId: CALL, fromUserId: ME, sdp: 'x' },
    );
    expect(realtimeMock.emitToUser).not.toHaveBeenCalledWith(
      ME, expect.anything(), expect.anything(),
    );
  });
});

describe('call.service.listHistory', () => {
  test('maps rows to dtos', async () => {
    callRepoMock.listHistoryForUser.mockResolvedValue([
      { id: CALL, chat_id: CHAT, initiator_id: ME,
        type: 'voice', status: 'ended', started_at: new Date(), ended_at: new Date() },
    ]);
    const list = await callService.listHistory(ME);
    expect(list).toHaveLength(1);
    expect(list[0].chatId).toBe(CHAT);
  });
});
