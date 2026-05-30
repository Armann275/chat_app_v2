export default class AddInvitesAndJoinRequests1714435380000 {
  name = 'AddInvitesAndJoinRequests1714435380000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "chat_invite_links" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "chat_id" uuid NOT NULL,
        "code" varchar(32) NOT NULL,
        "created_by" uuid NOT NULL,
        "expires_at" timestamptz,
        "max_uses" integer,
        "uses" integer NOT NULL DEFAULT 0,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_chat_invite_links" PRIMARY KEY ("id"),
        CONSTRAINT "uq_chat_invite_links_code" UNIQUE ("code"),
        CONSTRAINT "fk_invite_links_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_invite_links_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_invite_links_chat_id" ON "chat_invite_links" ("chat_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "chat_join_requests" (
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "message" varchar(500),
        "requested_at" timestamptz NOT NULL DEFAULT now(),
        "decided_by" uuid,
        "decided_at" timestamptz,
        CONSTRAINT "pk_chat_join_requests" PRIMARY KEY ("chat_id", "user_id"),
        CONSTRAINT "chk_join_requests_status"
          CHECK ("status" IN ('pending', 'approved', 'rejected')),
        CONSTRAINT "fk_join_requests_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_join_requests_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_join_requests_chat_status"
         ON "chat_join_requests" ("chat_id", "status")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_join_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_invite_links"`);
  }
}
