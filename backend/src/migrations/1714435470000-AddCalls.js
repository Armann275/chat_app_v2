export default class AddCalls1714435470000 {
  name = 'AddCalls1714435470000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "calls" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "chat_id" uuid NOT NULL,
        "initiator_id" uuid NOT NULL,
        "type" varchar(16) NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'ringing',
        "started_at" timestamptz NOT NULL DEFAULT now(),
        "ended_at" timestamptz,
        CONSTRAINT "pk_calls" PRIMARY KEY ("id"),
        CONSTRAINT "chk_calls_type" CHECK ("type" IN ('voice', 'video')),
        CONSTRAINT "chk_calls_status"
          CHECK ("status" IN ('ringing', 'active', 'ended', 'rejected', 'missed', 'cancelled')),
        CONSTRAINT "fk_calls_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_calls_initiator"
          FOREIGN KEY ("initiator_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_calls_chat" ON "calls" ("chat_id", "started_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_calls_initiator" ON "calls" ("initiator_id", "started_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "call_participants" (
        "call_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "joined_at" timestamptz,
        "left_at" timestamptz,
        CONSTRAINT "pk_call_participants" PRIMARY KEY ("call_id", "user_id"),
        CONSTRAINT "fk_call_participants_call"
          FOREIGN KEY ("call_id") REFERENCES "calls"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_call_participants_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_call_participants_user" ON "call_participants" ("user_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "call_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "calls"`);
  }
}
