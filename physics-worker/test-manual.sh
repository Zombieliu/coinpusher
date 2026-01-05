#!/bin/bash

# 🧪 Rust Room Service 手动测试脚本
#
# 使用 nc (netcat) 手动发送消息测试

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🧪 Rust Room Service 手动测试${NC}"
echo ""

# 检查 Rust 服务是否运行
if ! lsof -i :9000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Rust Room Service 未运行，正在启动...${NC}"
    RUST_LOG=debug ROOM_SERVICE_ADDR=127.0.0.1:9000 TICK_RATE=30 \
    cargo run --release > /tmp/rust-room-test.log 2>&1 &

    RUST_PID=$!
    echo "Rust PID: $RUST_PID"
    sleep 3

    if ! lsof -i :9000 > /dev/null 2>&1; then
        echo "❌ 启动失败"
        cat /tmp/rust-room-test.log
        exit 1
    fi

    echo -e "${GREEN}✅ Rust 服务已启动${NC}"
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}测试 1: 创建房间${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 创建房间 JSON
CREATE_ROOM='{
  "type": "CreateRoom",
  "room_id": "test-room-123",
  "config": {
    "gravity": -20.0,
    "drop_height": 10.0,
    "coin_radius": 0.5,
    "coin_height": 0.1,
    "reward_line_z": -0.5,
    "push_min_z": -8.8,
    "push_max_z": -6.0,
    "push_speed": 0.2
  }
}'

echo "发送消息:"
echo "$CREATE_ROOM" | jq .

# 计算长度并发送（需要 xxd 和 nc）
JSON_LEN=$(echo -n "$CREATE_ROOM" | wc -c | tr -d ' ')
echo ""
echo "消息长度: $JSON_LEN 字节"

# 使用 Python 发送（更可靠）
python3 << PYEOF
import socket
import struct
import json
import time

msg = $CREATE_ROOM

# 连接
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.connect(('127.0.0.1', 9000))

# 发送创建房间消息
json_bytes = json.dumps(msg).encode('utf-8')
length_prefix = struct.pack('>I', len(json_bytes))
sock.sendall(length_prefix + json_bytes)
print('✅ 创建房间消息已发送')

# 等待快照
time.sleep(1)

# 接收快照
buf = b''
while len(buf) < 4:
    chunk = sock.recv(4 - len(buf))
    if not chunk:
        break
    buf += chunk

if len(buf) == 4:
    msg_len = struct.unpack('>I', buf)[0]
    print(f'📦 收到响应，长度: {msg_len} 字节')

    # 接收消息体
    buf = b''
    while len(buf) < msg_len:
        chunk = sock.recv(msg_len - len(buf))
        if not chunk:
            break
        buf += chunk

    snapshot = json.loads(buf.decode('utf-8'))
    print('✅ 收到快照:')
    print(f'  Room ID: {snapshot["room_id"]}')
    print(f'  Tick: {snapshot["tick"]}')
    print(f'  Push Z: {snapshot["push_z"]:.2f}')
    print(f'  Coins: {len(snapshot["coins"])}')

# 发送投币消息
drop_msg = {
    "type": "PlayerDropCoin",
    "room_id": "test-room-123",
    "player_id": "test-player-1",
    "x": 2.5
}

json_bytes = json.dumps(drop_msg).encode('utf-8')
length_prefix = struct.pack('>I', len(json_bytes))
sock.sendall(length_prefix + json_bytes)
print('\n✅ 投币消息已发送 (x=2.5)')

# 等待快照
time.sleep(1)

# 接收快照
buf = b''
while len(buf) < 4:
    chunk = sock.recv(4 - len(buf))
    if not chunk:
        break
    buf += chunk

if len(buf) == 4:
    msg_len = struct.unpack('>I', buf)[0]

    buf = b''
    while len(buf) < msg_len:
        chunk = sock.recv(msg_len - len(buf))
        if not chunk:
            break
        buf += chunk

    snapshot = json.loads(buf.decode('utf-8'))
    print('✅ 收到快照（投币后）:')
    print(f'  Tick: {snapshot["tick"]}')
    print(f'  Coins: {len(snapshot["coins"])}')
    if snapshot["coins"]:
        coin = snapshot["coins"][0]
        print(f'  Coin ID: {coin["id"]}')
        print(f'  Position: ({coin["p"]["x"]:.2f}, {coin["p"]["y"]:.2f}, {coin["p"]["z"]:.2f})')

sock.close()
PYEOF

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 手动测试完成${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "查看详细日志: tail -f /tmp/rust-room-test.log"
echo ""
