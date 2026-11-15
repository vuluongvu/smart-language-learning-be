import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4Flashcards1763500000000 implements MigrationInterface {
  name = 'Phase4Flashcards1763500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`vocabulary_progress\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`vocabulary_id\` int NOT NULL,
        \`repetitions\` int NOT NULL DEFAULT 0,
        \`interval_days\` int NOT NULL DEFAULT 0,
        \`ease_factor\` decimal(4,2) NOT NULL DEFAULT 2.50,
        \`last_rating\` enum('again', 'hard', 'good', 'easy') NULL,
        \`last_reviewed_at\` datetime(6) NULL,
        \`next_review_at\` datetime(6) NULL,
        \`status\` enum('new', 'learning', 'mastered') NOT NULL DEFAULT 'new',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_vocab_progress_user_vocab\` (\`user_id\`, \`vocabulary_id\`),
        INDEX \`IDX_vocab_progress_user_next_review\` (\`user_id\`, \`next_review_at\`),
        INDEX \`IDX_vocab_progress_user_status\` (\`user_id\`, \`status\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_vocab_progress_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_vocab_progress_vocab\` FOREIGN KEY (\`vocabulary_id\`) REFERENCES \`vocabulary_items\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`flashcard_review_sessions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`topic_id\` int NULL,
        \`mode\` enum('due_and_new', 'due_only', 'new_only', 'hard_only', 'all', 'custom') NOT NULL DEFAULT 'due_and_new',
        \`card_ids_json\` json NOT NULL,
        \`target_count\` int NOT NULL DEFAULT 0,
        \`reviewed_count\` int NOT NULL DEFAULT 0,
        \`is_streak_eligible\` tinyint(1) NOT NULL DEFAULT 0,
        \`started_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`completed_at\` datetime(6) NULL,
        \`status\` enum('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
        INDEX \`IDX_flashcard_sessions_user_status\` (\`user_id\`, \`status\`, \`started_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_flashcard_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_flashcard_sessions_topic\` FOREIGN KEY (\`topic_id\`) REFERENCES \`topics\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`flashcard_reviews\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`session_id\` int NOT NULL,
        \`vocabulary_id\` int NOT NULL,
        \`rating\` enum('again', 'hard', 'good', 'easy') NOT NULL,
        \`reviewed_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_flashcard_reviews_session_vocab\` (\`session_id\`, \`vocabulary_id\`),
        INDEX \`IDX_flashcard_reviews_vocab\` (\`vocabulary_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_flashcard_reviews_session\` FOREIGN KEY (\`session_id\`) REFERENCES \`flashcard_review_sessions\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_flashcard_reviews_vocab\` FOREIGN KEY (\`vocabulary_id\`) REFERENCES \`vocabulary_items\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`flashcard_reviews\``);
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`flashcard_review_sessions\``,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS \`vocabulary_progress\``);
  }
}
