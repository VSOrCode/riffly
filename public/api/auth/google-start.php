<?php
require_once __DIR__ . '/../lib/auth.php';

$g = config()['google'] ?? array();
if (empty($g['client_id'])) {
    json_err('Google sign-in is not configured.', 503, 'google_off');
}

start_session();
$state = bin2hex(random_bytes(16));
$_SESSION['oauth_state'] = $state;
$_SESSION['oauth_next']  = isset($_GET['next']) ? (string) $_GET['next'] : '';

$redirect = rtrim((string) config()['site_url'], '/') . '/api/auth/google-callback.php';

$query = http_build_query(array(
    'client_id'     => $g['client_id'],
    'redirect_uri'  => $redirect,
    'response_type' => 'code',
    'scope'         => 'openid email profile',
    'state'         => $state,
    'prompt'        => 'select_account',
    'access_type'   => 'online',
));

header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . $query);
exit;
