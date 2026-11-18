import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase8AiLearningPathGenerator1763900000000 implements MigrationInterface {
  name = 'Phase8AiLearningPathGenerator1763900000000';

  private async hasColumn(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    )) as Array<{ COLUMN_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (
      !(await this.hasColumn(
        queryRunner,
        'learning_path_tracks',
        'owner_user_id',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE \`learning_path_tracks\`
          MODIFY COLUMN \`code\` varchar(48) NOT NULL,
          ADD COLUMN \`owner_user_id\` int NULL,
          ADD COLUMN \`is_ai_generated\` tinyint(1) NOT NULL DEFAULT 0,
          ADD COLUMN \`source_prompt\` text NULL,
          ADD COLUMN \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          ADD KEY \`IDX_lp_tracks_owner\` (\`owner_user_id\`),
          ADD CONSTRAINT \`FK_lp_tracks_owner\` FOREIGN KEY (\`owner_user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      `);
    }

    if (
      !(await this.hasColumn(
        queryRunner,
        'learning_path_units',
        'study_guide_json',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE \`learning_path_units\`
          ADD COLUMN \`study_guide_json\` json NULL
      `);
    }

    if (
      !(await this.hasColumn(
        queryRunner,
        'user_unit_progress',
        'ai_study_guide_json',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE \`user_unit_progress\`
          ADD COLUMN \`ai_study_guide_json\` json NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      await this.hasColumn(
        queryRunner,
        'user_unit_progress',
        'ai_study_guide_json',
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE \`user_unit_progress\` DROP COLUMN \`ai_study_guide_json\`
      `);
    }

    if (
      await this.hasColumn(
        queryRunner,
        'learning_path_units',
        'study_guide_json',
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE \`learning_path_units\` DROP COLUMN \`study_guide_json\`
      `);
    }

    if (
      await this.hasColumn(queryRunner, 'learning_path_tracks', 'owner_user_id')
    ) {
      await queryRunner.query(`
        ALTER TABLE \`learning_path_tracks\`
          DROP FOREIGN KEY \`FK_lp_tracks_owner\`,
          DROP INDEX \`IDX_lp_tracks_owner\`,
          DROP COLUMN \`created_at\`,
          DROP COLUMN \`source_prompt\`,
          DROP COLUMN \`is_ai_generated\`,
          DROP COLUMN \`owner_user_id\`,
          MODIFY COLUMN \`code\` varchar(32) NOT NULL
      `);
    }
  }
}
