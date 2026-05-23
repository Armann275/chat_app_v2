import { EntitySchema } from 'typeorm';

export const FriendRequest = new EntitySchema({
  name: 'FriendRequest',
  tableName: 'friend_requests',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    from_user_id: { type: 'uuid' },
    to_user_id: { type: 'uuid' },
    status: { type: 'varchar', length: 16, default: 'pending' },
    created_at: { type: 'timestamptz', createDate: true },
    responded_at: { type: 'timestamptz', nullable: true },
  },
  indices: [
    { name: 'idx_friend_requests_to', columns: ['to_user_id'] },
    { name: 'idx_friend_requests_from', columns: ['from_user_id'] },
  ],
});

export default FriendRequest;
