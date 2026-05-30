export default class AddChannels1714435390000 {
  name = 'AddChannels1714435390000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chk_chats_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "chats"
        ADD CONSTRAINT "chk_chats_type"
        CHECK ("type" IN ('direct', 'group', 'channel'))
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chk_chats_type"
    `);
    await queryRunner.query(`
      ALTER TABLE "chats"
        ADD CONSTRAINT "chk_chats_type"
        CHECK ("type" IN ('direct', 'group'))
    `);
  }
}
