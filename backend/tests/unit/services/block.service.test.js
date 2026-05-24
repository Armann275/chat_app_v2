import { jest } from '@jest/globals';

const blockRepoMock = {
  block: jest.fn(),
  unblock: jest.fn(),
  isBlocked: jest.fn(),
  eitherSideBlocks: jest.fn(),
  listBlocked: jest.fn(),
};
const userRepoMock = { findById: jest.fn() };
const realtimeMock = { emitToUser: jest.fn(), setUserEmitter: jest.fn() };

jest.unstable_mockModule('../../../src/repositories/block.repository.js', () => blockRepoMock);
jest.unstable_mockModule('../../../src/repositories/user.repository.js', () => userRepoMock);
jest.unstable_mockModule('../../../src/sockets/realtime.js', () => realtimeMock);

const service = await import('../../../src/services/block.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('block.service.block', () => {
  test('rejects self-block', async () => {
    await expect(service.block(ME, ME)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects unknown user', async () => {
    userRepoMock.findById.mockResolvedValue(null);
    await expect(service.block(ME, OTHER)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('blocks and emits user:blocked', async () => {
    userRepoMock.findById.mockResolvedValue({ id: OTHER });
    blockRepoMock.block.mockResolvedValue({
      blocker_id: ME, blocked_id: OTHER, created_at: new Date(),
    });
    const result = await service.block(ME, OTHER);
    expect(blockRepoMock.block).toHaveBeenCalledWith(ME, OTHER);
    expect(realtimeMock.emitToUser).toHaveBeenCalledWith(
      ME, 'user:blocked', { userId: OTHER },
    );
    expect(result).toEqual({ blocked: true });
  });
});

describe('block.service.unblock', () => {
  test('unblocks and emits', async () => {
    await service.unblock(ME, OTHER);
    expect(blockRepoMock.unblock).toHaveBeenCalledWith(ME, OTHER);
    expect(realtimeMock.emitToUser).toHaveBeenCalledWith(
      ME, 'user:unblocked', { userId: OTHER },
    );
  });
});

describe('block.service.eitherSideBlocks', () => {
  test('returns false when ids match', async () => {
    expect(await service.eitherSideBlocks(ME, ME)).toBe(false);
    expect(blockRepoMock.eitherSideBlocks).not.toHaveBeenCalled();
  });

  test('returns true when repo finds a row', async () => {
    blockRepoMock.eitherSideBlocks.mockResolvedValue({ blocker_id: OTHER, blocked_id: ME });
    expect(await service.eitherSideBlocks(ME, OTHER)).toBe(true);
  });

  test('returns false when repo returns null', async () => {
    blockRepoMock.eitherSideBlocks.mockResolvedValue(null);
    expect(await service.eitherSideBlocks(ME, OTHER)).toBe(false);
  });
});
