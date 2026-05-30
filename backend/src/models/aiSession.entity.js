import { EntitySchema } from 'typeorm';

export const AiSession = new EntitySchema({
  name: 'AiSession',
  tableName: 'ai_sessions',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    user_id: { type: 'uuid' },
    title: { type: 'varchar', length: 200, nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
    updated_at: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'idx_ai_sessions_user', columns: ['user_id', 'updated_at'] },
  ],
});
