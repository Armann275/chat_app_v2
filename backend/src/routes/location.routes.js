import { Router } from 'express';
import * as locationCtrl from '../controllers/location.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  updateLocationValidator,
  setPrivacyValidator,
} from '../validators/location.validator.js';

export const locationRouter = Router();
locationRouter.use(requireAuth);

locationRouter.put('/', updateLocationValidator, validate, locationCtrl.updateMyLocation);
locationRouter.delete('/', locationCtrl.clearMyLocation);
locationRouter.get('/privacy', locationCtrl.getMyPrivacy);
locationRouter.put('/privacy', setPrivacyValidator, validate, locationCtrl.setMyPrivacy);

export const mapRouter = Router();
mapRouter.use(requireAuth);
mapRouter.get('/friends', locationCtrl.getFriendsOnMap);
