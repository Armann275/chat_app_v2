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

// Send over Brevo's HTTPS API. Used in environments where outbound SMTP ports
// are blocked (e.g. Render free tier).
async function sendViaBrevo({ to, subject, text, html, label }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.brevo.apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: env.brevo.senderName, email: env.brevo.senderEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo send failed (${res.status}): ${detail}`);
  }
  const data = await res.json().catch(() => ({}));
  logger.info(`${label} sent (Brevo)`, { messageId: data.messageId });
  return data;
}

// Deliver a transactional email via Brevo when configured, otherwise SMTP
// (Ethereal in dev). `label` is used only for logging.
async function deliver({ to, subject, text, html, label }) {
  if (env.brevo.apiKey && env.brevo.senderEmail) {
    return sendViaBrevo({ to, subject, text, html, label });
  }

  const transporter = await getTransporter();
  const from = env.smtp.from || 'no-reply@chat-app.local';
  const info = await transporter.sendMail({ from, to, subject, text, html });

  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    logger.info(`${label} sent (Ethereal preview)`, { previewUrl });
  } else {
    logger.info(`${label} sent`, { messageId: info.messageId });
  }
  return info;
}

export async function sendVerificationCode(to, code) {
  return deliver({
    to,
    label: 'Verification email',
    subject: 'Your verification code',
    text: `Your verification code is ${code}. It expires in 15 minutes.`,
    html: `
      <p>Your verification code is:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>It expires in 15 minutes. If you did not request this, ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetCode(to, code) {
  return deliver({
    to,
    label: 'Password reset email',
    subject: 'Your password reset code',
    text: `Your password reset code is ${code}. It expires in 15 minutes. If you did not request this, ignore this email.`,
    html: `
      <p>Use this code to reset your password:</p>
      <p style="font-size:24px;font-weight:bold;letter-spacing:4px;">${code}</p>
      <p>It expires in 15 minutes. If you did not request a password reset, you can safely ignore this email.</p>
    `,
  });
}
