import { EntitySchema } from 'typeorm';

export const ChatInviteLink = new EntitySchema({
  name: 'ChatInviteLink',
  tableName: 'chat_invite_links',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    chat_id: { type: 'uuid' },
    code: { type: 'varchar', length: 32, unique: true },
    created_by: { type: 'uuid' },
    expires_at: { type: 'timestamptz', nullable: true },
    max_uses: { type: 'int', nullable: true },
    uses: { type: 'int', default: 0 },
    revoked_at: { type: 'timestamptz', nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'idx_invite_links_chat_id', columns: ['chat_id'] },
  ],
});
