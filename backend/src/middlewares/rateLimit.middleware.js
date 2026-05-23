import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const handler = (_req, res) => {
  res.status(429).json({
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again later',
  });
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

export const messageSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.user?.id ?? ipKeyGenerator(req, res),
  handler,
});
