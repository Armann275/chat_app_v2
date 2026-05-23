import { body } from 'express-validator';

export const updateLocationValidator = [
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
];

export const setPrivacyValidator = [
  body('mode').isIn(['nobody', 'friends', 'specific_friends']),
  body('visibleFriendIds')
    .optional({ nullable: true })
    .isArray()
    .withMessage('visibleFriendIds must be an array'),
  body('visibleFriendIds.*').optional().isUUID(),
];
