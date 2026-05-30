export default class AddSessionMeta1714435420000 {
  name = 'AddSessionMeta1714435420000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
        ADD COLUMN IF NOT EXISTS "user_agent" varchar(500),
        ADD COLUMN IF NOT EXISTS "ip" varchar(64),
        ADD COLUMN IF NOT EXISTS "last_used_at" timestamptz
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
        DROP COLUMN IF EXISTS "last_used_at",
        DROP COLUMN IF EXISTS "ip",
        DROP COLUMN IF EXISTS "user_agent"
    `);
  }
}
