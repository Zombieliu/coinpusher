#!/bin/sh

MATCH_URL=${1:-https://coinpusher-match.numeron.world}
ROOM_WS=${2:-wss://coinpusher-room.numeron.world/}

echo "Calling ${MATCH_URL}/admin/RoomServerJoin with serverUrl=${ROOM_WS}"

curl -vk "${MATCH_URL}/admin/RoomServerJoin" \
  -H "Content-Type: application/json" \
  -d "{\"serverUrl\":\"${ROOM_WS}\"}"
