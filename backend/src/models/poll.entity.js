import { EntitySchema } from 'typeorm';

export const Poll = new EntitySchema({
  name: 'Poll',
  tableName: 'polls',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    chat_id: { type: 'uuid' },
    question: { type: 'varchar', length: 500 },
    multi_choice: { type: 'boolean', default: false },
    closes_at: { type: 'timestamptz', nullable: true },
    closed_at: { type: 'timestamptz', nullable: true },
    created_by: { type: 'uuid' },
    created_at: { type: 'timestamptz', createDate: true },
  },
});

export const PollOption = new EntitySchema({
  name: 'PollOption',
  tableName: 'poll_options',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    poll_id: { type: 'uuid' },
    text: { type: 'varchar', length: 200 },
    order_index: { type: 'int' },
  },
});

export const PollVote = new EntitySchema({
  name: 'PollVote',
  tableName: 'poll_votes',
  columns: {
    poll_id: { type: 'uuid', primary: true },
    option_id: { type: 'uuid', primary: true },
    user_id: { type: 'uuid', primary: true },
    voted_at: { type: 'timestamptz', createDate: true },
  },
});
