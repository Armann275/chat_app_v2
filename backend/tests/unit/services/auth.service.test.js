import { jest } from '@jest/globals';

const userRepoMock = {
  createUser: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
};

const refreshRepoMock = {
  create: jest.fn(),
  findByHash: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
};

jest.unstable_mockModule('../../../src/repositories/user.repository.js', () => userRepoMock);
jest.unstable_mockModule(
  '../../../src/repositories/refreshToken.repository.js',
  () => refreshRepoMock,
);

const authService = await import('../../../src/services/auth.service.js');
const password = await import('../../../src/utils/password.js');
const jwtUtil = await import('../../../src/utils/jwt.js');

const baseUser = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'alice',
  email: 'alice@example.com',
  password_hash: 'irrelevant-here',
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('auth.service.register', () => {
  test('rejects duplicate email', async () => {
    userRepoMock.findByEmail.mockResolvedValue(baseUser);
    userRepoMock.findByUsername.mockResolvedValue(null);

    await expect(
      authService.register({
        username: 'bob',
        email: baseUser.email,
        password: 'longenoughpwd',
      }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });

    expect(userRepoMock.createUser).not.toHaveBeenCalled();
  });

  test('rejects duplicate username', async () => {
    userRepoMock.findByEmail.mockResolvedValue(null);
    userRepoMock.findByUsername.mockResolvedValue(baseUser);

    await expect(
      authService.register({
        username: baseUser.username,
        email: 'new@example.com',
        password: 'longenoughpwd',
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  test('creates user, hashes password, persists refresh token, returns tokens', async () => {
    userRepoMock.findByEmail.mockResolvedValue(null);
    userRepoMock.findByUsername.mockResolvedValue(null);
    userRepoMock.createUser.mockResolvedValue(baseUser);
    refreshRepoMock.create.mockResolvedValue({ id: 'rt1' });

    const result = await authService.register({
      username: 'alice',
      email: 'alice@example.com',
      password: 'longenoughpwd',
    });

    expect(userRepoMock.createUser).toHaveBeenCalledTimes(1);
    const createArgs = userRepoMock.createUser.mock.calls[0][0];
    expect(createArgs.username).toBe('alice');
    expect(createArgs.email).toBe('alice@example.com');
    expect(createArgs.passwordHash).not.toBe('longenoughpwd');
    expect(createArgs.passwordHash.length).toBeGreaterThan(20);

    expect(refreshRepoMock.create).toHaveBeenCalledTimes(1);
    const stored = refreshRepoMock.create.mock.calls[0][0];
    expect(stored.userId).toBe(baseUser.id);
    expect(stored.tokenHash).toBe(jwtUtil.hashRefreshToken(result.refreshToken));
    expect(stored.expiresAt).toBeInstanceOf(Date);

    expect(result.user).toMatchObject({
      id: baseUser.id,
      username: baseUser.username,
      email: baseUser.email,
    });
    expect(result.user).not.toHaveProperty('password_hash');
    expect(typeof result.accessToken).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
  });
});

describe('auth.service.login', () => {
  test('throws Unauthorized for unknown email', async () => {
    userRepoMock.findByEmail.mockResolvedValue(null);
    await expect(
      authService.login({ email: 'nobody@x.com', password: 'longenoughpwd' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('throws Unauthorized on bad password', async () => {
    const stored = { ...baseUser, password_hash: await password.hash('correctpw1') };
    userRepoMock.findByEmail.mockResolvedValue(stored);

    await expect(
      authService.login({ email: stored.email, password: 'wrongpw1234' }),
    ).rejects.toMatchObject({ statusCode: 401 });
    expect(refreshRepoMock.create).not.toHaveBeenCalled();
  });

  test('issues tokens on valid credentials', async () => {
    const stored = { ...baseUser, password_hash: await password.hash('correctpw1') };
    userRepoMock.findByEmail.mockResolvedValue(stored);
    refreshRepoMock.create.mockResolvedValue({ id: 'rt1' });

    const result = await authService.login({
      email: stored.email,
      password: 'correctpw1',
    });

    expect(result.user.id).toBe(baseUser.id);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(refreshRepoMock.create).toHaveBeenCalledTimes(1);
  });
});

describe('auth.service.refresh', () => {
  test('throws when no token provided', async () => {
    await expect(authService.refresh(undefined)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  test('throws when token is invalid jwt', async () => {
    await expect(authService.refresh('not-a-jwt')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  test('rotates: revokes old token, creates new one, returns fresh tokens', async () => {
    const original = jwtUtil.signRefreshToken({ sub: baseUser.id });
    refreshRepoMock.findByHash.mockResolvedValue({
      id: 'rt-old',
      user_id: baseUser.id,
      token_hash: jwtUtil.hashRefreshToken(original),
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    });
    userRepoMock.findById.mockResolvedValue(baseUser);
    refreshRepoMock.create.mockResolvedValue({ id: 'rt-new' });

    const result = await authService.refresh(original);

    expect(refreshRepoMock.revoke).toHaveBeenCalledWith('rt-old');
    expect(refreshRepoMock.create).toHaveBeenCalledTimes(1);
    const persisted = refreshRepoMock.create.mock.calls[0][0];
    expect(persisted.tokenHash).toBe(jwtUtil.hashRefreshToken(result.refreshToken));
    expect(result.user.id).toBe(baseUser.id);
  });

  test('rejects already-revoked token', async () => {
    const original = jwtUtil.signRefreshToken({ sub: baseUser.id });
    refreshRepoMock.findByHash.mockResolvedValue({
      id: 'rt-old',
      user_id: baseUser.id,
      token_hash: jwtUtil.hashRefreshToken(original),
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: new Date(),
    });

    await expect(authService.refresh(original)).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(refreshRepoMock.revoke).not.toHaveBeenCalled();
  });

  test('rejects unknown token (signature ok but not in DB)', async () => {
    const original = jwtUtil.signRefreshToken({ sub: baseUser.id });
    refreshRepoMock.findByHash.mockResolvedValue(null);

    await expect(authService.refresh(original)).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

describe('auth.service.logout', () => {
  test('no-ops on missing token', async () => {
    await authService.logout(undefined);
    expect(refreshRepoMock.revoke).not.toHaveBeenCalled();
  });

  test('revokes when token is recognized and active', async () => {
    const original = jwtUtil.signRefreshToken({ sub: baseUser.id });
    refreshRepoMock.findByHash.mockResolvedValue({
      id: 'rt-x',
      user_id: baseUser.id,
      token_hash: jwtUtil.hashRefreshToken(original),
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    });

    await authService.logout(original);
    expect(refreshRepoMock.revoke).toHaveBeenCalledWith('rt-x');
  });

  test('does not double-revoke', async () => {
    const original = jwtUtil.signRefreshToken({ sub: baseUser.id });
    refreshRepoMock.findByHash.mockResolvedValue({
      id: 'rt-x',
      user_id: baseUser.id,
      token_hash: jwtUtil.hashRefreshToken(original),
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: new Date(),
    });

    await authService.logout(original);
    expect(refreshRepoMock.revoke).not.toHaveBeenCalled();
  });
});

describe('auth.service.me', () => {
  test('returns public user shape', async () => {
    userRepoMock.findById.mockResolvedValue(baseUser);
    const me = await authService.me(baseUser.id);
    expect(me).toMatchObject({
      id: baseUser.id,
      username: baseUser.username,
      email: baseUser.email,
    });
    expect(me).not.toHaveProperty('password_hash');
  });

  test('throws NotFound when user is missing', async () => {
    userRepoMock.findById.mockResolvedValue(null);
    await expect(authService.me('missing')).rejects.toMatchObject({ statusCode: 404 });
  });
});
