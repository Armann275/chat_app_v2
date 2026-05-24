import { jest } from '@jest/globals';
import { generateSecret, generate as totpGenerate } from 'otplib';

const twoFactorRepoMock = {
  getTotpForUser: jest.fn(),
  setTotpSecret: jest.fn(),
  enableTotp: jest.fn(),
  disableTotp: jest.fn(),
  replaceBackupCodes: jest.fn(),
  createChallenge: jest.fn(),
  findChallengeByHash: jest.fn(),
  consumeChallenge: jest.fn(),
};
const userRepoMock = { findById: jest.fn() };
const passwordMock = {
  hash: jest.fn(async (v) => `hash:${v}`),
  compare: jest.fn(async (raw, hashed) => hashed === `hash:${raw}`),
};

jest.unstable_mockModule('../../../src/repositories/twoFactor.repository.js', () => twoFactorRepoMock);
jest.unstable_mockModule('../../../src/repositories/user.repository.js', () => userRepoMock);
jest.unstable_mockModule('../../../src/utils/password.js', () => passwordMock);

const service = await import('../../../src/services/totp.service.js');

const ME = '11111111-1111-1111-1111-111111111111';
const SECRET = generateSecret();
async function currentToken() {
  return totpGenerate({ secret: SECRET });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('totp.service.beginSetup', () => {
  test('fails when 2FA already enabled', async () => {
    userRepoMock.findById.mockResolvedValue({ id: ME, email: 'a@b.com' });
    twoFactorRepoMock.getTotpForUser.mockResolvedValue({
      totp_secret: SECRET, totp_enabled_at: new Date(),
    });
    await expect(service.beginSetup(ME)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('returns otpauth URI and stores secret', async () => {
    userRepoMock.findById.mockResolvedValue({ id: ME, email: 'a@b.com' });
    twoFactorRepoMock.getTotpForUser.mockResolvedValue(null);
    const result = await service.beginSetup(ME);
    expect(twoFactorRepoMock.setTotpSecret).toHaveBeenCalled();
    expect(result.secret).toBeTruthy();
    expect(result.otpauth).toContain('otpauth://totp/');
  });
});

describe('totp.service.enable', () => {
  test('rejects without prior setup', async () => {
    twoFactorRepoMock.getTotpForUser.mockResolvedValue(null);
    await expect(service.enable(ME, '123456')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects invalid code', async () => {
    twoFactorRepoMock.getTotpForUser.mockResolvedValue({
      totp_secret: SECRET, totp_enabled_at: null,
    });
    await expect(service.enable(ME, '000000')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  test('enables on valid code and returns backup codes', async () => {
    twoFactorRepoMock.getTotpForUser.mockResolvedValue({
      totp_secret: SECRET, totp_enabled_at: null,
    });
    const validCode = await currentToken();
    const result = await service.enable(ME, validCode);
    expect(twoFactorRepoMock.enableTotp).toHaveBeenCalled();
    expect(result.backupCodes).toHaveLength(10);
    expect(result.backupCodes.every((c) => /^[a-f0-9]{10}$/.test(c))).toBe(true);
  });
});

describe('totp.service.disable', () => {
  test('rejects when 2FA not enabled', async () => {
    twoFactorRepoMock.getTotpForUser.mockResolvedValue({
      totp_secret: null, totp_enabled_at: null,
    });
    await expect(service.disable(ME, '111111')).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects invalid code', async () => {
    twoFactorRepoMock.getTotpForUser.mockResolvedValue({
      totp_secret: SECRET, totp_enabled_at: new Date(),
    });
    await expect(service.disable(ME, '000000')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  test('disables on valid code', async () => {
    twoFactorRepoMock.getTotpForUser.mockResolvedValue({
      totp_secret: SECRET, totp_enabled_at: new Date(),
    });
    await service.disable(ME, await currentToken());
    expect(twoFactorRepoMock.disableTotp).toHaveBeenCalledWith(ME);
  });
});

describe('totp.service.verifyChallenge', () => {
  test('rejects expired challenge', async () => {
    twoFactorRepoMock.findChallengeByHash.mockResolvedValue({
      id: 'c1', user_id: ME, consumed_at: null,
      expires_at: new Date(Date.now() - 1000),
    });
    await expect(
      service.verifyChallenge({ token: 'tok', code: '000000' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('rejects already-consumed challenge', async () => {
    twoFactorRepoMock.findChallengeByHash.mockResolvedValue({
      id: 'c1', user_id: ME, consumed_at: new Date(),
      expires_at: new Date(Date.now() + 60_000),
    });
    await expect(
      service.verifyChallenge({ token: 'tok', code: '000000' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  test('verifies TOTP code', async () => {
    twoFactorRepoMock.findChallengeByHash.mockResolvedValue({
      id: 'c1', user_id: ME, consumed_at: null,
      expires_at: new Date(Date.now() + 60_000),
    });
    twoFactorRepoMock.getTotpForUser.mockResolvedValue({
      totp_secret: SECRET, totp_enabled_at: new Date(), totp_backup_codes: [],
    });
    const result = await service.verifyChallenge({
      token: 'tok', code: await currentToken(),
    });
    expect(result.userId).toBe(ME);
    expect(twoFactorRepoMock.consumeChallenge).toHaveBeenCalledWith('c1');
  });

  test('verifies backup code and removes it', async () => {
    twoFactorRepoMock.findChallengeByHash.mockResolvedValue({
      id: 'c1', user_id: ME, consumed_at: null,
      expires_at: new Date(Date.now() + 60_000),
    });
    twoFactorRepoMock.getTotpForUser.mockResolvedValue({
      totp_secret: SECRET, totp_enabled_at: new Date(),
      totp_backup_codes: ['hash:backup1', 'hash:backup2'],
    });
    await service.verifyChallenge({ token: 'tok', code: 'backup1' });
    expect(twoFactorRepoMock.replaceBackupCodes).toHaveBeenCalledWith(
      ME, ['hash:backup2'],
    );
  });
});
