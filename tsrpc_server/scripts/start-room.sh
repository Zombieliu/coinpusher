#!/bin/sh
set -e

CERT_DIR=/etc/ssl/cloudflare
mkdir -p "$CERT_DIR"

if [ -n "$TLS_KEY" ] && [ -n "$TLS_CERT" ]; then
  printf '%s\n' "$TLS_KEY" > "$CERT_DIR/origin.key"
  printf '%s\n' "$TLS_CERT" > "$CERT_DIR/origin.pem"
  chmod 600 "$CERT_DIR/origin.key" "$CERT_DIR/origin.pem"
  export TLS_KEY_PATH="$CERT_DIR/origin.key"
  export TLS_CERT_PATH="$CERT_DIR/origin.pem"
fi

npm run start:room
