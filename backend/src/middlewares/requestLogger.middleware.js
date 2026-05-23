import { randomUUID } from 'node:crypto';
import morgan from 'morgan';
import { httpLogStream } from '../config/logger.js';

export function correlationId(req, _res, next) {
  req.id = req.headers['x-correlation-id'] || randomUUID();
  next();
}

morgan.token('id', (req) => req.id);

export const requestLogger = morgan(
  ':id :method :url :status :res[content-length] - :response-time ms',
  { stream: httpLogStream },
);
