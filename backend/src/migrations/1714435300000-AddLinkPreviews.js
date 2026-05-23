export default class AddLinkPreviews1714435300000 {
  name = 'AddLinkPreviews1714435300000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "link_previews" (
        "url" varchar(2048) NOT NULL,
        "title" varchar(512),
        "description" varchar(2048),
        "image_url" varchar(2048),
        "fetched_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_link_previews" PRIMARY KEY ("url")
      )
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "link_previews"`);
  }
}
