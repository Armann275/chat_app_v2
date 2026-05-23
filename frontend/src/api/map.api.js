import { apiClient } from './client';

export async function updateMyLocation({ latitude, longitude }) {
  const { data } = await apiClient.put('/me/location', { latitude, longitude });
  return data.data.location;
}

export async function clearMyLocation() {
  const { data } = await apiClient.delete('/me/location');
  return data.data;
}

export async function getMyPrivacy() {
  const { data } = await apiClient.get('/me/location/privacy');
  return data.data.privacy;
}

export async function setMyPrivacy(payload) {
  const { data } = await apiClient.put('/me/location/privacy', payload);
  return data.data.privacy;
}

export async function getFriendsOnMap() {
  const { data } = await apiClient.get('/map/friends');
  return data.data.friends;
}
