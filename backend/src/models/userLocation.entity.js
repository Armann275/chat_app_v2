import { EntitySchema } from 'typeorm';

export const UserLocation = new EntitySchema({
  name: 'UserLocation',
  tableName: 'user_locations',
  columns: {
    user_id: { type: 'uuid', primary: true },
    latitude: { type: 'double precision' },
    longitude: { type: 'double precision' },
    updated_at: { type: 'timestamptz', updateDate: true },
  },
});

export const UserLocationPrivacy = new EntitySchema({
  name: 'UserLocationPrivacy',
  tableName: 'user_location_privacy',
  columns: {
    user_id: { type: 'uuid', primary: true },
    mode: { type: 'varchar', length: 20, default: 'nobody' },
    updated_at: { type: 'timestamptz', updateDate: true },
  },
});

export const UserLocationVisibleTo = new EntitySchema({
  name: 'UserLocationVisibleTo',
  tableName: 'user_location_visible_to',
  columns: {
    user_id: { type: 'uuid', primary: true },
    friend_user_id: { type: 'uuid', primary: true },
    created_at: { type: 'timestamptz', createDate: true },
  },
});

export default UserLocation;
