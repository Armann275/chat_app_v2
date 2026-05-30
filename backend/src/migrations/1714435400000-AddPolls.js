export default class AddPolls1714435400000 {
  name = 'AddPolls1714435400000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "polls" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "chat_id" uuid NOT NULL,
        "question" varchar(500) NOT NULL,
        "multi_choice" boolean NOT NULL DEFAULT false,
        "closes_at" timestamptz,
        "closed_at" timestamptz,
        "created_by" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_polls" PRIMARY KEY ("id"),
        CONSTRAINT "fk_polls_chat"
          FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_polls_created_by"
          FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_polls_chat_id_created_at"
         ON "polls" ("chat_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "poll_options" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "poll_id" uuid NOT NULL,
        "text" varchar(200) NOT NULL,
        "order_index" int NOT NULL,
        CONSTRAINT "pk_poll_options" PRIMARY KEY ("id"),
        CONSTRAINT "fk_poll_options_poll"
          FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_poll_options_poll_id"
         ON "poll_options" ("poll_id", "order_index")`,
    );

    await queryRunner.query(`
      CREATE TABLE "poll_votes" (
        "poll_id" uuid NOT NULL,
        "option_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "voted_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_poll_votes" PRIMARY KEY ("poll_id", "option_id", "user_id"),
        CONSTRAINT "fk_poll_votes_poll"
          FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_poll_votes_option"
          FOREIGN KEY ("option_id") REFERENCES "poll_options"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_poll_votes_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_poll_votes_poll_user"
         ON "poll_votes" ("poll_id", "user_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "poll_votes"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "poll_options"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "polls"`);
  }
}
