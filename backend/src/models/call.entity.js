import { EntitySchema } from 'typeorm';

export const Call = new EntitySchema({
  name: 'Call',
  tableName: 'calls',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    chat_id: { type: 'uuid' },
    initiator_id: { type: 'uuid' },
    type: { type: 'varchar', length: 16 },
    status: { type: 'varchar', length: 16, default: 'ringing' },
    started_at: { type: 'timestamptz', createDate: true },
    ended_at: { type: 'timestamptz', nullable: true },
  },
});

export const CallParticipant = new EntitySchema({
  name: 'CallParticipant',
  tableName: 'call_participants',
  columns: {
    call_id: { type: 'uuid', primary: true },
    user_id: { type: 'uuid', primary: true },
    joined_at: { type: 'timestamptz', nullable: true },
    left_at: { type: 'timestamptz', nullable: true },
  },
});
