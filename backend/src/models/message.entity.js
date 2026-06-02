import { EntitySchema } from 'typeorm';

export const Message = new EntitySchema({
  name: 'Message',
  tableName: 'messages',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    chat_id: { type: 'uuid' },
    sender_id: { type: 'uuid' },
    content: { type: 'text' },
    type: { type: 'varchar', length: 16, default: 'user' },
    system_event: { type: 'jsonb', nullable: true },
    edited_at: { type: 'timestamptz', nullable: true },
    deleted_at: { type: 'timestamptz', nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
    updated_at: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'idx_messages_chat_created', columns: ['chat_id', 'created_at'] },
    { name: 'idx_messages_sender', columns: ['sender_id'] },
  ],
});
