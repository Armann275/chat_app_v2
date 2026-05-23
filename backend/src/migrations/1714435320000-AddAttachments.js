export default class AddAttachments1714435320000 {
  name = 'AddAttachments1714435320000';

  async up(queryRunner) {
    await queryRunner.query(`
      CREATE TABLE "attachments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "message_id" uuid,
        "uploaded_by" uuid NOT NULL,
        "kind" varchar(16) NOT NULL,
        "url" varchar(2048) NOT NULL,
        "mime" varchar(128) NOT NULL,
        "size" bigint NOT NULL,
        "width" integer,
        "height" integer,
        "duration_seconds" numeric(10,3),
        "waveform_peaks" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_attachments" PRIMARY KEY ("id"),
        CONSTRAINT "chk_attachments_kind" CHECK ("kind" IN ('image','video','file','voice')),
        CONSTRAINT "fk_attachments_message" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_attachments_user" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_attachments_message" ON "attachments" ("message_id")`,
    );
  }

  async down(queryRunner) {
    await queryRunner.query(`DROP TABLE IF EXISTS "attachments"`);
  }
}
