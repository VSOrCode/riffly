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
    if (strncmp($next, 'subscribe:', 10) === 0) {
        $bits = explode(':', substr($next, 10), 2);
        $plan = preg_replace('/[^a-z]/', '', strtolower($bits[0] ?? ''));
        $interval = (isset($bits[1]) && $bits[1] === 'year') ? 'year' : 'month';
        return $plan !== ''
            ? '/pricing.html?plan=' . rawurlencode($plan) . '&interval=' . $interval . '&auto=1'
            : '/pricing.html';
    }
    return '/account.html';
}

/**
 * Stateless, signed OAuth "state" token - no session needed to issue or
 * verify it. (Deliberately session-independent: response_mode=form_post
 * makes Google POST back as a cross-site top-level navigation, and a
 * SameSite=Lax session cookie is not sent on those, so we can't rely on
 * a server-side session to check state.)
 */
function oauth_state_issue(string $next): string
{
    $nonce = bin2hex(random_bytes(12));
    $ts = (string) time();
    $payload = $nonce . '|' . $ts . '|' . $next;
    $encoded = rtrim(strtr(base64_encode($payload), '+/', '-_'), '=');
    $sig = hash_hmac('sha256', $encoded, (string) (config()['app_secret'] ?? ''));
    return $encoded . '.' . $sig;
}

/** Returns the embedded "next" string on success, or null if invalid/expired/tampered. */
function oauth_state_verify(string $state, int $maxAgeSeconds = 600): ?string
{
    $parts = explode('.', $state, 2);
    if (count($parts) !== 2) {
        return null;
    }
    list($encoded, $sig) = $parts;
    $expected = hash_hmac('sha256', $encoded, (string) (config()['app_secret'] ?? ''));
    if (!hash_equals($expected, $sig)) {
        return null;
    }
    $payload = base64_decode(strtr($encoded, '-_', '+/'));
    if ($payload === false) {
        return null;
    }
    $bits = explode('|', $payload, 3);
    if (count($bits) !== 3) {
        return null;
    }
    list(, $ts, $next) = $bits;
    if (!ctype_digit($ts) || (time() - (int) $ts) > $maxAgeSeconds) {
        return null;
    }
    return $next;
}
