import { apiClient } from './client';

export async function listForChat(chatId) {
  const { data } = await apiClient.get(`/chats/${chatId}/polls`);
  return data.data.polls;
}

export async function createPoll(chatId, { question, options, multiChoice = false, closesAt = null }) {
  const { data } = await apiClient.post(`/chats/${chatId}/polls`, {
    question, options, multiChoice, closesAt,
  });
  return data.data.poll;
}

export async function getPoll(pollId) {
  const { data } = await apiClient.get(`/polls/${pollId}`);
  return data.data.poll;
}

export async function vote(pollId, optionId) {
  const { data } = await apiClient.post(`/polls/${pollId}/options/${optionId}/vote`);
  return data.data.poll;
}

export async function unvote(pollId, optionId) {
  const { data } = await apiClient.delete(`/polls/${pollId}/options/${optionId}/vote`);
  return data.data.poll;
}

export async function closePoll(pollId) {
  const { data } = await apiClient.post(`/polls/${pollId}/close`);
  return data.data.poll;
}
