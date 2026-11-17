import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase6AiConversations1763700000000 implements MigrationInterface {
  name = 'Phase6AiConversations1763700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`ai_conversation_sessions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`topic\` varchar(160) NOT NULL,
        \`level\` varchar(8) NOT NULL DEFAULT 'B1',
        \`explanation_lang\` varchar(8) NOT NULL DEFAULT 'vi',
        \`status\` varchar(16) NOT NULL DEFAULT 'active',
        \`turn_count\` int NOT NULL DEFAULT 0,
        \`summary_json\` json NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        \`ended_at\` datetime(6) NULL,
        INDEX \`IDX_ai_conv_sessions_user_status\` (\`user_id\`, \`status\`, \`created_at\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_ai_conv_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`ai_conversation_turns\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`session_id\` int NOT NULL,
        \`turn_number\` int NOT NULL,
        \`ai_prompt\` text NOT NULL,
        \`user_answer\` text NULL,
        \`feedback_json\` json NULL,
        \`answered_at\` datetime(6) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE KEY \`UQ_ai_conv_turns_session_number\` (\`session_id\`, \`turn_number\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_ai_conv_turns_session\` FOREIGN KEY (\`session_id\`) REFERENCES \`ai_conversation_sessions\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`ai_conversation_turns\``);
    await queryRunner.query(
      `DROP TABLE IF EXISTS \`ai_conversation_sessions\``,
    );
  }
}
