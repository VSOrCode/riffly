-- Riffly - adds subscriptions on top of an already-live users/login_attempts
-- database (created before subscriptions existed).
-- Run once: cPanel -> phpMyAdmin -> your database -> SQL tab -> paste -> Go.

ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(64) NULL;
ALTER TABLE users ADD UNIQUE KEY ux_users_stripe_customer (stripe_customer_id);

CREATE TABLE subscriptions (
  id                      INT AUTO_INCREMENT PRIMARY KEY,
  user_id                 INT          NOT NULL,
  plan                    VARCHAR(20)  NOT NULL,
  billing_interval        VARCHAR(10)  NOT NULL,
  stripe_customer_id      VARCHAR(64)  NOT NULL,
  stripe_subscription_id  VARCHAR(64)  NOT NULL,
  status                  VARCHAR(20)  NOT NULL,
  current_period_end      DATETIME     NULL,
  cancel_at_period_end    TINYINT      NOT NULL DEFAULT 0,
  created_at              DATETIME     NOT NULL,
  updated_at              DATETIME     NOT NULL,
  UNIQUE KEY ux_sub_user       (user_id),
  UNIQUE KEY ux_sub_stripe_sub (stripe_subscription_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
