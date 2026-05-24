export const ROLES = Object.freeze({
  MEMBER: 'member',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
});

const RANK = { member: 0, moderator: 1, admin: 2 };

export function rankOf(role) {
  return RANK[role] ?? -1;
}

export function isAtLeast(role, minimum) {
  return rankOf(role) >= rankOf(minimum);
}

export function canEditChat(role) {
  return isAtLeast(role, ROLES.ADMIN);
}

export function canManageMembers(role) {
  return isAtLeast(role, ROLES.ADMIN);
}

export function canManageRoles(role) {
  return isAtLeast(role, ROLES.ADMIN);
}

export function canPin(role) {
  return isAtLeast(role, ROLES.MODERATOR);
}

export function canPost(chat, role) {
  if (chat.type === 'channel') return isAtLeast(role, ROLES.MODERATOR);
  return true;
}

export function canManageInvites(role) {
  return isAtLeast(role, ROLES.ADMIN);
}
