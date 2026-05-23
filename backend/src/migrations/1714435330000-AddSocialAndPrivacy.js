export default class AddSocialAndPrivacy1714435330000 {
  name = 'AddSocialAndPrivacy1714435330000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "friendships" (
        "user_a_id" uuid NOT NULL,
        "user_b_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_friendships" PRIMARY KEY ("user_a_id", "user_b_id"),
        CONSTRAINT "chk_friendships_order" CHECK ("user_a_id" < "user_b_id"),
        CONSTRAINT "fk_friendships_user_a"
          FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_friendships_user_b"
          FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_friendships_user_b_id" ON "friendships" ("user_b_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "friend_requests" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "from_user_id" uuid NOT NULL,
        "to_user_id" uuid NOT NULL,
        "status" varchar(16) NOT NULL DEFAULT 'pending',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "responded_at" timestamptz,
        CONSTRAINT "pk_friend_requests" PRIMARY KEY ("id"),
        CONSTRAINT "chk_friend_requests_status"
          CHECK ("status" IN ('pending', 'accepted', 'rejected', 'cancelled')),
        CONSTRAINT "chk_friend_requests_self"
          CHECK ("from_user_id" <> "to_user_id"),
        CONSTRAINT "fk_friend_requests_from"
          FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_friend_requests_to"
          FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uniq_friend_requests_pending"
        ON "friend_requests" ("from_user_id", "to_user_id")
        WHERE "status" = 'pending'
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_friend_requests_to" ON "friend_requests" ("to_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_friend_requests_from" ON "friend_requests" ("from_user_id")`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_privacy_settings" (
        "user_id" uuid NOT NULL,
        "who_can_message" varchar(16) NOT NULL DEFAULT 'everyone',
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_privacy_settings" PRIMARY KEY ("user_id"),
        CONSTRAINT "chk_who_can_message"
          CHECK ("who_can_message" IN ('everyone', 'friends', 'nobody')),
        CONSTRAINT "fk_user_privacy_settings_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "chats" ADD COLUMN "status" varchar(16) NOT NULL DEFAULT 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD CONSTRAINT "chk_chats_status" CHECK ("status" IN ('active', 'request'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD COLUMN "requested_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "chats" ADD COLUMN "request_target_user_id" uuid`,
    );
    await queryRunner.query(`
      ALTER TABLE "chats" ADD CONSTRAINT "fk_chats_requested_by"
        FOREIGN KEY ("requested_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "chats" ADD CONSTRAINT "fk_chats_request_target"
        FOREIGN KEY ("request_target_user_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_chats_status" ON "chats" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chats_request_target" ON "chats" ("request_target_user_id") WHERE "status" = 'request'`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chats_request_target"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_chats_status"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "fk_chats_request_target"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "fk_chats_requested_by"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN IF EXISTS "request_target_user_id"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN IF EXISTS "requested_by_user_id"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP CONSTRAINT IF EXISTS "chk_chats_status"`);
    await queryRunner.query(`ALTER TABLE "chats" DROP COLUMN IF EXISTS "status"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_privacy_settings"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uniq_friend_requests_pending"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "friend_requests"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "friendships"`);
  }
}
