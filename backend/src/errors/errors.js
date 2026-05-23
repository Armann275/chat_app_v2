export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR' } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR' });
    if (details) this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, { statusCode: 403, code: 'FORBIDDEN' });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, { statusCode: 404, code: 'NOT_FOUND' });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, { statusCode: 409, code: 'CONFLICT' });
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, { statusCode: 500, code: 'INTERNAL_ERROR' });
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(userId, message = 'Email is not verified') {
    super(message, { statusCode: 403, code: 'EMAIL_NOT_VERIFIED' });
    this.details = { userId, requiresEmailVerification: true };
  }
}

export class InvalidVerificationCodeError extends AppError {
  constructor(message = 'Invalid verification code') {
    super(message, { statusCode: 400, code: 'INVALID_VERIFICATION_CODE' });
  }
}

export class VerificationCodeExpiredError extends AppError {
  constructor(message = 'Verification code has expired') {
    super(message, { statusCode: 400, code: 'VERIFICATION_CODE_EXPIRED' });
  }
}

export class TooManyVerificationAttemptsError extends AppError {
  constructor(message = 'Too many verification attempts. Request a new code.') {
    super(message, { statusCode: 429, code: 'TOO_MANY_VERIFICATION_ATTEMPTS' });
  }
}

export class TooSoonError extends AppError {
  constructor(message = 'Please wait before trying again') {
    super(message, { statusCode: 429, code: 'TOO_SOON' });
  }
}
