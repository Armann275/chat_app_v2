export default class AddDisappearingMessages1714435440000 {
  name = 'AddDisappearingMessages1714435440000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "chats"
        ADD COLUMN IF NOT EXISTS "disappearing_seconds" int
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "chats" DROP COLUMN IF EXISTS "disappearing_seconds"
    `);
  }
}
