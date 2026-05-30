import { EntitySchema } from 'typeorm';

export const UserPrivacySettings = new EntitySchema({
  name: 'UserPrivacySettings',
  tableName: 'user_privacy_settings',
  columns: {
    user_id: { type: 'uuid', primary: true },
    who_can_message: { type: 'varchar', length: 16, default: 'everyone' },
    last_seen_visibility: { type: 'varchar', length: 16, default: 'everyone' },
    profile_photo_visibility: { type: 'varchar', length: 16, default: 'everyone' },
    updated_at: { type: 'timestamptz', updateDate: true },
  },
});

export default UserPrivacySettings;
