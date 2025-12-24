#!/bin/sh
set -e

if [ -n "$TLS_KEY" ] && [ -n "$TLS_CERT" ]; then
  DEFAULT_KEY_PATH="/etc/ssl/cloudflare/origin.key"
  DEFAULT_CERT_PATH="/etc/ssl/cloudflare/origin.pem"
  KEY_PATH="${TLS_KEY_PATH:-$DEFAULT_KEY_PATH}"
  CERT_PATH="${TLS_CERT_PATH:-$DEFAULT_CERT_PATH}"

  mkdir -p "$(dirname "$KEY_PATH")" "$(dirname "$CERT_PATH")"
  printf '%s\n' "$TLS_KEY" > "$KEY_PATH"
  printf '%s\n' "$TLS_CERT" > "$CERT_PATH"
  chmod 600 "$KEY_PATH" "$CERT_PATH"

  export TLS_KEY_PATH="$KEY_PATH"
  export TLS_CERT_PATH="$CERT_PATH"
fi

ENTRY="${SERVER_ENTRY:-ServerGate}"
echo "Starting TSRPC server: ${ENTRY}"

exec node "dist/${ENTRY}.js"
