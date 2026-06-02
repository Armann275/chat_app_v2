export default class AddPasswordResets1714435500000 {
  name = 'AddPasswordResets1714435500000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "password_resets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "code_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "attempts" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_password_resets" PRIMARY KEY ("id"),
        CONSTRAINT "fk_password_resets_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_password_resets_active"
        ON "password_resets" ("user_id")
        WHERE "consumed_at" IS NULL
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_password_resets_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "password_resets"`);
  }
}
