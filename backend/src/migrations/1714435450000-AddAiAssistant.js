export default class AddAiAssistant1714435450000 {
  name = 'AddAiAssistant1714435450000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "ai_sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "title" varchar(200),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ai_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "fk_ai_sessions_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ai_sessions_user" ON "ai_sessions" ("user_id", "updated_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "ai_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "session_id" uuid NOT NULL,
        "role" varchar(16) NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_ai_messages" PRIMARY KEY ("id"),
        CONSTRAINT "chk_ai_messages_role" CHECK ("role" IN ('user', 'assistant')),
        CONSTRAINT "fk_ai_messages_session"
          FOREIGN KEY ("session_id") REFERENCES "ai_sessions"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_ai_messages_session" ON "ai_messages" ("session_id", "created_at")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_messages"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_sessions"`);
  }
}
