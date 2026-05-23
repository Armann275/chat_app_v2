export default class AddChats1714435220000 {
  name = 'AddChats1714435220000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "chats" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "type" varchar(16) NOT NULL,
        "name" varchar(100),
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_chats" PRIMARY KEY ("id"),
        CONSTRAINT "chk_chats_type" CHECK ("type" IN ('direct', 'group')),
        CONSTRAINT "fk_chats_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_chats_created_by" ON "chats" ("created_by")`,
    );

    await queryRunner.query(`
      CREATE TABLE "chat_members" (
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" varchar(16) NOT NULL DEFAULT 'member',
        "joined_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_chat_members" PRIMARY KEY ("chat_id", "user_id"),
        CONSTRAINT "chk_chat_members_role" CHECK ("role" IN ('member', 'admin')),
        CONSTRAINT "fk_chat_members_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_chat_members_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_chat_members_user_id" ON "chat_members" ("user_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chats"`);
  }
}
