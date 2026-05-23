import { EntitySchema } from 'typeorm';

export const Friendship = new EntitySchema({
  name: 'Friendship',
  tableName: 'friendships',
  columns: {
    user_a_id: { type: 'uuid', primary: true },
    user_b_id: { type: 'uuid', primary: true },
    created_at: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'idx_friendships_user_b_id', columns: ['user_b_id'] },
  ],
});

export default Friendship;
