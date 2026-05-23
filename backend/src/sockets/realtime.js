let chatEmitter = null;
let userEmitter = null;

export function setRealtimeEmitter(fn) {
  chatEmitter = fn;
}

export function setUserEmitter(fn) {
  userEmitter = fn;
}

export function emitToChat(chatId, event, payload) {
  if (chatEmitter) chatEmitter(chatId, event, payload);
}

export function emitToUser(userId, event, payload) {
  if (userEmitter) userEmitter(userId, event, payload);
}
