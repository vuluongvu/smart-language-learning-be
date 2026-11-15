import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase5ProgressStreaks1763600000000 implements MigrationInterface {
  name = 'Phase5ProgressStreaks1763600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_daily_activities\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`activity_date\` date NOT NULL,
        \`activity_count\` int NOT NULL DEFAULT 1,
        \`quiz_completions\` int NOT NULL DEFAULT 0,
        \`flashcard_completions\` int NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_user_daily_activity_user_date\` (\`user_id\`, \`activity_date\`),
        INDEX \`IDX_user_daily_activity_user_date\` (\`user_id\`, \`activity_date\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_user_daily_activities_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_streaks\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`current_streak\` int NOT NULL DEFAULT 0,
        \`longest_streak\` int NOT NULL DEFAULT 0,
        \`last_activity_date\` date NULL,
        \`current_streak_started_at\` date NULL,
        \`streak_achieved_at\` datetime(6) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_user_streaks_user\` (\`user_id\`),
        INDEX \`IDX_user_streaks_ranking\` (\`current_streak\`, \`longest_streak\`, \`streak_achieved_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_user_streaks_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`learning_activity_events\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`event_key\` varchar(128) NOT NULL,
        \`source_type\` enum('quiz_attempt', 'flashcard_session') NOT NULL,
        \`source_id\` int NOT NULL,
        \`activity_date\` date NOT NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_learning_activity_event_key\` (\`event_key\`),
        INDEX \`IDX_learning_activity_events_user_date\` (\`user_id\`, \`activity_date\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_learning_activity_events_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`learning_activity_events\``,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_streaks\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_daily_activities\``);
  }
}
