import { jest } from '@jest/globals';

const pollRepoMock = {
  createPollWithOptions: jest.fn(),
  findById: jest.fn(),
  listOptions: jest.fn(),
  listByChat: jest.fn(),
  tally: jest.fn(),
  listUserVotes: jest.fn(),
  findOption: jest.fn(),
  addVote: jest.fn(),
  removeVote: jest.fn(),
  close: jest.fn(),
};

const chatRepoMock = {
  getChatById: jest.fn(),
  getMembership: jest.fn(),
};

const realtimeMock = {
  emitToChat: jest.fn(),
  emitToUser: jest.fn(),
  setRealtimeEmitter: jest.fn(),
};

jest.unstable_mockModule('../../../src/repositories/poll.repository.js', () => pollRepoMock);
jest.unstable_mockModule('../../../src/repositories/chat.repository.js', () => chatRepoMock);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const service = await import('../../../src/services/poll.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const CHAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const POLL = 'pppppppp-pppp-pppp-pppp-pppppppppppp';
const OPT_A = 'aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa';
const OPT_B = 'bbbbbbbb-2222-2222-2222-bbbbbbbbbbbb';

beforeEach(() => {
  jest.clearAllMocks();
});

const pollRow = {
  id: POLL, chat_id: CHAT, question: 'q', multi_choice: false,
  closes_at: null, closed_at: null, created_by: ME, created_at: new Date(),
};
const optionRows = [
  { id: OPT_A, poll_id: POLL, text: 'A', order_index: 0 },
  { id: OPT_B, poll_id: POLL, text: 'B', order_index: 1 },
];

describe('poll.service.createPoll', () => {
  test('rejects empty question', async () => {
    await expect(
      service.createPoll(ME, CHAT, { question: '   ', options: ['a', 'b'] }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects fewer than 2 options', async () => {
    await expect(
      service.createPoll(ME, CHAT, { question: 'q', options: ['only'] }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects past closesAt', async () => {
    await expect(
      service.createPoll(ME, CHAT, {
        question: 'q', options: ['a', 'b'], closesAt: '2000-01-01T00:00:00Z',
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects on direct chat', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'direct' });
    await expect(
      service.createPoll(ME, CHAT, { question: 'q', options: ['a', 'b'] }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects non-member', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue(null);
    await expect(
      service.createPoll(ME, CHAT, { question: 'q', options: ['a', 'b'] }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  test('member creates poll, emits poll:created', async () => {
    chatRepoMock.getChatById.mockResolvedValue({ id: CHAT, type: 'group' });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'member' });
    pollRepoMock.createPollWithOptions.mockResolvedValue({
      poll: pollRow, options: optionRows,
    });

    const dto = await service.createPoll(ME, CHAT, {
      question: ' q ', options: [' A ', 'B', ''], multiChoice: true,
    });
    expect(pollRepoMock.createPollWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: CHAT, question: 'q', multiChoice: true, options: ['A', 'B'],
      }),
    );
    expect(dto.options).toHaveLength(2);
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'poll:created', expect.objectContaining({ id: POLL }),
    );
  });
});

describe('poll.service.vote', () => {
  test('rejects closed poll', async () => {
    pollRepoMock.findById.mockResolvedValue({ ...pollRow, closed_at: new Date() });
    await expect(service.vote(ME, POLL, OPT_A)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects when poll expired via closes_at', async () => {
    pollRepoMock.findById.mockResolvedValue({
      ...pollRow, closes_at: new Date(Date.now() - 1000),
    });
    await expect(service.vote(ME, POLL, OPT_A)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects when option does not belong to poll', async () => {
    pollRepoMock.findById.mockResolvedValue(pollRow);
    chatRepoMock.getMembership.mockResolvedValue({ role: 'member' });
    pollRepoMock.findOption.mockResolvedValue({
      id: OPT_A, poll_id: 'other', text: 'A', order_index: 0,
    });
    await expect(service.vote(ME, POLL, OPT_A)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('single-choice vote replaces previous', async () => {
    pollRepoMock.findById.mockResolvedValue(pollRow);
    chatRepoMock.getMembership.mockResolvedValue({ role: 'member' });
    pollRepoMock.findOption.mockResolvedValue(optionRows[0]);
    pollRepoMock.listOptions.mockResolvedValue(optionRows);
    pollRepoMock.tally.mockResolvedValue([{ option_id: OPT_A, votes: 1 }]);
    pollRepoMock.listUserVotes.mockResolvedValue([OPT_A]);

    const dto = await service.vote(ME, POLL, OPT_A);
    expect(pollRepoMock.addVote).toHaveBeenCalledWith({
      pollId: POLL, optionId: OPT_A, userId: ME, replaceForSingleChoice: true,
    });
    expect(dto.options.find((o) => o.id === OPT_A).votes).toBe(1);
    expect(dto.options.find((o) => o.id === OPT_A).mine).toBe(true);
  });

  test('multi-choice vote does not replace', async () => {
    pollRepoMock.findById.mockResolvedValue({ ...pollRow, multi_choice: true });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'member' });
    pollRepoMock.findOption.mockResolvedValue(optionRows[0]);
    pollRepoMock.listOptions.mockResolvedValue(optionRows);
    pollRepoMock.tally.mockResolvedValue([
      { option_id: OPT_A, votes: 1 }, { option_id: OPT_B, votes: 1 },
    ]);
    pollRepoMock.listUserVotes.mockResolvedValue([OPT_A, OPT_B]);

    await service.vote(ME, POLL, OPT_A);
    expect(pollRepoMock.addVote).toHaveBeenCalledWith(
      expect.objectContaining({ replaceForSingleChoice: false }),
    );
  });
});

describe('poll.service.closePoll', () => {
  test('rejects non-creator non-admin', async () => {
    pollRepoMock.findById.mockResolvedValue(pollRow);
    chatRepoMock.getMembership.mockResolvedValue({ role: 'member' });
    await expect(service.closePoll(OTHER, POLL)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('creator can close', async () => {
    pollRepoMock.findById
      .mockResolvedValueOnce(pollRow)
      .mockResolvedValueOnce({ ...pollRow, closed_at: new Date() });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'member' });
    pollRepoMock.listOptions.mockResolvedValue(optionRows);
    pollRepoMock.tally.mockResolvedValue([]);
    pollRepoMock.listUserVotes.mockResolvedValue([]);

    const dto = await service.closePoll(ME, POLL);
    expect(pollRepoMock.close).toHaveBeenCalledWith(POLL);
    expect(realtimeMock.emitToChat).toHaveBeenCalledWith(
      CHAT, 'poll:closed', { pollId: POLL },
    );
    expect(dto.closedAt).not.toBeNull();
  });

  test('admin can close any poll', async () => {
    pollRepoMock.findById
      .mockResolvedValueOnce(pollRow)
      .mockResolvedValueOnce({ ...pollRow, closed_at: new Date() });
    chatRepoMock.getMembership.mockResolvedValue({ role: 'admin' });
    pollRepoMock.listOptions.mockResolvedValue(optionRows);
    pollRepoMock.tally.mockResolvedValue([]);
    pollRepoMock.listUserVotes.mockResolvedValue([]);

    await service.closePoll(OTHER, POLL);
    expect(pollRepoMock.close).toHaveBeenCalledWith(POLL);
  });
});
