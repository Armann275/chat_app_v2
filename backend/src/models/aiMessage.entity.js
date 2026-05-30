import { EntitySchema } from 'typeorm';

export const AiMessage = new EntitySchema({
  name: 'AiMessage',
  tableName: 'ai_messages',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    session_id: { type: 'uuid' },
    role: { type: 'varchar', length: 16 },
    content: { type: 'text' },
    created_at: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'idx_ai_messages_session', columns: ['session_id', 'created_at'] },
  ],
});
