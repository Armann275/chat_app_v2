export default class AddPreferences1714435280000 {
  name = 'AddPreferences1714435280000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "user_preferences" (
        "user_id" uuid NOT NULL,
        "dark_mode" boolean NOT NULL DEFAULT false,
        "notifications_enabled" boolean NOT NULL DEFAULT true,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_preferences" PRIMARY KEY ("user_id"),
        CONSTRAINT "fk_userprefs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "chat_user_preferences" (
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "muted_until" timestamptz,
        "archived" boolean NOT NULL DEFAULT false,
        "notifications" varchar(16) NOT NULL DEFAULT 'default',
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_chat_user_preferences" PRIMARY KEY ("chat_id", "user_id"),
        CONSTRAINT "chk_cup_notifications" CHECK ("notifications" IN ('default','all','mentions','none')),
        CONSTRAINT "fk_cup_chat" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cup_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "chat_user_preferences"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences"`);
  }
}
