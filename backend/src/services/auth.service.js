import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import * as userRepo from '../repositories/user.repository.js';
import * as refreshRepo from '../repositories/refreshToken.repository.js';
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
} from '../errors/errors.js';

async function issueTokens(user) {
  const accessToken = signAccessToken({ sub: user.id });
  const refreshToken = signRefreshToken({ sub: user.id, jti: randomUUID() });

  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  await refreshRepo.create({
    userId: user.id,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export async function register({ username, email, password: plain }) {
  const [byEmail, byUsername] = await Promise.all([
    userRepo.findByEmail(email),
    userRepo.findByUsername(username),
  ]);
  if (byEmail) throw new ConflictError('Email already in use');
  if (byUsername) throw new ConflictError('Username already in use');

  const passwordHash = await password.hash(plain);
  const user = await userRepo.createUser({ username, email, passwordHash });

  const tokens = await issueTokens(user);
  return { user: publicUser(user), ...tokens };
}

export async function login({ email, password: plain }) {
  const row = await userRepo.findByEmail(email);
  if (!row) throw new UnauthorizedError('Invalid credentials');

  const ok = await password.compare(plain, row.password_hash);
  if (!ok) throw new UnauthorizedError('Invalid credentials');

  const tokens = await issueTokens(row);
  return { user: publicUser(row), ...tokens };
}

export async function refresh(rawRefreshToken) {
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

  const tokens = await issueTokens(user);
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
