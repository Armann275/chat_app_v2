import { EntitySchema } from 'typeorm';

export const UserBlock = new EntitySchema({
  name: 'UserBlock',
  tableName: 'user_blocks',
  columns: {
    blocker_id: { type: 'uuid', primary: true },
    blocked_id: { type: 'uuid', primary: true },
    created_at: { type: 'timestamptz', createDate: true },
  },
});

export const UserReport = new EntitySchema({
  name: 'UserReport',
  tableName: 'user_reports',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    reporter_id: { type: 'uuid' },
    reported_id: { type: 'uuid' },
    reason: { type: 'varchar', length: 64 },
    details: { type: 'varchar', length: 1000, nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
    resolved_at: { type: 'timestamptz', nullable: true },
  },
});
