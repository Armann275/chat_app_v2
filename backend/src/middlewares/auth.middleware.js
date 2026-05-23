import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../errors/errors.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or malformed Authorization header');
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) throw new UnauthorizedError('Empty bearer token');

  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub };
  next();
}
