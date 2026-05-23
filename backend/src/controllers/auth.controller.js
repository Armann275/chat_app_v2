import jwt from 'jsonwebtoken';
import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';

const REFRESH_COOKIE = 'refreshToken';

function setRefreshCookie(res, refreshToken) {
  const decoded = jwt.decode(refreshToken);
  const maxAgeMs = decoded.exp * 1000 - Date.now();
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: env.isProd ? 'none' : 'lax',
    path: '/',
  });
}

export async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      requiresEmailVerification: true,
    },
  });
}

export async function verifyEmail(req, res) {
  const { user, accessToken, refreshToken } = await authService.verifyEmail(req.body);
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
}

export async function resendCode(req, res) {
  const result = await authService.resendVerificationCode(req.body);
  res.json({ success: true, data: result });
}

export async function login(req, res) {
  const { user, accessToken, refreshToken } = await authService.login(req.body);
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
}

export async function refresh(req, res) {
  const incoming = req.cookies?.[REFRESH_COOKIE];
  const { user, accessToken, refreshToken } = await authService.refresh(incoming);
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { user, accessToken } });
}

export async function logout(req, res) {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  clearRefreshCookie(res);
  res.json({ success: true, data: { loggedOut: true } });
}

export async function me(req, res) {
  const user = await authService.me(req.user.id);
  res.json({ success: true, data: { user } });
}
