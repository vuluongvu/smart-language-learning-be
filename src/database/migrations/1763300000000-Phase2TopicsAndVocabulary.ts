import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase2TopicsAndVocabulary1763300000000 implements MigrationInterface {
  name = 'Phase2TopicsAndVocabulary1763300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`topics\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`language_id\` int NOT NULL,
        \`name\` varchar(120) NOT NULL,
        \`description\` text NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_topics_user_language\` (\`user_id\`, \`language_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_topics_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_topics_language\` FOREIGN KEY (\`language_id\`) REFERENCES \`languages\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`vocabulary_items\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`language_id\` int NOT NULL,
        \`term\` varchar(255) NOT NULL,
        \`pronunciation\` varchar(255) NULL,
        \`part_of_speech\` varchar(64) NULL,
        \`definition\` text NOT NULL,
        \`example\` text NULL,
        \`notes\` text NULL,
        \`source\` enum('manual', 'quiz', 'import', 'ai') NOT NULL DEFAULT 'manual',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX \`IDX_vocabulary_user_term\` (\`user_id\`, \`term\`),
        INDEX \`IDX_vocabulary_language_id\` (\`language_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_vocabulary_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_vocabulary_language\` FOREIGN KEY (\`language_id\`) REFERENCES \`languages\` (\`id\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`topic_vocabulary\` (
        \`topic_id\` int NOT NULL,
        \`vocabulary_id\` int NOT NULL,
        \`added_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        INDEX \`IDX_topic_vocabulary_vocabulary_id\` (\`vocabulary_id\`),
        PRIMARY KEY (\`topic_id\`, \`vocabulary_id\`),
        CONSTRAINT \`FK_topic_vocabulary_topic\` FOREIGN KEY (\`topic_id\`) REFERENCES \`topics\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_topic_vocabulary_vocabulary\` FOREIGN KEY (\`vocabulary_id\`) REFERENCES \`vocabulary_items\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`topic_vocabulary\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`vocabulary_items\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`topics\``);
  }
}
