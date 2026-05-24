export default class AddBlocksAndReports1714435410000 {
  name = 'AddBlocksAndReports1714435410000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "user_blocks" (
        "blocker_id" uuid NOT NULL,
        "blocked_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_blocks" PRIMARY KEY ("blocker_id", "blocked_id"),
        CONSTRAINT "chk_user_blocks_not_self" CHECK ("blocker_id" <> "blocked_id"),
        CONSTRAINT "fk_user_blocks_blocker"
          FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_blocks_blocked"
          FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_blocks_blocked" ON "user_blocks" ("blocked_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "reporter_id" uuid NOT NULL,
        "reported_id" uuid NOT NULL,
        "reason" varchar(64) NOT NULL,
        "details" varchar(1000),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "resolved_at" timestamptz,
        CONSTRAINT "pk_user_reports" PRIMARY KEY ("id"),
        CONSTRAINT "fk_user_reports_reporter"
          FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_reports_reported"
          FOREIGN KEY ("reported_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_reports_reported" ON "user_reports" ("reported_id", "created_at")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_blocks"`);
  }
}
