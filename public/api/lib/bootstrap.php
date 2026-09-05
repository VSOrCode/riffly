<?php
/**
 * Riffly - shared bootstrap for every API endpoint.
 * Loads config, JSON helpers, session + CSRF.
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0'); // never leak errors in API responses

function config(): array
{
    static $c = null;
    if ($c === null) {
        $f = dirname(__DIR__) . '/config.php';
        $c = is_file($f) ? require $f : array();
        if (!is_array($c)) {
            $c = array();
        }
    }
    return $c;
}

function json_out($data, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($data);
    exit;
}

function json_err(string $message, int $status, string $code = 'error', array $extra = array()): void
{
    json_out(array('error' => $message, 'code' => $code) + $extra, $status);
}

function require_post(): void
{
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        json_err('Method not allowed.', 405, 'method');
    }
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    $d = json_decode($raw === false ? '' : $raw, true);
    return is_array($d) ? $d : array();
}

function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    session_set_cookie_params(array(
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'secure'   => $secure,
        'samesite' => 'Lax',
    ));
    session_name('riffly_sess');
    session_start();

    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
}

function csrf_token(): string
{
    start_session();
    return (string) $_SESSION['csrf'];
}

/** Require a valid CSRF token + same-origin on state-changing requests. */
function require_csrf(): void
{
    start_session();
    $sent = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    if ($sent === '' || !hash_equals((string) ($_SESSION['csrf'] ?? ''), $sent)) {
        json_err('Your session expired. Refresh the page and try again.', 419, 'csrf');
    }
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '') {
        $oHost = parse_url($origin, PHP_URL_HOST);
        $sHost = parse_url((string) (config()['site_url'] ?? ''), PHP_URL_HOST);
        if ($oHost && $sHost && strcasecmp((string) $oHost, (string) $sHost) !== 0) {
            json_err('Request blocked (origin mismatch).', 403, 'origin');
        }
    }
}

/** Map a post-login "next" hint to a safe local URL. */
function resume_url(string $next): string
{
    if ($next === 'checkout') {
        return '/checkout.html';
    }
    if (strncmp($next, 'buy:', 4) === 0) {
        $id = preg_replace('/[^A-Za-z0-9_-]/', '', substr($next, 4));
        return $id !== '' ? '/checkout.html?buy=' . rawurlencode($id) : '/checkout.html';
    }
    return '/account.html';
}
