import { verifyAccessToken } from '../utils/jwt.js';

export function socketAuth(socket, next) {
  const token = socket.handshake?.auth?.token;
  if (!token) return next(new Error('UNAUTHORIZED'));
  try {
    const payload = verifyAccessToken(token);
    socket.user = { id: payload.sub };
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}
