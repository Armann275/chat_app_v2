import { jest } from '@jest/globals';

const refreshRepoMock = {
  findByHash: jest.fn(),
  findById: jest.fn(),
  listActiveForUser: jest.fn(),
  revoke: jest.fn(),
  revokeAllExceptId: jest.fn(),
};

const jwtMock = {
  hashRefreshToken: jest.fn((s) => `hash:${s}`),
  signAccessToken: jest.fn(),
  signRefreshToken: jest.fn(),
  verifyAccessToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
};

jest.unstable_mockModule('../../../src/repositories/refreshToken.repository.js', () => refreshRepoMock);
jest.unstable_mockModule('../../../src/utils/jwt.js', () => jwtMock);

const service = await import('../../../src/services/session.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const SESSION_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SESSION_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('session.service.listMine', () => {
  test('marks current session via refresh-token hash', async () => {
    refreshRepoMock.findByHash.mockResolvedValue({ id: SESSION_A });
    refreshRepoMock.listActiveForUser.mockResolvedValue([
      {
        id: SESSION_A, created_at: new Date(), expires_at: new Date(),
        last_used_at: null, user_agent: 'ua-a', ip: '1.1.1.1',
      },
      {
        id: SESSION_B, created_at: new Date(), expires_at: new Date(),
        last_used_at: null, user_agent: 'ua-b', ip: '2.2.2.2',
      },
    ]);

    const list = await service.listMine(ME, 'raw-token');
    expect(list.find((s) => s.id === SESSION_A).current).toBe(true);
    expect(list.find((s) => s.id === SESSION_B).current).toBe(false);
  });

  test('handles missing refresh cookie', async () => {
    refreshRepoMock.listActiveForUser.mockResolvedValue([]);
    const list = await service.listMine(ME, undefined);
    expect(list).toEqual([]);
    expect(refreshRepoMock.findByHash).not.toHaveBeenCalled();
  });
});

describe('session.service.revoke', () => {
  test('rejects unknown session', async () => {
    refreshRepoMock.findById.mockResolvedValue(null);
    await expect(service.revoke(ME, SESSION_A)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('rejects session belonging to another user', async () => {
    refreshRepoMock.findById.mockResolvedValue({ id: SESSION_A, user_id: OTHER });
    await expect(service.revoke(ME, SESSION_A)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('revokes own session', async () => {
    refreshRepoMock.findById.mockResolvedValue({
      id: SESSION_A, user_id: ME, revoked_at: null,
    });
    await service.revoke(ME, SESSION_A);
    expect(refreshRepoMock.revoke).toHaveBeenCalledWith(SESSION_A);
  });

  test('idempotent on already-revoked session', async () => {
    refreshRepoMock.findById.mockResolvedValue({
      id: SESSION_A, user_id: ME, revoked_at: new Date(),
    });
    await service.revoke(ME, SESSION_A);
    expect(refreshRepoMock.revoke).not.toHaveBeenCalled();
  });
});

describe('session.service.revokeOthers', () => {
  test('refuses without current session', async () => {
    refreshRepoMock.findByHash.mockResolvedValue(null);
    await expect(service.revokeOthers(ME, undefined)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('revokes everything except current', async () => {
    refreshRepoMock.findByHash.mockResolvedValue({ id: SESSION_A });
    await service.revokeOthers(ME, 'raw');
    expect(refreshRepoMock.revokeAllExceptId).toHaveBeenCalledWith(ME, SESSION_A);
  });
});
