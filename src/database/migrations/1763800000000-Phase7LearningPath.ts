import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase7LearningPath1763800000000 implements MigrationInterface {
  name = 'Phase7LearningPath1763800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const existingGoalCols = (await queryRunner.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'learning_goal_band'
    `)) as Array<{ COLUMN_NAME: string }>;

    if (existingGoalCols.length === 0) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
          ADD COLUMN \`learning_goal_band\` varchar(32) NOT NULL DEFAULT 'band_45_55',
          ADD COLUMN \`current_level\` varchar(16) NOT NULL DEFAULT 'B1',
          ADD COLUMN \`daily_goal_minutes\` int NOT NULL DEFAULT 15
      `);
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`learning_path_tracks\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`code\` varchar(32) NOT NULL,
        \`title\` varchar(80) NOT NULL,
        \`cefr_level\` varchar(16) NOT NULL,
        \`language_code\` varchar(16) NOT NULL DEFAULT 'en',
        \`summary\` text NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        UNIQUE KEY \`UQ_lp_tracks_code\` (\`code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`learning_path_parts\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`track_id\` int NOT NULL,
        \`part_number\` int NOT NULL,
        \`title\` varchar(120) NOT NULL,
        \`subtitle\` varchar(255) NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        UNIQUE KEY \`UQ_lp_parts_track_num\` (\`track_id\`, \`part_number\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_lp_parts_track\` FOREIGN KEY (\`track_id\`) REFERENCES \`learning_path_tracks\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`learning_path_units\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`part_id\` int NOT NULL,
        \`unit_number\` int NOT NULL,
        \`slug\` varchar(80) NOT NULL,
        \`title\` varchar(140) NOT NULL,
        \`topic_name\` varchar(120) NOT NULL,
        \`icon\` varchar(32) NOT NULL DEFAULT 'compass',
        \`theme_color\` varchar(24) NOT NULL DEFAULT 'pink',
        \`grammar_focus\` varchar(255) NOT NULL,
        \`vocabulary_json\` json NOT NULL,
        \`reading_passage_json\` json NOT NULL,
        \`writing_prompt_json\` json NOT NULL,
        \`speaking_topic_prompt\` varchar(255) NOT NULL,
        \`sort_order\` int NOT NULL DEFAULT 0,
        UNIQUE KEY \`UQ_lp_units_slug\` (\`slug\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_lp_units_part\` FOREIGN KEY (\`part_id\`) REFERENCES \`learning_path_parts\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_unit_progress\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`unit_id\` int NOT NULL,
        \`vocab_completed\` tinyint(1) NOT NULL DEFAULT 0,
        \`quiz_completed\` tinyint(1) NOT NULL DEFAULT 0,
        \`quiz_score\` int NULL,
        \`writing_completed\` tinyint(1) NOT NULL DEFAULT 0,
        \`writing_submission\` text NULL,
        \`writing_feedback_json\` json NULL,
        \`speaking_completed\` tinyint(1) NOT NULL DEFAULT 0,
        \`speaking_session_id\` int NULL,
        \`topic_id\` int NULL,
        \`completed_at\` datetime(6) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_user_unit_progress_user_unit\` (\`user_id\`, \`unit_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_user_unit_progress_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_user_unit_progress_unit\` FOREIGN KEY (\`unit_id\`) REFERENCES \`learning_path_units\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_unit_progress\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`learning_path_units\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`learning_path_parts\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`learning_path_tracks\``);

    const existingGoalCols = (await queryRunner.query(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'users'
        AND COLUMN_NAME = 'learning_goal_band'
    `)) as Array<{ COLUMN_NAME: string }>;

    if (existingGoalCols.length > 0) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
          DROP COLUMN \`daily_goal_minutes\`,
          DROP COLUMN \`current_level\`,
          DROP COLUMN \`learning_goal_band\`
      `);
    }
  }
}
