export default class AddRepliesPinsStars1714435260000 {
  name = 'AddRepliesPinsStars1714435260000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "messages" ADD COLUMN "reply_to_message_id" uuid
        REFERENCES "messages"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_messages_reply_to" ON "messages" ("reply_to_message_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "chat_pinned_messages" (
        "chat_id" uuid NOT NULL,
        "message_id" uuid NOT NULL,
        "pinned_by" uuid NOT NULL,
        "pinned_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_chat_pinned" PRIMARY KEY ("chat_id", "message_id"),
        CONSTRAINT "fk_pin_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_pin_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_pin_user" FOREIGN KEY ("pinned_by") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_starred_messages" (
        "user_id" uuid NOT NULL,
        "message_id" uuid NOT NULL,
        "starred_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_starred" PRIMARY KEY ("user_id", "message_id"),
        CONSTRAINT "fk_star_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_star_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_starred_user_starred_at" ON "user_starred_messages" ("user_id", "starred_at" DESC)`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_starred_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_pinned_messages"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "reply_to_message_id"`);
  }
}
