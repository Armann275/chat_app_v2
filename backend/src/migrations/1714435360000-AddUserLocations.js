export default class AddUserLocations1714435360000 {
  name = 'AddUserLocations1714435360000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "user_locations" (
        "user_id" uuid NOT NULL,
        "latitude" double precision NOT NULL,
        "longitude" double precision NOT NULL,
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_locations" PRIMARY KEY ("user_id"),
        CONSTRAINT "chk_user_locations_lat" CHECK ("latitude" >= -90 AND "latitude" <= 90),
        CONSTRAINT "chk_user_locations_lng" CHECK ("longitude" >= -180 AND "longitude" <= 180),
        CONSTRAINT "fk_user_locations_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_locations_updated_at" ON "user_locations" ("updated_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "user_location_privacy" (
        "user_id" uuid NOT NULL,
        "mode" varchar(20) NOT NULL DEFAULT 'nobody',
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_location_privacy" PRIMARY KEY ("user_id"),
        CONSTRAINT "chk_user_location_privacy_mode"
          CHECK ("mode" IN ('nobody', 'friends', 'specific_friends')),
        CONSTRAINT "fk_user_location_privacy_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_location_visible_to" (
        "user_id" uuid NOT NULL,
        "friend_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_user_location_visible_to" PRIMARY KEY ("user_id", "friend_user_id"),
        CONSTRAINT "chk_user_location_visible_to_self" CHECK ("user_id" <> "friend_user_id"),
        CONSTRAINT "fk_user_location_visible_to_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_user_location_visible_to_friend"
          FOREIGN KEY ("friend_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_user_location_visible_to_friend"
         ON "user_location_visible_to" ("friend_user_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "user_location_visible_to"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_location_privacy"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_locations"`);
  }
}
