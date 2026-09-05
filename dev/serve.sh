#!/bin/sh
# Local dev server for Riffly.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
PHP="${PHP:-php}"
exec "$PHP" -c "$DIR/dev/php.ini" -S 127.0.0.1:8001 -t "$DIR/public"
