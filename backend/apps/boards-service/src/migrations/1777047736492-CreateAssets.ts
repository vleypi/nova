import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssets1777047736492 implements MigrationInterface {
  name = 'CreateAssets1777047736492';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "spaceId" character varying(64) NOT NULL,
        "boardId" character varying(64) NOT NULL,
        "uploadedBy" uuid NOT NULL,
        "storageKey" character varying(512) NOT NULL,
        "mime" character varying(64) NOT NULL,
        "sizeBytes" integer NOT NULL,
        "width" integer NOT NULL,
        "height" integer NOT NULL,
        "sha256" character(64) NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assets_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_assets_spaceId_sha256"
        ON "assets" ("spaceId", "sha256")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_assets_spaceId_sha256"`);
    await queryRunner.query(`DROP TABLE "assets"`);
  }
}
