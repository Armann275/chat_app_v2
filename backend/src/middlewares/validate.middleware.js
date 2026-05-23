import { validationResult } from 'express-validator';
import { ValidationError } from '../errors/errors.js';

export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array({ onlyFirstError: true }).map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  next(new ValidationError('Validation failed', details));
}
