import jwt from 'jsonwebtoken';
import { randomUUID, randomInt } from 'node:crypto';
import * as userRepo from '../repositories/user.repository.js';
import * as refreshRepo from '../repositories/refreshToken.repository.js';
import * as verificationRepo from '../repositories/emailVerification.repository.js';
import * as passwordResetRepo from '../repositories/passwordReset.repository.js';
import * as emailService from './email.service.js';
import * as locationService from './location.service.js';
import * as totpService from './totp.service.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashRefreshToken,
} from '../utils/jwt.js';
import * as password from '../utils/password.js';
import { publicUser } from '../utils/mappers.js';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
  EmailNotVerifiedError,
  InvalidVerificationCodeError,
  VerificationCodeExpiredError,
  TooManyVerificationAttemptsError,
  TooSoonError,
} from '../errors/errors.js';
import { logger } from '../config/logger.js';

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

function generateCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

async function issueTokens(user, { userAgent = null, ip = null } = {}) {
  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = signRefreshToken({ sub: user.id, jti: randomUUID() });

  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  await refreshRepo.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt,
    userAgent,
    ip,
  });

  return { accessToken, refreshToken };
}

async function createAndStoreCode(userId) {
  await verificationRepo.invalidateAllForUser(userId);
  const code = generateCode();
  const codeHash = await password.hash(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await verificationRepo.create({ userId, codeHash, expiresAt });
  return code;
}

function dispatchVerificationEmail(user, code) {
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
    logger.info(`[dev] Verification code for ${user.email}: ${code}`);
  }
  emailService.sendVerificationCode(user.email, code).catch((err) => {
    logger.warn('Verification email send failed (code still valid in DB)', {
      userId: user.id,
      email: user.email,
      message: err.message,
    });
  });
}

async function issueVerificationCode(user) {
  const code = await createAndStoreCode(user.id);
  dispatchVerificationEmail(user, code);
}

export async function register({ username, email, password: plain }) {
  const [byEmail, byUsername] = await Promise.all([
    userRepo.findByEmail(email),
    userRepo.findByUsername(username),
  ]);

  if (byEmail?.email_verified_at) {
    throw new ConflictError('Email already in use');
  }
  if (byUsername && byUsername.id !== byEmail?.id) {
    throw new ConflictError('Username already in use');
  }

  const passwordHash = await password.hash(plain);
  const user = byEmail
    ? await userRepo.replaceUnverifiedCredentials(byEmail.id, { username, passwordHash })
    : await userRepo.createUser({ username, email, passwordHash });

  await locationService.ensureDefaultPrivacy(user.id).catch((err) => {
    logger.warn('Could not seed default location privacy', {
      userId: user.id,
      message: err.message,
    });
  });

  await issueVerificationCode(user);

  return {
    user: publicUser(user),
    requiresEmailVerification: true,
  };
}

export async function verifyEmail({ userId, code }, meta = {}) {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  if (user.email_verified_at) {
    const tokens = await issueTokens(user, meta);
    return { user: publicUser(user), ...tokens };
  }

  const active = await verificationRepo.findActiveByUserId(userId);
  if (!active) throw new InvalidVerificationCodeError();

  if (new Date(active.expires_at).getTime() <= Date.now()) {
    await verificationRepo.markConsumed(active.id);
    throw new VerificationCodeExpiredError();
  }

  if (active.attempts >= MAX_ATTEMPTS) {
    throw new TooManyVerificationAttemptsError();
  }

  const ok = await password.compare(code, active.code_hash);
  if (!ok) {
    const attempts = await verificationRepo.incrementAttempts(active.id);
    if (attempts >= MAX_ATTEMPTS) {
      throw new TooManyVerificationAttemptsError();
    }
    throw new InvalidVerificationCodeError();
  }

  await verificationRepo.markConsumed(active.id);
  const updated = await userRepo.markEmailVerified(userId);
  const tokens = await issueTokens(updated, meta);
  return { user: publicUser(updated), ...tokens };
}

export async function resendVerificationCode({ userId }) {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  if (user.email_verified_at) {
    throw new ConflictError('Email already verified');
  }

  const active = await verificationRepo.findActiveByUserId(userId);
  if (active) {
    const since = Date.now() - new Date(active.created_at).getTime();
    if (since < RESEND_COOLDOWN_MS) {
      throw new TooSoonError(
        `Please wait ${Math.ceil((RESEND_COOLDOWN_MS - since) / 1000)}s before requesting a new code`,
      );
    }
  }

  await issueVerificationCode(user);
  return { sent: true };
}

async function createAndStoreResetCode(userId) {
  await passwordResetRepo.invalidateAllForUser(userId);
  const code = generateCode();
  const codeHash = await password.hash(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);
  await passwordResetRepo.create({ userId, codeHash, expiresAt });
  return code;
}

function dispatchPasswordResetEmail(user, code) {
  if (!process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
    logger.info(`[dev] Password reset code for ${user.email}: ${code}`);
  }
  emailService.sendPasswordResetCode(user.email, code).catch((err) => {
    logger.warn('Password reset email send failed (code still valid in DB)', {
      userId: user.id,
      email: user.email,
      message: err.message,
    });
  });
}

// Always resolves with { sent: true } regardless of whether the email exists,
// so the endpoint never reveals which addresses have accounts.
export async function forgotPassword({ email }) {
  const user = await userRepo.findByEmail(email);
  if (!user || !user.email_verified_at) {
    return { sent: true };
  }

  const active = await passwordResetRepo.findActiveByUserId(user.id);
  if (active) {
    const since = Date.now() - new Date(active.created_at).getTime();
    if (since < RESEND_COOLDOWN_MS) {
      // Within cooldown: silently succeed (don't leak existence or spam).
      return { sent: true };
    }
  }

  const code = await createAndStoreResetCode(user.id);
  dispatchPasswordResetEmail(user, code);
  return { sent: true };
}

export async function resetPassword({ email, code, newPassword }) {
  const user = await userRepo.findByEmail(email);
  if (!user) throw new InvalidVerificationCodeError();

  const active = await passwordResetRepo.findActiveByUserId(user.id);
  if (!active) throw new InvalidVerificationCodeError();

  if (new Date(active.expires_at).getTime() <= Date.now()) {
    await passwordResetRepo.markConsumed(active.id);
    throw new VerificationCodeExpiredError();
  }

  if (active.attempts >= MAX_ATTEMPTS) {
    throw new TooManyVerificationAttemptsError();
  }

  const ok = await password.compare(code, active.code_hash);
  if (!ok) {
    const attempts = await passwordResetRepo.incrementAttempts(active.id);
    if (attempts >= MAX_ATTEMPTS) {
      throw new TooManyVerificationAttemptsError();
    }
    throw new InvalidVerificationCodeError();
  }

  await passwordResetRepo.markConsumed(active.id);
  const passwordHash = await password.hash(newPassword);
  await userRepo.updatePassword(user.id, passwordHash);
  // Revoke all existing sessions so a leaked old password/token can't be reused.
  await refreshRepo.revokeAllForUser(user.id);

  return { reset: true };
}

export async function login({ email, password: plain }, meta = {}) {
  const row = await userRepo.findByEmail(email);
  if (!row) throw new UnauthorizedError('Invalid credentials');

  const ok = await password.compare(plain, row.password_hash);
  if (!ok) throw new UnauthorizedError('Invalid credentials');

  if (!row.email_verified_at) {
    await issueVerificationCode(row).catch((err) => {
      logger.warn('Could not re-send verification code on login', {
        userId: row.id,
        message: err.message,
      });
    });
    throw new EmailNotVerifiedError(row.id);
  }

  if (await totpService.isEnabled(row.id)) {
    const { token, expiresAt } = await totpService.createChallenge(row.id);
    return {
      requires2fa: true,
      twoFactorToken: token,
      expiresAt,
    };
  }

  const tokens = await issueTokens(row, meta);
  return { user: publicUser(row), ...tokens };
}

export async function verify2fa({ token, code }, meta = {}) {
  const { userId } = await totpService.verifyChallenge({ token, code });
  const user = await userRepo.findById(userId);
  if (!user) throw new UnauthorizedError('User no longer exists');
  const tokens = await issueTokens(user, meta);
  return { user: publicUser(user), ...tokens };
}

export async function refresh(rawRefreshToken, meta = {}) {
  if (!rawRefreshToken) throw new UnauthorizedError('Missing refresh token');

  const payload = verifyRefreshToken(rawRefreshToken);

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const stored = await refreshRepo.findByHash(tokenHash);
  if (!stored) throw new UnauthorizedError('Refresh token not recognized');
  if (stored.revoked_at) throw new UnauthorizedError('Refresh token revoked');
  if (new Date(stored.expires_at).getTime() <= Date.now()) {
    throw new UnauthorizedError('Refresh token expired');
  }
  if (stored.user_id !== payload.sub) {
    throw new UnauthorizedError('Refresh token does not match user');
  }

  await refreshRepo.revoke(stored.id);

  const user = await userRepo.findById(stored.user_id);
  if (!user) throw new UnauthorizedError('User no longer exists');

  const tokens = await issueTokens(user, meta);
  return { user: publicUser(user), ...tokens };
}

export async function logout(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const stored = await refreshRepo.findByHash(hashRefreshToken(rawRefreshToken));
  if (stored && !stored.revoked_at) {
    await refreshRepo.revoke(stored.id);
  }
}

export async function me(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError('User not found');
  return publicUser(user);
}
