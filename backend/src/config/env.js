import dotenv from 'dotenv';

dotenv.config();

const REQUIRED = [
  'NODE_ENV',
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'LOG_LEVEL',
  'CORS_ORIGIN',
];

const missing = REQUIRED.filter((k) => !process.env[k] || process.env[k].trim() === '');
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

export const env = {
  nodeEnv: process.env.NODE_ENV,
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT),

  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  },

  smtp: {
    host: process.env.SMTP_HOST || null,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER || null,
    pass: process.env.SMTP_PASS || null,
    from: process.env.SMTP_FROM || null,
  },

  // Brevo transactional email over HTTPS (works where SMTP ports are blocked,
  // e.g. Render free tier). Preferred over SMTP when an API key is present.
  brevo: {
    apiKey: process.env.BREVO_API_KEY || null,
    senderEmail: process.env.BREVO_SENDER_EMAIL || process.env.SMTP_FROM || null,
    senderName: process.env.BREVO_SENDER_NAME || 'Chat App',
  },

  // Cloudinary for media storage. When configured, uploads go to Cloudinary's
  // CDN (persistent, absolute HTTPS URLs) instead of the local ./uploads disk,
  // which is ephemeral on hosts like Render free tier.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    apiKey: process.env.CLOUDINARY_API_KEY || null,
    apiSecret: process.env.CLOUDINARY_API_SECRET || null,
  },

  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || null,
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  },

  ai: {
    historyMaxMessages: process.env.AI_HISTORY_MAX_MESSAGES
      ? Number(process.env.AI_HISTORY_MAX_MESSAGES)
      : 20,
  },

  logLevel: process.env.LOG_LEVEL,
  corsOrigin: process.env.CORS_ORIGIN,
};
