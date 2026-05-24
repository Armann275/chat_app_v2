export default class Add2FA1714435430000 {
  name = 'Add2FA1714435430000';

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "totp_secret" varchar(255),
        ADD COLUMN IF NOT EXISTS "totp_enabled_at" timestamptz,
        ADD COLUMN IF NOT EXISTS "totp_backup_codes" jsonb
    `);

    await queryRunner.query(`
      CREATE TABLE "two_factor_challenges" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" varchar(255) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "consumed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_two_factor_challenges" PRIMARY KEY ("id"),
        CONSTRAINT "fk_two_factor_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_2fa_token_hash" ON "two_factor_challenges" ("token_hash")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "two_factor_challenges"`);
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "totp_backup_codes",
        DROP COLUMN IF EXISTS "totp_enabled_at",
        DROP COLUMN IF EXISTS "totp_secret"
    `);
  }
}
