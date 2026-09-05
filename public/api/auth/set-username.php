<?php
require_once __DIR__ . '/../lib/auth.php';

require_post();
require_csrf();
$u = require_user();

$b = read_json_body();
$username = trim((string) ($b['username'] ?? ''));

if (!username_valid($username)) {
    json_err('Usernames are 3-20 letters, numbers, or underscores.', 422, 'username_invalid');
}
if (normalize_username($username) !== $u['username_lower'] && username_taken($username)) {
    json_err('That username is taken, please try again.', 409, 'username_taken');
}

db()->prepare('UPDATE users SET username = ?, username_lower = ?, pending_username = 0 WHERE id = ?')
    ->execute(array($username, normalize_username($username), $u['id']));

$u['username'] = $username;
$u['username_lower'] = normalize_username($username);
$u['pending_username'] = 0;
json_out(array('user' => public_user($u)));
