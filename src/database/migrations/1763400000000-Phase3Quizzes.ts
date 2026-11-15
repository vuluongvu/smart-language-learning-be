import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3Quizzes1763400000000 implements MigrationInterface {
  name = 'Phase3Quizzes1763400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`quizzes\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`topic_id\` int NULL,
        \`title\` varchar(160) NOT NULL,
        \`description\` text NULL,
        \`difficulty\` enum('easy', 'medium', 'hard') NULL,
        \`status\` enum('draft', 'published') NOT NULL DEFAULT 'draft',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_quizzes_user_status\` (\`user_id\`, \`status\`),
        INDEX \`IDX_quizzes_topic_id\` (\`topic_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_quizzes_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_quizzes_topic\` FOREIGN KEY (\`topic_id\`) REFERENCES \`topics\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`quiz_questions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`quiz_id\` int NOT NULL,
        \`vocabulary_id\` int NULL,
        \`vocabulary_term\` varchar(255) NULL,
        \`question_text\` text NOT NULL,
        \`question_type\` enum('multiple_choice', 'fill_blank', 'word_meaning') NOT NULL,
        \`explanation\` text NULL,
        \`order_index\` int NOT NULL DEFAULT 0,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_quiz_questions_quiz_order\` (\`quiz_id\`, \`order_index\`),
        INDEX \`IDX_quiz_questions_vocabulary_id\` (\`vocabulary_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_quiz_questions_quiz\` FOREIGN KEY (\`quiz_id\`) REFERENCES \`quizzes\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_quiz_questions_vocabulary\` FOREIGN KEY (\`vocabulary_id\`) REFERENCES \`vocabulary_items\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`question_options\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`question_id\` int NOT NULL,
        \`option_text\` text NOT NULL,
        \`is_correct\` tinyint(1) NOT NULL DEFAULT 0,
        \`order_index\` int NOT NULL DEFAULT 0,
        INDEX \`IDX_question_options_question_order\` (\`question_id\`, \`order_index\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_question_options_question\` FOREIGN KEY (\`question_id\`) REFERENCES \`quiz_questions\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`quiz_attempts\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`quiz_id\` int NOT NULL,
        \`quiz_title_snapshot\` varchar(160) NOT NULL,
        \`score\` decimal(5,2) NOT NULL DEFAULT 0.00,
        \`correct_count\` int NOT NULL DEFAULT 0,
        \`total_questions\` int NOT NULL DEFAULT 0,
        \`started_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`completed_at\` datetime(6) NULL,
        \`status\` enum('in_progress', 'completed') NOT NULL DEFAULT 'in_progress',
        INDEX \`IDX_quiz_attempts_user_quiz\` (\`user_id\`, \`quiz_id\`),
        INDEX \`IDX_quiz_attempts_user_started\` (\`user_id\`, \`started_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_quiz_attempts_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_quiz_attempts_quiz\` FOREIGN KEY (\`quiz_id\`) REFERENCES \`quizzes\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`quiz_answers\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`attempt_id\` int NOT NULL,
        \`question_id\` int NULL,
        \`selected_option_id\` int NULL,
        \`answer_text\` text NULL,
        \`question_text_snapshot\` text NOT NULL,
        \`question_type_snapshot\` enum('multiple_choice', 'fill_blank', 'word_meaning') NOT NULL,
        \`correct_answer_snapshot\` text NOT NULL,
        \`explanation_snapshot\` text NULL,
        \`vocabulary_id_snapshot\` int NULL,
        \`vocabulary_term_snapshot\` varchar(255) NULL,
        \`is_correct\` tinyint(1) NOT NULL DEFAULT 0,
        \`answered_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_quiz_answers_attempt_question\` (\`attempt_id\`, \`question_id\`),
        INDEX \`IDX_quiz_answers_question_id\` (\`question_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_quiz_answers_attempt\` FOREIGN KEY (\`attempt_id\`) REFERENCES \`quiz_attempts\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_quiz_answers_question\` FOREIGN KEY (\`question_id\`) REFERENCES \`quiz_questions\` (\`id\`) ON DELETE SET NULL,
        CONSTRAINT \`FK_quiz_answers_option\` FOREIGN KEY (\`selected_option_id\`) REFERENCES \`question_options\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`quiz_answers\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`quiz_attempts\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`question_options\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`quiz_questions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`quizzes\``);
  }
}
