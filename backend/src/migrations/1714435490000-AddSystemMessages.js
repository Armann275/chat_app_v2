export default class AddSystemMessages1714435490000 {
  name = 'AddSystemMessages1714435490000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "messages"
        ADD COLUMN "type" varchar(16) NOT NULL DEFAULT 'user',
        ADD COLUMN "system_event" jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE "messages"
        ADD CONSTRAINT "chk_messages_type" CHECK ("type" IN ('user', 'system'))
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "chk_messages_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP COLUMN IF EXISTS "system_event", DROP COLUMN IF EXISTS "type"`,
    );
  }
}
