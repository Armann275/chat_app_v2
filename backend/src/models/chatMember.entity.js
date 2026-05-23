import { EntitySchema } from 'typeorm';

export const ChatMember = new EntitySchema({
  name: 'ChatMember',
  tableName: 'chat_members',
  columns: {
    chat_id: { type: 'uuid', primary: true },
    user_id: { type: 'uuid', primary: true },
    role: { type: 'varchar', length: 16 },
    joined_at: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'idx_chat_members_user_id', columns: ['user_id'] },
  ],
});
