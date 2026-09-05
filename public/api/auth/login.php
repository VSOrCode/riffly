<?php
require_once __DIR__ . '/../lib/auth.php';

require_post();
require_csrf();

$b = read_json_body();
$identifier = trim((string) ($b['username'] ?? ''));   // username OR email
$password   = (string) ($b['password'] ?? '');

if ($identifier === '' || $password === '') {
    json_err('Enter your username and password.', 422, 'missing');
}
if (too_many_attempts($identifier)) {
    json_err('Too many attempts. Please wait 15 minutes and try again.', 429, 'rate_limited');
}

$st = db()->prepare('SELECT * FROM users WHERE username_lower = ? OR email_lower = ? LIMIT 1');
$st->execute(array(normalize_username($identifier), strtolower($identifier)));
$row = $st->fetch();

$ok = $row && !empty($row['password_hash']) && password_verify($password, (string) $row['password_hash']);

if (!$ok) {
    record_attempt($identifier, false);
    if ($row && empty($row['password_hash'])) {
        json_err('That account was created with Google. Use "Continue with Google" to sign in.', 401, 'use_google');
    }
    json_err('That username or password is incorrect.', 401, 'bad_credentials');
}

record_attempt($identifier, true);

if (password_needs_rehash((string) $row['password_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE users SET password_hash = ? WHERE id = ?')
        ->execute(array(password_hash($password, PASSWORD_DEFAULT), $row['id']));
}

login_session((int) $row['id']);

json_out(array('user' => public_user(current_user()), 'csrf' => csrf_token()));
