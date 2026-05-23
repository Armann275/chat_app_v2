import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

let transporterPromise = null;
const ETHEREAL_TIMEOUT_MS = 5_000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function buildTransporter() {
  if (env.smtp.host && env.smtp.user && env.smtp.pass) {
    return nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    });
  }

  const account = await withTimeout(
    nodemailer.createTestAccount(),
    ETHEREAL_TIMEOUT_MS,
    'Ethereal createTestAccount',
  );
  logger.warn('SMTP not configured; using Ethereal test account', {
    etherealUser: account.user,
  });
  return nodemailer.createTransport({
    host: account.smtp.host,
    port: account.smtp.port,
    secure: account.smtp.secure,
    auth: { user: account.user, pass: account.pass },
  });
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = buildTransporter().catch((err) => {
      transporterPromise = null;
      throw err;
    });
  }
  return transporterPromise;
}

export async function sendVerificationCode(to, code) {
  const transporter = await getTransporter();
  const from = env.smtp.from || 'no-reply@chat-app.local';
  const info = await transporter.sendMail({
    from,
    to,
    subject: 'Your verification code',
    text: `Your verification code is ${code}. It expires in 15 minutes.`,
    html: `
      <p>Your verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>It expires in 15 minutes. If you did not request this, ignore this email.</p>
    `,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info('Verification email sent (Ethereal preview)', { previewUrl });
  } else {
    logger.info('Verification email sent', { messageId: info.messageId });
  }
  return info;
}
