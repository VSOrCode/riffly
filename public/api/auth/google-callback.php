<?php
require_once __DIR__ . '/../lib/auth.php';
require_once __DIR__ . '/../lib/http.php';

$g    = config()['google'] ?? array();
$site = rtrim((string) config()['site_url'], '/');
start_session();

/** Redirect back to the account page with an error message. */
function oauth_bail(string $msg): void
{
    header('Location: /account.html?error=' . rawurlencode($msg));
    exit;
}

if (empty($g['client_id']) || empty($g['client_secret'])) {
    oauth_bail('Google sign-in is not configured.');
}
if (isset($_GET['error'])) {
    oauth_bail('Google sign-in was canceled.');
}

$code  = (string) ($_GET['code'] ?? '');
$state = (string) ($_GET['state'] ?? '');

if ($code === '' || $state === '' || !hash_equals((string) ($_SESSION['oauth_state'] ?? ''), $state)) {
    oauth_bail('Google sign-in could not be verified. Please try again.');
}
unset($_SESSION['oauth_state']);
$next = (string) ($_SESSION['oauth_next'] ?? '');
unset($_SESSION['oauth_next']);

$redirect = $site . '/api/auth/google-callback.php';

$tokenResp = http_post_form('https://oauth2.googleapis.com/token', array(
    'code'          => $code,
    'client_id'     => $g['client_id'],
    'client_secret' => $g['client_secret'],
    'redirect_uri'  => $redirect,
    'grant_type'    => 'authorization_code',
));
$token = json_decode($tokenResp['body'] ?? '', true);
if (empty($token['access_token'])) {
    error_log('[riffly] google token exchange failed: ' . ($tokenResp['body'] ?? ''));
    oauth_bail('Google sign-in failed. Please try again.');
}

$infoResp = http_get_auth('https://openidconnect.googleapis.com/v1/userinfo', (string) $token['access_token']);
$info = json_decode($infoResp['body'] ?? '', true);
if (empty($info['sub']) || empty($info['email'])) {
    oauth_bail('Google did not share your account details. Please try again.');
}

$googleId = (string) $info['sub'];
$emailRaw = (string) $info['email'];
$email    = strtolower(trim($emailRaw));
$name     = trim((string) ($info['name'] ?? ''));

$pdo = db();

$st = $pdo->prepare('SELECT * FROM users WHERE google_id = ? LIMIT 1');
$st->execute(array($googleId));
$user = $st->fetch();

if (!$user) {
    $st = $pdo->prepare('SELECT * FROM users WHERE email_lower = ? LIMIT 1');
    $st->execute(array($email));
    $user = $st->fetch();

    if ($user) {
        $pdo->prepare('UPDATE users SET google_id = ? WHERE id = ?')->execute(array($googleId, $user['id']));
    } else {
        // New account. Derive a provisional unique username; user confirms it next.
        $base = preg_replace('/[^a-z0-9_]/', '', strtolower(explode('@', $email)[0]));
        $base = substr($base !== '' ? $base : 'member', 0, 16);
        $candidate = $base;
        $n = 1;
        while (!username_valid($candidate) || username_taken($candidate)) {
            $n++;
            $candidate = substr($base, 0, 15) . $n;
            if ($n > 9999) {
                $candidate = 'member' . random_int(100000, 999999);
                break;
            }
        }
        $pdo->prepare(
            'INSERT INTO users (username, username_lower, email, email_lower, google_id, display_name, pending_username, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?)'
        )->execute(array(
            $candidate, normalize_username($candidate),
            $emailRaw, $email,
            $googleId, ($name !== '' ? $name : null),
            db_now(),
        ));
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ?');
        $st->execute(array($pdo->lastInsertId()));
        $user = $st->fetch();
    }
}

login_session((int) $user['id']);

if (!empty($user['pending_username'])) {
    header('Location: /account.html?setup=username&next=' . rawurlencode($next));
    exit;
}

header('Location: ' . resume_url($next));
exit;
