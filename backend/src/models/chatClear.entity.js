import { EntitySchema } from 'typeorm';

// Records that a user "deleted (cleared) a direct chat for me". Messages created
// on or before `cleared_at` are hidden from that user, and the chat disappears
// from their list until a newer message arrives.
export const ChatClear = new EntitySchema({
  name: 'ChatClear',
  tableName: 'chat_clears',
  columns: {
    chat_id: { type: 'uuid', primary: true },
    user_id: { type: 'uuid', primary: true },
    cleared_at: { type: 'timestamptz', default: () => 'now()' },
  },
});
