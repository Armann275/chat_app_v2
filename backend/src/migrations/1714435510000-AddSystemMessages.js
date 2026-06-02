export default class AddSystemMessages1714435510000 {
  name = 'AddSystemMessages1714435510000';

  async up(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN "type" varchar(16) NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "chk_messages_type" CHECK ("type" IN ('user', 'system'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD COLUMN "system_event" jsonb`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "chk_messages_type"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "system_event"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN IF EXISTS "type"`);
  }
}
