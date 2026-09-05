<?php
/**
 * Minimal HTTP client for outbound calls (Google OAuth).
 * Prefers ext/curl, falls back to stream wrappers.
 */

function http_request(string $url, string $method, ?string $body, array $headers): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST  => $method,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
        ));
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
        $resp = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $err = curl_error($ch);
        curl_close($ch);
        if ($resp === false) {
            error_log('[riffly] curl error: ' . $err);
            return array('status' => 0, 'body' => '');
        }
        return array('status' => $status, 'body' => (string) $resp);
    }

    $ctx = stream_context_create(array('http' => array(
        'method'        => $method,
        'header'        => implode("\r\n", $headers),
        'content'       => $body ?? '',
        'timeout'       => 15,
        'ignore_errors' => true,
    )));
    $resp = @file_get_contents($url, false, $ctx);
    $status = 0;
    if (isset($http_response_header[0]) && preg_match('~\s(\d{3})\s~', $http_response_header[0], $m)) {
        $status = (int) $m[1];
    }
    return array('status' => $status, 'body' => $resp === false ? '' : (string) $resp);
}

function http_post_form(string $url, array $fields): array
{
    return http_request($url, 'POST', http_build_query($fields), array(
        'Content-Type: application/x-www-form-urlencoded',
        'Accept: application/json',
    ));
}

function http_get_auth(string $url, string $bearer): array
{
    return http_request($url, 'GET', null, array(
        'Authorization: Bearer ' . $bearer,
        'Accept: application/json',
    ));
}
