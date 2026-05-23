export default class AddMentionsForwardDrafts1714435270000 {
  name = 'AddMentionsForwardDrafts1714435270000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "messages"
        ADD COLUMN "forwarded_from_message_id" uuid
        REFERENCES "messages"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "message_mentions" (
        "message_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_message_mentions" PRIMARY KEY ("message_id", "user_id"),
        CONSTRAINT "fk_mentions_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_mentions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_mentions_user" ON "message_mentions" ("user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "chat_drafts" (
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "content" text NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_chat_drafts" PRIMARY KEY ("chat_id", "user_id"),
        CONSTRAINT "fk_drafts_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_drafts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_drafts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "message_mentions"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "forwarded_from_message_id"`);
  }
}
