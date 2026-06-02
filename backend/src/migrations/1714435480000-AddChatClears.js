export default class AddChatClears1714435480000 {
  name = 'AddChatClears1714435480000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "chat_clears" (
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "cleared_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_chat_clears" PRIMARY KEY ("chat_id", "user_id"),
        CONSTRAINT "fk_cc_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cc_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_chat_clears_user" ON "chat_clears" ("user_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_clears"`);
  }
}
