import http from 'node:http';

import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { dataSource } from './config/database.js';
import { app } from './app.js';
import { initSockets } from './sockets/index.js';

const httpServer = http.createServer(app);

try {
  await dataSource.initialize();
  logger.info('Database connection established');
} catch (err) {
  logger.error('Failed to initialize database', { stack: err.stack });
  process.exit(1);
}

export const io = initSockets(httpServer, { corsOrigin: env.corsOrigin });

httpServer.listen(env.port, () => {
  logger.info(`Server listening on port ${env.port} (env=${env.nodeEnv})`);
});

function shutdown(signal) {
  logger.info(`Received ${signal}, shutting down`);
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: reason instanceof Error ? reason.stack : reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { stack: err.stack });
  shutdown('uncaughtException');
});
