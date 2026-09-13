<?php
require_once __DIR__ . '/db.php';

/* -------------------------------------------------------------- session ---- */

function current_user(): ?array
{
    start_session();
    if (empty($_SESSION['uid'])) {
        return null;
    }
    static $cache = null;
    if ($cache !== null && (int) $cache['id'] === (int) $_SESSION['uid']) {
        return $cache;
    }
    $st = db()->prepare(
        'SELECT id, username, username_lower, email, display_name, google_id, password_hash, pending_username, created_at
         FROM users WHERE id = ?'
    );
    $st->execute(array($_SESSION['uid']));
    $row = $st->fetch();
    if (!$row) {
        logout_user();
        return null;
    }
    $cache = $row;
    return $row;
}

function public_user(array $u): array
{
    return array(
        'id'              => (int) $u['id'],
        'username'        => $u['username'],
        'email'           => $u['email'],
        'displayName'     => $u['display_name'] ?: $u['username'],
        'hasPassword'     => !empty($u['password_hash']),
        'linkedGoogle'    => !empty($u['google_id']),
        'pendingUsername' => !empty($u['pending_username']),
    );
}

function login_session(int $uid): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $uid;
    db()->prepare('UPDATE users SET last_login_at = ? WHERE id = ?')->execute(array(db_now(), $uid));
}

function logout_user(): void
{
    start_session();
    $_SESSION = array();
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], (bool) $p['secure'], (bool) $p['httponly']);
    }
    session_destroy();
}

function require_user(): array
{
    $u = current_user();
    if (!$u) {
        json_err('Please sign in to continue.', 401, 'auth_required');
    }
    return $u;
}

function find_user_by_id(int $id): ?array
{
    $st = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $st->execute(array($id));
    $row = $st->fetch();
    return $row ?: null;
}

/* ----------------------------------------------------- username / email ---- */

function normalize_username(string $s): string
{
    return strtolower(trim($s));
}

function username_valid(string $s): bool
{
    return (bool) preg_match('/^[A-Za-z0-9_]{3,20}$/', $s);
}

function username_taken(string $username): bool
{
    $st = db()->prepare('SELECT 1 FROM users WHERE username_lower = ? LIMIT 1');
    $st->execute(array(normalize_username($username)));
    return (bool) $st->fetchColumn();
}

function email_taken(string $email): bool
{
    $st = db()->prepare('SELECT 1 FROM users WHERE email_lower = ? LIMIT 1');
    $st->execute(array(strtolower(trim($email))));
    return (bool) $st->fetchColumn();
}

/* --------------------------------------------------------- rate limiting ---- */

function too_many_attempts(string $identifier): bool
{
    $since = gmdate('Y-m-d H:i:s', time() - 900); // 15-minute window
    $ip = client_ip();

    $st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip = ? AND ok = 0 AND at > ?');
    $st->execute(array($ip, $since));
    if ((int) $st->fetchColumn() >= 15) {
        return true;
    }
    $st = db()->prepare('SELECT COUNT(*) FROM login_attempts WHERE identifier = ? AND ok = 0 AND at > ?');
    $st->execute(array($identifier, $since));
    return (int) $st->fetchColumn() >= 8;
}

function record_attempt(string $identifier, bool $ok): void
{
    db()->prepare('INSERT INTO login_attempts (ip, identifier, ok, at) VALUES (?, ?, ?, ?)')
        ->execute(array(client_ip(), mb_substr($identifier, 0, 190), $ok ? 1 : 0, db_now()));

    // opportunistic cleanup
    if (random_int(1, 20) === 1) {
        db()->prepare('DELETE FROM login_attempts WHERE at < ?')
            ->execute(array(gmdate('Y-m-d H:i:s', time() - 86400)));
    }
}
