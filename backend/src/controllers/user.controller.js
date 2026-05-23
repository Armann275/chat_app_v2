import * as userService from '../services/user.service.js';

export async function getMe(req, res) {
  const user = await userService.getProfile(req.user.id);
  res.json({ success: true, data: { user } });
}

export async function updateMe(req, res) {
  const user = await userService.updateProfile(req.user.id, {
    avatarUrl: req.body.avatarUrl,
    bio: req.body.bio,
  });
  res.json({ success: true, data: { user } });
}

export async function searchUsers(req, res) {
  const users = await userService.searchUsers(req.query.q, {
    limit: req.query.limit ?? 20,
    offset: req.query.offset ?? 0,
  });
  res.json({ success: true, data: { users } });
}
