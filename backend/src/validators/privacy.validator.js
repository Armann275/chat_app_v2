import { body } from 'express-validator';

const VISIBILITY = ['everyone', 'friends', 'nobody'];

export const updatePrivacyValidator = [
  body('whoCanMessage')
    .optional()
    .isIn(VISIBILITY)
    .withMessage('whoCanMessage must be one of: everyone, friends, nobody'),
  body('lastSeenVisibility')
    .optional()
    .isIn(VISIBILITY)
    .withMessage('lastSeenVisibility must be one of: everyone, friends, nobody'),
  body('profilePhotoVisibility')
    .optional()
    .isIn(VISIBILITY)
    .withMessage('profilePhotoVisibility must be one of: everyone, friends, nobody'),
];
