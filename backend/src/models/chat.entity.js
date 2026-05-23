import { EntitySchema } from 'typeorm';

export const Chat = new EntitySchema({
  name: 'Chat',
  tableName: 'chats',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    type: { type: 'varchar', length: 16 },
    name: { type: 'varchar', length: 100, nullable: true },
    created_by: { type: 'uuid' },
    status: { type: 'varchar', length: 16, default: 'active' },
    requested_by_user_id: { type: 'uuid', nullable: true },
    request_target_user_id: { type: 'uuid', nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'idx_chats_created_by', columns: ['created_by'] },
  ],
});
