export default class AddMessages1714435230000 {
  name = 'AddMessages1714435230000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "chat_id" uuid NOT NULL,
        "sender_id" uuid NOT NULL,
        "content" text NOT NULL,
        "edited_at" timestamptz,
        "deleted_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_messages" PRIMARY KEY ("id"),
        CONSTRAINT "fk_messages_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_messages_sender"
          FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_messages_chat_created" ON "messages" ("chat_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_sender" ON "messages" ("sender_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_messages_content_fts" ON "messages" USING GIN (to_tsvector('simple', "content"))`,
    );

    await queryRunner.query(`
      CREATE TABLE "message_receipts" (
        "message_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "delivered_at" timestamptz,
        "seen_at" timestamptz,
        CONSTRAINT "pk_message_receipts" PRIMARY KEY ("message_id", "user_id"),
        CONSTRAINT "fk_receipts_message"
          FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_receipts_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_receipts_user" ON "message_receipts" ("user_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "message_receipts"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_messages_content_fts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "messages"`);
  }
}
