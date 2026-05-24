process.env.NODE_ENV = 'test';
process.env.PORT = '3010';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.LOG_LEVEL = 'error';
process.env.CORS_ORIGIN = 'http://localhost:5173';

// Some libs (otplib via @noble) expect the WebCrypto API on globalThis.crypto.
// In Jest's node testEnvironment, globalThis.crypto exists but
// `crypto.getRandomValues` isn't wired up; polyfill from node:crypto.
import { webcrypto } from 'node:crypto';
if (!globalThis.crypto || !globalThis.crypto.getRandomValues) {
  globalThis.crypto = webcrypto;
}
