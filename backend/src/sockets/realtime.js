let chatEmitter = null;
let userEmitter = null;
let roomJoiner = null;

export function setRealtimeEmitter(fn) {
  chatEmitter = fn;
}

export function setUserEmitter(fn) {
  userEmitter = fn;
}

export function setRoomJoiner(fn) {
  roomJoiner = fn;
}

export function emitToChat(chatId, event, payload) {
  if (chatEmitter) chatEmitter(chatId, event, payload);
}

export function emitToUser(userId, event, payload) {
  if (userEmitter) userEmitter(userId, event, payload);
}

// Make all of a connected user's sockets join a chat's room, so they receive
// real-time events for a chat created/joined after their socket connected
// (otherwise rooms are only joined on connect and a refresh is required).
export function joinUserToChat(userId, chatId) {
  if (roomJoiner) roomJoiner(userId, chatId);
}
