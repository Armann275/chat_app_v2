import { body } from 'express-validator';

export const updatePrivacyValidator = [
  body('whoCanMessage')
    .isIn(['everyone', 'friends', 'nobody'])
    .withMessage('whoCanMessage must be one of: everyone, friends, nobody'),
];
