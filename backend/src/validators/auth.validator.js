import { body } from 'express-validator';

export const registerValidator = [
  body('username')
    .isString()
    .trim()
    .isLength({ min: 3, max: 32 })
    .withMessage('Username must be 3-32 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username may only contain letters, numbers, and underscore'),
  body('email')
    .isEmail()
    .withMessage('Must be a valid email')
    .normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be 8-128 characters'),
];

export const loginValidator = [
  body('email').isEmail().withMessage('Must be a valid email').normalizeEmail(),
  body('password').isString().notEmpty().withMessage('Password is required'),
];
