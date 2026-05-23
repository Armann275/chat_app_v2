export default class AddAvatarColumns1714435350000 {
  name = 'AddAvatarColumns1714435350000';

  async up(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "avatar_glb_url" varchar(1024)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "custom_photo_url" varchar(1024)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "avatar_source" varchar(16) NOT NULL DEFAULT 'initials'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "chk_users_avatar_source"
         CHECK ("avatar_source" IN ('initials', 'generated', 'custom'))`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_avatar_source"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_source"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "custom_photo_url"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_glb_url"`);
  }
}
