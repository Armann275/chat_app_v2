import { EntitySchema } from 'typeorm';

export const ChatJoinRequest = new EntitySchema({
  name: 'ChatJoinRequest',
  tableName: 'chat_join_requests',
  columns: {
    chat_id: { type: 'uuid', primary: true },
    user_id: { type: 'uuid', primary: true },
    status: { type: 'varchar', length: 16, default: 'pending' },
    message: { type: 'varchar', length: 500, nullable: true },
    requested_at: { type: 'timestamptz', createDate: true },
    decided_by: { type: 'uuid', nullable: true },
    decided_at: { type: 'timestamptz', nullable: true },
  },
  indices: [
    { name: 'idx_join_requests_chat_status', columns: ['chat_id', 'status'] },
  ],
});
