import { EntitySchema } from 'typeorm';

export const RefreshToken = new EntitySchema({
  name: 'RefreshToken',
  tableName: 'refresh_tokens',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    user_id: { type: 'uuid' },
    token_hash: { type: 'varchar', length: 255, unique: true },
    expires_at: { type: 'timestamptz' },
    revoked_at: { type: 'timestamptz', nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'idx_refresh_tokens_user_id', columns: ['user_id'] },
    { name: 'idx_refresh_tokens_token_hash', columns: ['token_hash'], unique: true },
  ],
});

export default RefreshToken;
