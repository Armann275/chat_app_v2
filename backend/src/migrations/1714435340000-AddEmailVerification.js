export default class AddEmailVerification1714435340000 {
  name = 'AddEmailVerification1714435340000';

  async up(queryRunner) {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamptz`,
    );

    await queryRunner.query(`
      CREATE TABLE "email_verifications" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "code_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "attempts" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_email_verifications" PRIMARY KEY ("id"),
        CONSTRAINT "fk_email_verifications_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "idx_email_verifications_active"
        ON "email_verifications" ("user_id")
        WHERE "consumed_at" IS NULL
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_email_verifications_active"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "email_verifications"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "email_verified_at"`);
  }
}
