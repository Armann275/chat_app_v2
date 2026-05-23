export default class AddSync1714435310000 {
  name = 'AddSync1714435310000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "chat_read_cursors" (
        "user_id" uuid NOT NULL,
        "chat_id" uuid NOT NULL,
        "last_read_message_id" uuid,
        "last_read_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_chat_read_cursors" PRIMARY KEY ("user_id", "chat_id"),
        CONSTRAINT "fk_crc_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_crc_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_crc_message" FOREIGN KEY ("last_read_message_id") REFERENCES "messages"("id") ON DELETE SET NULL
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_read_cursors"`);
  }
}
