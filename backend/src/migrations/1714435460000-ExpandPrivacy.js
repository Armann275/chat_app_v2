export default class ExpandPrivacy1714435460000 {
  name = 'ExpandPrivacy1714435460000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "user_privacy_settings"
        ADD COLUMN IF NOT EXISTS "last_seen_visibility" varchar(16) NOT NULL DEFAULT 'everyone',
        ADD COLUMN IF NOT EXISTS "profile_photo_visibility" varchar(16) NOT NULL DEFAULT 'everyone'
    `);
    await queryRunner.query(`
      ALTER TABLE "user_privacy_settings"
        ADD CONSTRAINT "chk_last_seen_visibility"
          CHECK ("last_seen_visibility" IN ('everyone', 'friends', 'nobody'))
    `);
    await queryRunner.query(`
      ALTER TABLE "user_privacy_settings"
        ADD CONSTRAINT "chk_profile_photo_visibility"
          CHECK ("profile_photo_visibility" IN ('everyone', 'friends', 'nobody'))
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "user_privacy_settings"
        DROP CONSTRAINT IF EXISTS "chk_profile_photo_visibility",
        DROP CONSTRAINT IF EXISTS "chk_last_seen_visibility",
        DROP COLUMN IF EXISTS "profile_photo_visibility",
        DROP COLUMN IF EXISTS "last_seen_visibility"
    `);
  }
}
