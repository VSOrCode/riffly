<?php
require_once __DIR__ . '/bootstrap.php';

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $cfg = config()['db'] ?? array();
    if (empty($cfg['dsn'])) {
        json_err('The site database is not configured yet.', 503, 'db_not_configured');
    }
    try {
        $pdo = new PDO(
            (string) $cfg['dsn'],
            isset($cfg['user']) ? (string) $cfg['user'] : null,
            isset($cfg['pass']) ? (string) $cfg['pass'] : null,
            array(
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            )
        );
    } catch (\Throwable $e) {
        error_log('[riffly] DB connect failed: ' . $e->getMessage());
        json_err('The site database is unavailable right now.', 503, 'db_unavailable');
    }
    if (db_is_sqlite()) {
        $pdo->exec('PRAGMA foreign_keys = ON');
    }
    return $pdo;
}

function db_is_sqlite(): bool
{
    return strncmp((string) (config()['db']['dsn'] ?? ''), 'sqlite', 6) === 0;
}

function db_now(): string
{
    return gmdate('Y-m-d H:i:s');
}
