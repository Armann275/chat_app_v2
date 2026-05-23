import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/errors.js';

export function signAccessToken(payload) {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessExpiresIn,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.jwt.accessSecret);
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, env.jwt.refreshSecret);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

export function hashRefreshToken(token) {
  return createHash('sha256').update(token).digest('hex');
}
