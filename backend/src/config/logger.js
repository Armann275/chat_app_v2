import winston from 'winston';
import { env } from './env.js';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

const devFormat = printf(({ level, message, timestamp: ts, correlationId, stack, ...meta }) => {
  const cid = correlationId ? ` [${correlationId}]` : '';
  const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const body = stack || message;
  return `${ts} ${level}${cid}: ${body}${rest}`;
});

export const logger = winston.createLogger({
  level: env.logLevel,
  levels: winston.config.npm.levels,
  format: combine(
    errors({ stack: true }),
    timestamp(),
    env.isProd ? json() : combine(colorize(), devFormat),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

export const httpLogStream = {
  write: (line) => logger.http(line.trim()),
};
