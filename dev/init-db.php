<?php
/**
 * Local dev: create the SQLite schema.
 *   php -c dev/php.ini dev/init-db.php
 *
 * For the real MySQL database on HostGator, import docs/schema.mysql.sql
 * through phpMyAdmin instead.
 */

require __DIR__ . '/../public/api/lib/db.php';

if (!db_is_sqlite()) {
    fwrite(STDERR, "config.php is not pointing at SQLite.\n");
    fwrite(STDERR, "For MySQL, import docs/schema.mysql.sql via phpMyAdmin.\n");
    exit(1);
}

$pdo = db();

$pdo->exec('CREATE TABLE IF NOT EXISTS users (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  username         TEXT    NOT NULL,
  username_lower   TEXT    NOT NULL,
  email            TEXT    NOT NULL,
  email_lower      TEXT    NOT NULL,
  password_hash    TEXT,
  google_id        TEXT,
  display_name     TEXT,
  pending_username INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL,
  last_login_at    TEXT
)');
$pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS ux_users_username ON users(username_lower)');
$pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS ux_users_email    ON users(email_lower)');
$pdo->exec('CREATE UNIQUE INDEX IF NOT EXISTS ux_users_google   ON users(google_id)');

$pdo->exec('CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT    NOT NULL,
  identifier TEXT    NOT NULL,
  ok         INTEGER NOT NULL DEFAULT 0,
  at         TEXT    NOT NULL
)');
$pdo->exec('CREATE INDEX IF NOT EXISTS ix_attempts_ip ON login_attempts(ip, at)');
$pdo->exec('CREATE INDEX IF NOT EXISTS ix_attempts_id ON login_attempts(identifier, at)');

echo "SQLite schema ready: " . config()['db']['dsn'] . "\n";
