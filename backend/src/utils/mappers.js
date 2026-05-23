export function displayAvatarUrlForRow(row) {
  if (!row) return null;
  return row.custom_photo_url ?? row.avatar_url ?? null;
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    avatarUrl: row.avatar_url ?? null,
    customPhotoUrl: row.custom_photo_url ?? null,
    avatarGlbUrl: row.avatar_glb_url ?? null,
    avatarSource: row.avatar_source ?? 'initials',
    displayAvatarUrl: displayAvatarUrlForRow(row),
    bio: row.bio ?? null,
    lastSeenAt: row.last_seen_at ?? null,
    emailVerifiedAt: row.email_verified_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
