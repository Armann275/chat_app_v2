export default class AddUserProfile1714435210000 {
  name = 'AddUserProfile1714435210000';

  async up(queryRunner) {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "avatar_url" varchar(1024)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "bio" varchar(500)`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "last_seen_at" timestamptz`);
  }

  async down(queryRunner) {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "last_seen_at"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "bio"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
  }
}
