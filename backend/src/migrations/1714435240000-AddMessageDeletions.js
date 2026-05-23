export default class AddMessageDeletions1714435240000 {
  name = 'AddMessageDeletions1714435240000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "message_deletions" (
        "message_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "deleted_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_message_deletions" PRIMARY KEY ("message_id", "user_id"),
        CONSTRAINT "fk_md_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_md_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_message_deletions_user" ON "message_deletions" ("user_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "message_deletions"`);
  }
}
