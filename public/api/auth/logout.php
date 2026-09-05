<?php
require_once __DIR__ . '/../lib/auth.php';

require_post();
require_csrf();

logout_user();
json_out(array('ok' => true));
