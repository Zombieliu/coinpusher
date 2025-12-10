#!/bin/sh
set -e

ENTRY="${SERVER_ENTRY:-ServerGate}"
echo "Starting TSRPC server: ${ENTRY}"

exec node "dist/${ENTRY}.js"
