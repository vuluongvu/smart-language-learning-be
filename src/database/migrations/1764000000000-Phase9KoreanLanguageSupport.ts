import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase9KoreanLanguageSupport1764000000000 implements MigrationInterface {
  name = 'Phase9KoreanLanguageSupport1764000000000';

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

  private async hasIndex(
    queryRunner: QueryRunner,
    table: string,
    indexName: string,
  ): Promise<boolean> {
    const rows = (await queryRunner.query(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
      [table, indexName],
    )) as Array<{ INDEX_NAME: string }>;
    return rows.length > 0;
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT IGNORE INTO \`languages\` (\`code\`, \`name\`, \`is_active\`)
      VALUES ('ko', 'Korean', 1)
    `);

    if (!(await this.hasColumn(queryRunner, 'users', 'learning_language'))) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
          ADD COLUMN \`learning_language\` varchar(16) NOT NULL DEFAULT 'en',
          ADD COLUMN \`korean_goal_band\` varchar(32) NOT NULL DEFAULT 'topik_1_2',
          ADD COLUMN \`korean_current_level\` varchar(16) NOT NULL DEFAULT 'A1'
      `);
    }

    if (!(await this.hasColumn(queryRunner, 'quizzes', 'language_code'))) {
      await queryRunner.query(`
        ALTER TABLE \`quizzes\`
          ADD COLUMN \`language_code\` varchar(16) NOT NULL DEFAULT 'en'
      `);
    }
    if (
      !(await this.hasIndex(
        queryRunner,
        'quizzes',
        'IDX_quizzes_user_language',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE \`quizzes\`
          ADD KEY \`IDX_quizzes_user_language\` (\`user_id\`, \`language_code\`)
      `);
    }

    if (
      !(await this.hasColumn(
        queryRunner,
        'flashcard_review_sessions',
        'language_code',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE \`flashcard_review_sessions\`
          ADD COLUMN \`language_code\` varchar(16) NOT NULL DEFAULT 'en'
      `);
    }
    if (
      !(await this.hasIndex(
        queryRunner,
        'flashcard_review_sessions',
        'IDX_fc_sessions_user_language',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE \`flashcard_review_sessions\`
          ADD KEY \`IDX_fc_sessions_user_language\` (\`user_id\`, \`language_code\`)
      `);
    }

    if (
      !(await this.hasColumn(
        queryRunner,
        'ai_conversation_sessions',
        'language_code',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE \`ai_conversation_sessions\`
          ADD COLUMN \`language_code\` varchar(16) NOT NULL DEFAULT 'en'
      `);
    }
    if (
      !(await this.hasIndex(
        queryRunner,
        'ai_conversation_sessions',
        'IDX_ai_conv_sessions_user_language',
      ))
    ) {
      await queryRunner.query(`
        ALTER TABLE \`ai_conversation_sessions\`
          ADD KEY \`IDX_ai_conv_sessions_user_language\` (\`user_id\`, \`language_code\`)
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (
      await this.hasIndex(
        queryRunner,
        'ai_conversation_sessions',
        'IDX_ai_conv_sessions_user_language',
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE \`ai_conversation_sessions\` DROP INDEX \`IDX_ai_conv_sessions_user_language\`
      `);
    }
    if (
      await this.hasColumn(
        queryRunner,
        'ai_conversation_sessions',
        'language_code',
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE \`ai_conversation_sessions\` DROP COLUMN \`language_code\`
      `);
    }

    if (
      await this.hasIndex(
        queryRunner,
        'flashcard_review_sessions',
        'IDX_fc_sessions_user_language',
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE \`flashcard_review_sessions\` DROP INDEX \`IDX_fc_sessions_user_language\`
      `);
    }
    if (
      await this.hasColumn(
        queryRunner,
        'flashcard_review_sessions',
        'language_code',
      )
    ) {
      await queryRunner.query(`
        ALTER TABLE \`flashcard_review_sessions\` DROP COLUMN \`language_code\`
      `);
    }

    if (
      await this.hasIndex(queryRunner, 'quizzes', 'IDX_quizzes_user_language')
    ) {
      await queryRunner.query(`
        ALTER TABLE \`quizzes\` DROP INDEX \`IDX_quizzes_user_language\`
      `);
    }
    if (await this.hasColumn(queryRunner, 'quizzes', 'language_code')) {
      await queryRunner.query(`
        ALTER TABLE \`quizzes\` DROP COLUMN \`language_code\`
      `);
    }

    if (await this.hasColumn(queryRunner, 'users', 'learning_language')) {
      await queryRunner.query(`
        ALTER TABLE \`users\`
          DROP COLUMN \`korean_current_level\`,
          DROP COLUMN \`korean_goal_band\`,
          DROP COLUMN \`learning_language\`
      `);
    }

    await queryRunner.query(`DELETE FROM \`languages\` WHERE \`code\` = 'ko'`);
  }
}
