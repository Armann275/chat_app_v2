export default class AddGroupAdmin1714435370000 {
  name = 'AddGroupAdmin1714435370000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "chat_members" DROP CONSTRAINT IF EXISTS "chk_chat_members_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_members"
        ADD CONSTRAINT "chk_chat_members_role"
        CHECK ("role" IN ('member', 'moderator', 'admin'))
    `);

    await queryRunner.query(`
      ALTER TABLE "chats" ADD COLUMN IF NOT EXISTS "description" varchar(1000)
    `);
    await queryRunner.query(`
      ALTER TABLE "chats"
        ADD COLUMN IF NOT EXISTS "join_mode" varchar(16) NOT NULL DEFAULT 'invite_only'
    `);
    await queryRunner.query(`
      ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chk_chats_join_mode"
    `);
    await queryRunner.query(`
      ALTER TABLE "chats"
        ADD CONSTRAINT "chk_chats_join_mode"
        CHECK ("join_mode" IN ('open', 'request', 'invite_only', 'closed'))
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chk_chats_join_mode"
    `);
    await queryRunner.query(`
      ALTER TABLE "chats" DROP COLUMN IF EXISTS "join_mode"
    `);
    await queryRunner.query(`
      ALTER TABLE "chats" DROP COLUMN IF EXISTS "description"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_members" DROP CONSTRAINT IF EXISTS "chk_chat_members_role"
    `);
    await queryRunner.query(`
      ALTER TABLE "chat_members"
        ADD CONSTRAINT "chk_chat_members_role"
        CHECK ("role" IN ('member', 'admin'))
    `);
  }
}
