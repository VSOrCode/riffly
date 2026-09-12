<?php
require_once __DIR__ . '/http.php';

function recaptcha_site_key(): string
{
    return (string) (config()['recaptcha']['site_key'] ?? '');
}

function recaptcha_enabled(): bool
{
    $c = config()['recaptcha'] ?? array();
    return !empty($c['site_key']) && !empty($c['secret_key']);
}

/**
 * Verify a reCAPTCHA response token with Google.
 * Works for v2 (checkbox/invisible) and v3 (score-based) keys: v3 responses
 * carry a numeric "score" that we compare against a lenient default threshold
 * since we don't know how the key was tuned.
 */
function verify_recaptcha(string $token): bool
{
    $c = config()['recaptcha'] ?? array();
    if (empty($c['secret_key'])) {
        return true; // not configured -> don't block signups
    }
    if ($token === '') {
        return false;
    }

    $resp = http_post_form('https://www.google.com/recaptcha/api/siteverify', array(
        'secret'   => $c['secret_key'],
        'response' => $token,
        'remoteip' => client_ip(),
    ));
    $data = json_decode($resp['body'] ?? '', true);
    if (!is_array($data) || empty($data['success'])) {
        if (is_array($data) && !empty($data['error-codes'])) {
            error_log('[riffly] recaptcha failed: ' . implode(',', (array) $data['error-codes']));
        }
        return false;
    }
    if (isset($data['score']) && is_numeric($data['score'])) {
        return (float) $data['score'] >= (float) ($c['min_score'] ?? 0.3);
    }
    return true;
}
