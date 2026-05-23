import { jest } from '@jest/globals';

const userRepoMock = {
  createUser: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByUsername: jest.fn(),
  markEmailVerified: jest.fn(),
};

const refreshRepoMock = {
  create: jest.fn(),
  findByHash: jest.fn(),
  revoke: jest.fn(),
  revokeAllForUser: jest.fn(),
};

const verificationRepoMock = {
  create: jest.fn(),
  findActiveByUserId: jest.fn(),
  markConsumed: jest.fn(),
  incrementAttempts: jest.fn(),
  invalidateAllForUser: jest.fn(),
};

const emailServiceMock = {
  sendVerificationCode: jest.fn().mockResolvedValue(undefined),
};

jest.unstable_mockModule('../../../src/repositories/user.repository.js', () => userRepoMock);
jest.unstable_mockModule(
  '../../../src/repositories/refreshToken.repository.js',
  () => refreshRepoMock,
);
jest.unstable_mockModule(
  '../../../src/repositories/emailVerification.repository.js',
  () => verificationRepoMock,
);
jest.unstable_mockModule('../../../src/services/email.service.js', () => emailServiceMock);

const authService = await import('../../../src/services/auth.service.js');
const password = await import('../../../src/utils/password.js');
const jwtUtil = await import('../../../src/utils/jwt.js');

const baseUser = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'alice',
  email: 'alice@example.com',
  password_hash: 'irrelevant-here',
  email_verified_at: new Date('2026-01-01T00:00:00Z'),
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-01-01T00:00:00Z'),
};

const unverifiedUser = { ...baseUser, email_verified_at: null };

beforeEach(() => {
  jest.clearAllMocks();
  emailServiceMock.sendVerificationCode.mockResolvedValue(undefined);
  verificationRepoMock.invalidateAllForUser.mockResolvedValue(undefined);
  verificationRepoMock.create.mockResolvedValue({ id: 'v1' });
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

  test('creates user, sends verification code, returns user without tokens', async () => {
    userRepoMock.findByEmail.mockResolvedValue(null);
    userRepoMock.findByUsername.mockResolvedValue(null);
    userRepoMock.createUser.mockResolvedValue(unverifiedUser);

    const result = await authService.register({
      username: 'alice',
      email: 'alice@example.com',
      password: 'longenoughpwd',
    });

    expect(userRepoMock.createUser).toHaveBeenCalledTimes(1);
    const createArgs = userRepoMock.createUser.mock.calls[0][0];
    expect(createArgs.passwordHash).not.toBe('longenoughpwd');

    expect(verificationRepoMock.invalidateAllForUser).toHaveBeenCalledWith(unverifiedUser.id);
    expect(verificationRepoMock.create).toHaveBeenCalledTimes(1);
    expect(emailServiceMock.sendVerificationCode).toHaveBeenCalledWith(
      unverifiedUser.email,
      expect.stringMatching(/^\d{6}$/),
    );

    expect(refreshRepoMock.create).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      requiresEmailVerification: true,
      user: { id: unverifiedUser.id },
    });
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
  });
});

describe('auth.service.verifyEmail', () => {
  test('rejects when no active verification exists', async () => {
    userRepoMock.findById.mockResolvedValue(unverifiedUser);
    verificationRepoMock.findActiveByUserId.mockResolvedValue(null);

    await expect(
      authService.verifyEmail({ userId: unverifiedUser.id, code: '123456' }),
    ).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_CODE' });
  });

  test('rejects expired code', async () => {
    userRepoMock.findById.mockResolvedValue(unverifiedUser);
    verificationRepoMock.findActiveByUserId.mockResolvedValue({
      id: 'v1',
      code_hash: await password.hash('123456'),
      expires_at: new Date(Date.now() - 1000),
      attempts: 0,
    });

    await expect(
      authService.verifyEmail({ userId: unverifiedUser.id, code: '123456' }),
    ).rejects.toMatchObject({ code: 'VERIFICATION_CODE_EXPIRED' });
  });

  test('rejects wrong code and increments attempts', async () => {
    userRepoMock.findById.mockResolvedValue(unverifiedUser);
    verificationRepoMock.findActiveByUserId.mockResolvedValue({
      id: 'v1',
      code_hash: await password.hash('123456'),
      expires_at: new Date(Date.now() + 60_000),
      attempts: 1,
    });
    verificationRepoMock.incrementAttempts.mockResolvedValue(2);

    await expect(
      authService.verifyEmail({ userId: unverifiedUser.id, code: '999999' }),
    ).rejects.toMatchObject({ code: 'INVALID_VERIFICATION_CODE' });
    expect(verificationRepoMock.incrementAttempts).toHaveBeenCalledWith('v1');
  });

  test('locks out after too many attempts', async () => {
    userRepoMock.findById.mockResolvedValue(unverifiedUser);
    verificationRepoMock.findActiveByUserId.mockResolvedValue({
      id: 'v1',
      code_hash: await password.hash('123456'),
      expires_at: new Date(Date.now() + 60_000),
      attempts: 5,
    });

    await expect(
      authService.verifyEmail({ userId: unverifiedUser.id, code: '999999' }),
    ).rejects.toMatchObject({ code: 'TOO_MANY_VERIFICATION_ATTEMPTS' });
  });

  test('happy path: marks consumed, marks user verified, issues tokens', async () => {
    userRepoMock.findById.mockResolvedValue(unverifiedUser);
    verificationRepoMock.findActiveByUserId.mockResolvedValue({
      id: 'v1',
      code_hash: await password.hash('123456'),
      expires_at: new Date(Date.now() + 60_000),
      attempts: 0,
    });
    userRepoMock.markEmailVerified.mockResolvedValue(baseUser);
    refreshRepoMock.create.mockResolvedValue({ id: 'rt1' });

    const result = await authService.verifyEmail({
      userId: unverifiedUser.id,
      code: '123456',
    });

    expect(verificationRepoMock.markConsumed).toHaveBeenCalledWith('v1');
    expect(userRepoMock.markEmailVerified).toHaveBeenCalledWith(unverifiedUser.id);
    expect(refreshRepoMock.create).toHaveBeenCalledTimes(1);
    expect(result.user.id).toBe(baseUser.id);
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

  test('throws EmailNotVerified when email is unverified', async () => {
    const stored = {
      ...unverifiedUser,
      password_hash: await password.hash('correctpw1'),
    };
    userRepoMock.findByEmail.mockResolvedValue(stored);

    await expect(
      authService.login({ email: stored.email, password: 'correctpw1' }),
    ).rejects.toMatchObject({
      code: 'EMAIL_NOT_VERIFIED',
      details: { userId: stored.id, requiresEmailVerification: true },
    });
    expect(refreshRepoMock.create).not.toHaveBeenCalled();
  });

  test('issues tokens on valid credentials when verified', async () => {
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
