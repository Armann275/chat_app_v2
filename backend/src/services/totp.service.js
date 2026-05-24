import { randomBytes, randomUUID, createHash } from 'node:crypto';
import {
  generateSecret as otpGenerateSecret,
  generate as otpGenerate,
  verify as otpVerify,
  generateURI as otpGenerateURI,
} from 'otplib';
import * as twoFactorRepo from '../repositories/twoFactor.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import * as password from '../utils/password.js';
import {
  ValidationError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../errors/errors.js';

const ISSUER = 'ChatApp';
const BACKUP_CODE_COUNT = 10;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

async function verifyTotpToken(secret, token) {
  try {
    const result = await otpVerify({ secret, token });
    return Boolean(result?.valid);
  } catch {
    // otpVerify throws on malformed tokens (e.g. wrong length).
    // Treat as "not valid" so callers can fall through to backup codes.
    return false;
  }
}

function generateBackupCodePlain() {
  return randomBytes(5).toString('hex'); // 10 hex chars
}

async function generateBackupCodes() {
  const plain = [];
  const hashed = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i += 1) {
    const code = generateBackupCodePlain();
    plain.push(code);
    // eslint-disable-next-line no-await-in-loop
    hashed.push(await password.hash(code));
  }
  return { plain, hashed };
}

function hashChallengeToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export async function beginSetup(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User not found');

  const existing = await twoFactorRepo.getTotpForUser(userId);
  if (existing?.totp_enabled_at) {
    throw new ConflictError('2FA is already enabled');
  }

  const secret = otpGenerateSecret();
  await twoFactorRepo.setTotpSecret(userId, secret);

  const otpauth = otpGenerateURI({
    label: user.email,
    issuer: ISSUER,
    secret,
  });
  return { secret, otpauth };
}

export async function enable(userId, code) {
  if (!code || typeof code !== 'string') {
    throw new ValidationError('code is required');
  }
  const row = await twoFactorRepo.getTotpForUser(userId);
  if (!row?.totp_secret) {
    throw new ConflictError('Begin setup before enabling');
  }
  if (row.totp_enabled_at) {
    throw new ConflictError('2FA is already enabled');
  }
  if (!(await verifyTotpToken(row.totp_secret, code.trim()))) {
    throw new UnauthorizedError('Invalid 2FA code');
  }

  const { plain, hashed } = await generateBackupCodes();
  await twoFactorRepo.enableTotp(userId, hashed);
  return { backupCodes: plain };
}

export async function disable(userId, code) {
  const row = await twoFactorRepo.getTotpForUser(userId);
  if (!row?.totp_enabled_at) {
    throw new ConflictError('2FA is not enabled');
  }
  if (!(await verifyTotpToken(row.totp_secret, (code || '').trim()))) {
    throw new UnauthorizedError('Invalid 2FA code');
  }
  await twoFactorRepo.disableTotp(userId);
  return { disabled: true };
}

export async function regenerateBackupCodes(userId) {
  const row = await twoFactorRepo.getTotpForUser(userId);
  if (!row?.totp_enabled_at) {
    throw new ConflictError('2FA is not enabled');
  }
  const { plain, hashed } = await generateBackupCodes();
  await twoFactorRepo.replaceBackupCodes(userId, hashed);
  return { backupCodes: plain };
}

export async function isEnabled(userId) {
  const row = await twoFactorRepo.getTotpForUser(userId);
  return Boolean(row?.totp_enabled_at);
}

export async function createChallenge(userId) {
  const token = randomUUID() + '.' + randomBytes(16).toString('hex');
  const tokenHash = hashChallengeToken(token);
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await twoFactorRepo.createChallenge({ userId, tokenHash, expiresAt });
  return { token, expiresAt };
}

async function consumeChallenge(token) {
  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('Missing 2FA token');
  }
  const challenge = await twoFactorRepo.findChallengeByHash(hashChallengeToken(token));
  if (!challenge) throw new UnauthorizedError('Invalid 2FA token');
  if (challenge.consumed_at) throw new UnauthorizedError('2FA token already used');
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    throw new UnauthorizedError('2FA token expired');
  }
  await twoFactorRepo.consumeChallenge(challenge.id);
  return challenge;
}

async function verifyTotpCode(userId, code) {
  const row = await twoFactorRepo.getTotpForUser(userId);
  if (!row?.totp_enabled_at || !row.totp_secret) return false;

  const trimmed = (code || '').trim();
  if (!trimmed) return false;

  if (await verifyTotpToken(row.totp_secret, trimmed)) {
    return true;
  }

  const backup = row.totp_backup_codes ?? [];
  for (let i = 0; i < backup.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    if (await password.compare(trimmed, backup[i])) {
      const remaining = backup.slice(0, i).concat(backup.slice(i + 1));
      await twoFactorRepo.replaceBackupCodes(userId, remaining);
      return true;
    }
  }
  return false;
}

export async function verifyChallenge({ token, code }) {
  const challenge = await consumeChallenge(token);
  const ok = await verifyTotpCode(challenge.user_id, code);
  if (!ok) throw new UnauthorizedError('Invalid 2FA code');
  return { userId: challenge.user_id };
}
