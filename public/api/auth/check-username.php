<?php
require_once __DIR__ . '/../lib/auth.php';

$name = (string) ($_GET['u'] ?? $_POST['u'] ?? '');

if (!username_valid($name)) {
    json_out(array(
        'valid'     => false,
        'available' => false,
        'message'   => 'Usernames are 3-20 letters, numbers, or underscores.',
    ));
}

$taken = username_taken($name);
json_out(array(
    'valid'     => true,
    'available' => !$taken,
    'message'   => $taken
        ? 'That username is taken, please try again.'
        : 'That username is available.',
));
