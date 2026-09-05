<?php
require_once __DIR__ . '/../lib/auth.php';

require_post();
require_csrf();

$b = read_json_body();
$username = trim((string) ($b['username'] ?? ''));
$email    = trim((string) ($b['email'] ?? ''));
$password = (string) ($b['password'] ?? '');

if (!username_valid($username)) {
    json_err('Usernames are 3-20 letters, numbers, or underscores.', 422, 'username_invalid');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_err('Please enter a valid email address.', 422, 'email_invalid');
}
if (strlen($password) < 8) {
    json_err('Use a password of at least 8 characters.', 422, 'password_weak');
}
if (username_taken($username)) {
    json_err('That username is taken, please try again.', 409, 'username_taken');
}
if (email_taken($email)) {
    json_err('There is already an account with that email. Try signing in instead.', 409, 'email_taken');
}

$hash = password_hash($password, PASSWORD_DEFAULT);

try {
    db()->prepare(
        'INSERT INTO users (username, username_lower, email, email_lower, password_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?)'
    )->execute(array(
        $username, normalize_username($username),
        $email, strtolower($email),
        $hash, db_now(),
    ));
} catch (\Throwable $e) {
    error_log('[riffly] signup insert failed: ' . $e->getMessage());
    // Almost always a unique-key race on username or email.
    json_err('That username is taken, please try again.', 409, 'username_taken');
}

login_session((int) db()->lastInsertId());

json_out(array('user' => public_user(current_user()), 'csrf' => csrf_token()));
