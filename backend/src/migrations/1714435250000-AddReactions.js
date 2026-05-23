export default class AddReactions1714435250000 {
  name = 'AddReactions1714435250000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "message_reactions" (
        "message_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "emoji" varchar(32) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_message_reactions" PRIMARY KEY ("message_id", "user_id", "emoji"),
        CONSTRAINT "fk_reactions_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_reactions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_reactions_message" ON "message_reactions" ("message_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "message_reactions"`);
  }
}
