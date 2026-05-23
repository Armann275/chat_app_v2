import { apiClient } from './client';

export async function sendFriendRequest(toUserId) {
  const { data } = await apiClient.post('/friend-requests', { toUserId });
  return data.data.request;
}

export async function listIncomingFriendRequests() {
  const { data } = await apiClient.get('/friend-requests', {
    params: { direction: 'incoming' },
  });
  return data.data.requests;
}

export async function listOutgoingFriendRequests() {
  const { data } = await apiClient.get('/friend-requests', {
    params: { direction: 'outgoing' },
  });
  return data.data.requests;
}

export async function cancelFriendRequest(requestId) {
  const { data } = await apiClient.delete(`/friend-requests/${requestId}`);
  return data.data;
}

export async function acceptFriendRequest(requestId) {
  const { data } = await apiClient.post(`/friend-requests/${requestId}/accept`);
  return data.data;
}

export async function rejectFriendRequest(requestId) {
  const { data } = await apiClient.post(`/friend-requests/${requestId}/reject`);
  return data.data;
}

export async function listFriends() {
  const { data } = await apiClient.get('/friends');
  return data.data.friends;
}

export async function removeFriend(userId) {
  const { data } = await apiClient.delete(`/friends/${userId}`);
  return data.data;
}
