import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialPhase1Schema1763200000000 implements MigrationInterface {
  name = 'InitialPhase1Schema1763200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`password_hash\` varchar(255) NULL,
        \`display_name\` varchar(100) NOT NULL,
        \`avatar_url\` varchar(500) NULL,
        \`timezone\` varchar(64) NOT NULL DEFAULT 'UTC',
        \`is_leaderboard_visible\` tinyint(1) NOT NULL DEFAULT 1,
        \`role\` enum('user', 'admin') NOT NULL DEFAULT 'user',
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_users_email\` (\`email\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`user_auth_providers\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`provider\` varchar(32) NOT NULL,
        \`provider_user_id\` varchar(255) NOT NULL,
        \`provider_email\` varchar(255) NULL,
        \`linked_at\` datetime(6) NOT NULL,
        UNIQUE INDEX \`UQ_provider_provider_user\` (\`provider\`, \`provider_user_id\`),
        INDEX \`IDX_user_auth_providers_user_id\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_user_auth_providers_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`refresh_sessions\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`user_id\` int NOT NULL,
        \`token_hash\` varchar(128) NOT NULL,
        \`expires_at\` datetime(6) NOT NULL,
        \`revoked_at\` datetime(6) NULL,
        \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`UQ_refresh_sessions_token_hash\` (\`token_hash\`),
        INDEX \`IDX_refresh_sessions_user_id\` (\`user_id\`),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`FK_refresh_sessions_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`languages\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`code\` varchar(16) NOT NULL,
        \`name\` varchar(64) NOT NULL,
        \`is_active\` tinyint(1) NOT NULL DEFAULT 1,
        UNIQUE INDEX \`UQ_languages_code\` (\`code\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO \`languages\` (\`code\`, \`name\`, \`is_active\`)
      VALUES ('en', 'English', 1)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`refresh_sessions\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`user_auth_providers\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`languages\``);
    await queryRunner.query(`DROP TABLE IF EXISTS \`users\``);
  }
}
