import { EntitySchema } from 'typeorm';

export const MessageReceipt = new EntitySchema({
  name: 'MessageReceipt',
  tableName: 'message_receipts',
  columns: {
    message_id: { type: 'uuid', primary: true },
    user_id: { type: 'uuid', primary: true },
    delivered_at: { type: 'timestamptz', nullable: true },
    seen_at: { type: 'timestamptz', nullable: true },
  },
  indices: [
    { name: 'idx_receipts_user', columns: ['user_id'] },
  ],
});
