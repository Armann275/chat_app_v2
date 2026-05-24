import * as reportRepo from '../repositories/report.repository.js';
import * as userRepo from '../repositories/user.repository.js';
import { logger } from '../config/logger.js';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
} from '../errors/errors.js';

const ALLOWED_REASONS = new Set([
  'spam', 'harassment', 'hate_speech', 'impersonation', 'self_harm', 'other',
]);
const RATE_LIMIT_HOURS = 24;

export async function report(currentUserId, targetUserId, { reason, details } = {}) {
  if (currentUserId === targetUserId) {
    throw new ValidationError('Cannot report yourself');
  }
  if (!ALLOWED_REASONS.has(reason)) {
    throw new ValidationError(
      `reason must be one of: ${Array.from(ALLOWED_REASONS).join(', ')}`,
    );
  }
  const target = await userRepo.findById(targetUserId);
  if (!target) throw new NotFoundError('User not found');

  const sinceIso = new Date(Date.now() - RATE_LIMIT_HOURS * 3600 * 1000).toISOString();
  const recent = await reportRepo.findRecentForPair(currentUserId, targetUserId, sinceIso);
  if (recent) {
    throw new ConflictError(
      'You have already reported this user recently',
    );
  }

  const trimmedDetails =
    typeof details === 'string' && details.trim().length > 0
      ? details.trim().slice(0, 1000)
      : null;

  const row = await reportRepo.create({
    reporterId: currentUserId,
    reportedId: targetUserId,
    reason,
    details: trimmedDetails,
  });

  logger.warn('user_report_created', {
    reportId: row.id,
    reportedId: targetUserId,
    reason,
  });

  return {
    id: row.id,
    reason: row.reason,
    createdAt: row.created_at,
  };
}
