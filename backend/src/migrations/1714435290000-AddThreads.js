export default class AddThreads1714435290000 {
  name = 'AddThreads1714435290000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "messages" ADD COLUMN "thread_root_id" uuid
        REFERENCES "messages"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_messages_thread_root" ON "messages" ("thread_root_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "thread_root_id"`);
  }
}
