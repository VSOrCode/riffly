-- Riffly - MySQL schema for accounts / login
-- Import via cPanel -> phpMyAdmin -> (select your database) -> Import.
-- Run once on a fresh database.

CREATE TABLE users (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  username         VARCHAR(20)  NOT NULL,
  username_lower   VARCHAR(20)  NOT NULL,
  email            VARCHAR(255) NOT NULL,
  email_lower      VARCHAR(255) NOT NULL,
  password_hash    VARCHAR(255) NULL,
  google_id        VARCHAR(40)  NULL,
  display_name     VARCHAR(120) NULL,
  pending_username TINYINT      NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL,
  last_login_at    DATETIME     NULL,
  UNIQUE KEY ux_users_username (username_lower),
  UNIQUE KEY ux_users_email    (email_lower),
  UNIQUE KEY ux_users_google   (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE login_attempts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  ip         VARCHAR(45)  NOT NULL,
  identifier VARCHAR(190) NOT NULL,
  ok         TINYINT      NOT NULL DEFAULT 0,
  at         DATETIME     NOT NULL,
  KEY ix_attempts_ip (ip, at),
  KEY ix_attempts_id (identifier, at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
