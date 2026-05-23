import { jest } from '@jest/globals';

const userRepoMock = {
  findById: jest.fn(),
  updateProfile: jest.fn(),
  searchByUsername: jest.fn(),
};

jest.unstable_mockModule('../../../src/repositories/user.repository.js', () => userRepoMock);

const userService = await import('../../../src/services/user.service.js');

const baseRow = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'alice',
  email: 'alice@example.com',
  avatar_url: null,
  bio: null,
  last_seen_at: null,
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('user.service.getProfile', () => {
  test('returns public user shape', async () => {
    userRepoMock.findById.mockResolvedValue(baseRow);
    const u = await userService.getProfile(baseRow.id);
    expect(u).toEqual({
      id: baseRow.id,
      username: 'alice',
      email: 'alice@example.com',
      avatarUrl: null,
      bio: null,
      lastSeenAt: null,
      createdAt: baseRow.created_at,
      updatedAt: baseRow.updated_at,
    });
  });

  test('throws NotFound when user is missing', async () => {
    userRepoMock.findById.mockResolvedValue(null);
    await expect(userService.getProfile('missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('user.service.updateProfile', () => {
  test('passes avatarUrl + bio through and returns mapped user', async () => {
    const updated = { ...baseRow, avatar_url: 'https://x/y.png', bio: 'hi' };
    userRepoMock.updateProfile.mockResolvedValue(updated);

    const u = await userService.updateProfile(baseRow.id, {
      avatarUrl: 'https://x/y.png',
      bio: 'hi',
    });

    expect(userRepoMock.updateProfile).toHaveBeenCalledWith(baseRow.id, {
      avatarUrl: 'https://x/y.png',
      bio: 'hi',
    });
    expect(u.avatarUrl).toBe('https://x/y.png');
    expect(u.bio).toBe('hi');
  });

  test('throws NotFound when update returns nothing', async () => {
    userRepoMock.updateProfile.mockResolvedValue(null);
    await expect(
      userService.updateProfile('missing', { avatarUrl: null, bio: null }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('user.service.searchUsers', () => {
  test('returns empty array for empty/whitespace query without hitting repo', async () => {
    expect(await userService.searchUsers('')).toEqual([]);
    expect(await userService.searchUsers('   ')).toEqual([]);
    expect(userRepoMock.searchByUsername).not.toHaveBeenCalled();
  });

  test('trims and forwards query, maps results', async () => {
    userRepoMock.searchByUsername.mockResolvedValue([baseRow]);
    const result = await userService.searchUsers('  ali  ', { limit: 10, offset: 0 });
    expect(userRepoMock.searchByUsername).toHaveBeenCalledWith('ali', {
      limit: 10,
      offset: 0,
    });
    expect(result).toHaveLength(1);
    expect(result[0].username).toBe('alice');
  });
});
