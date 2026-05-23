import { EntitySchema } from 'typeorm';

export const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    username: { type: 'varchar', length: 32, unique: true },
    email: { type: 'varchar', length: 255, unique: true },
    password_hash: { type: 'varchar', length: 255 },
    avatar_url: { type: 'varchar', length: 1024, nullable: true },
    avatar_glb_url: { type: 'varchar', length: 1024, nullable: true },
    custom_photo_url: { type: 'varchar', length: 1024, nullable: true },
    avatar_source: { type: 'varchar', length: 16, default: 'initials' },
    bio: { type: 'varchar', length: 500, nullable: true },
    last_seen_at: { type: 'timestamptz', nullable: true },
    email_verified_at: { type: 'timestamptz', nullable: true },
    created_at: { type: 'timestamptz', createDate: true },
    updated_at: { type: 'timestamptz', updateDate: true },
  },
  indices: [
    { name: 'idx_users_username', columns: ['username'], unique: true },
    { name: 'idx_users_email', columns: ['email'], unique: true },
  ],
});

export default User;
