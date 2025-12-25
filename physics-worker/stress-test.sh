#!/bin/bash

# 🔥 Rust Room Service 压力测试
#
# 测试场景：
# 1. 单房间 + 200 硬币
# 2. 10 个房间并发运行
# 3. 持续投币压力测试

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🔥 Rust Room Service 压力测试${NC}"
echo ""

# 检查 Rust 服务是否运行
if ! lsof -i :9000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Rust Room Service 未运行，正在启动...${NC}"
    RUST_LOG=info ROOM_SERVICE_ADDR=127.0.0.1:9000 TICK_RATE=30 \
    cargo run --release > /tmp/rust-stress-test.log 2>&1 &

    RUST_PID=$!
    echo "Rust PID: $RUST_PID"
    sleep 3

    if ! lsof -i :9000 > /dev/null 2>&1; then
        echo -e "${RED}❌ 启动失败${NC}"
        cat /tmp/rust-stress-test.log
        exit 1
    fi

    echo -e "${GREEN}✅ Rust 服务已启动${NC}"
fi

echo ""

# Python 压力测试脚本
python3 << 'PYEOF'
import socket
import struct
import json
import time
import threading
from datetime import datetime

# 配置
HOST = '127.0.0.1'
PORT = 9000
ROOM_COUNT = 5  # 房间数量
COINS_PER_ROOM = 100  # 每个房间的硬币数
DROP_INTERVAL = 0.1  # 投币间隔（秒）

# 统计数据
stats = {
    'messages_sent': 0,
    'messages_received': 0,
    'errors': 0,
    'start_time': None,
    'snapshots': []
}

def send_message(sock, msg):
    """发送 length-prefix + JSON 消息"""
    try:
        json_bytes = json.dumps(msg).encode('utf-8')
        length_prefix = struct.pack('>I', len(json_bytes))
        sock.sendall(length_prefix + json_bytes)
        stats['messages_sent'] += 1
        return True
    except Exception as e:
        print(f'❌ 发送失败: {e}')
        stats['errors'] += 1
        return False

def receive_message(sock):
    """接收 length-prefix + JSON 消息"""
    try:
        # 读取长度
        buf = b''
        while len(buf) < 4:
            chunk = sock.recv(4 - len(buf))
            if not chunk:
                return None
            buf += chunk

        msg_len = struct.unpack('>I', buf)[0]

        # 读取消息体
        buf = b''
        while len(buf) < msg_len:
            chunk = sock.recv(msg_len - len(buf))
            if not chunk:
                return None
            buf += chunk

        stats['messages_received'] += 1
        return json.loads(buf.decode('utf-8'))
    except Exception as e:
        stats['errors'] += 1
        return None

def receiver_thread(sock, room_id):
    """接收快照的线程"""
    while True:
        msg = receive_message(sock)
        if msg is None:
            break

        if msg.get('type') == 'Snapshot' and msg.get('room_id') == room_id:
            stats['snapshots'].append({
                'room_id': room_id,
                'tick': msg['tick'],
                'coins': len(msg['coins']),
                'time': time.time()
            })

def stress_test_room(room_id, coin_count):
    """单个房间的压力测试"""
    print(f'🏠 测试房间: {room_id} ({coin_count} 硬币)')

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((HOST, PORT))

    # 启动接收线程
    receiver = threading.Thread(target=receiver_thread, args=(sock, room_id), daemon=True)
    receiver.start()

    # 1. 创建房间
    create_msg = {
        "type": "CreateRoom",
        "room_id": room_id,
        "config": {
            "gravity": -20.0,
            "drop_height": 10.0,
            "coin_radius": 0.5,
            "coin_height": 0.1,
            "reward_line_z": -0.5,
            "push_min_z": -8.8,
            "push_max_z": -6.0,
            "push_speed": 1.5
        }
    }
    if not send_message(sock, create_msg):
        return

    time.sleep(0.5)  # 等待房间创建

    # 2. 投币
    for i in range(coin_count):
        x = (i % 10) - 5.0  # -5 到 4 之间分布
        drop_msg = {
            "type": "PlayerDropCoin",
            "room_id": room_id,
            "player_id": f"player{i % 4}",
            "x": x
        }
        send_message(sock, drop_msg)
        time.sleep(DROP_INTERVAL)

    # 3. 持续运行 10 秒观察
    time.sleep(10)

    sock.close()

def print_stats():
    """打印统计信息"""
    elapsed = time.time() - stats['start_time']
    msg_per_sec = stats['messages_sent'] / elapsed if elapsed > 0 else 0
    snapshot_count = len(stats['snapshots'])

    print('')
    print(f'{"━" * 60}')
    print(f'📊 压力测试统计')
    print(f'{"━" * 60}')
    print(f'  运行时间: {elapsed:.2f}s')
    print(f'  发送消息: {stats["messages_sent"]}')
    print(f'  接收消息: {stats["messages_received"]}')
    print(f'  快照数量: {snapshot_count}')
    print(f'  错误次数: {stats["errors"]}')
    print(f'  消息速率: {msg_per_sec:.1f} msg/s')
    print('')

    if stats['snapshots']:
        # 分析快照数据
        recent_snapshots = stats['snapshots'][-10:]
        avg_coins = sum(s['coins'] for s in recent_snapshots) / len(recent_snapshots)
        print(f'  最近快照硬币数: {avg_coins:.0f} (平均)')

        # 计算快照频率
        if len(stats['snapshots']) > 1:
            times = [s['time'] for s in stats['snapshots']]
            intervals = [times[i+1] - times[i] for i in range(len(times)-1)]
            avg_interval = sum(intervals) / len(intervals)
            snapshot_hz = 1.0 / avg_interval if avg_interval > 0 else 0
            print(f'  快照频率: {snapshot_hz:.1f} Hz')

    print(f'{"━" * 60}')

# 主测试流程
stats['start_time'] = time.time()

print(f'{"━" * 60}')
print(f'🔥 压力测试配置')
print(f'{"━" * 60}')
print(f'  房间数量: {ROOM_COUNT}')
print(f'  每房间硬币数: {COINS_PER_ROOM}')
print(f'  总硬币数: {ROOM_COUNT * COINS_PER_ROOM}')
print(f'  投币间隔: {DROP_INTERVAL}s')
print(f'{"━" * 60}')
print('')

# 并发创建多个房间
threads = []
for i in range(ROOM_COUNT):
    room_id = f'stress-room-{i}'
    t = threading.Thread(target=stress_test_room, args=(room_id, COINS_PER_ROOM))
    t.start()
    threads.append(t)
    time.sleep(0.5)  # 错开启动时间

# 等待所有测试完成
for t in threads:
    t.join()

# 打印统计
print_stats()

# 成功
print('✅ 压力测试完成')
print('')
print(f'查看详细日志: tail -f /tmp/rust-stress-test.log')
PYEOF

echo ""
echo -e "${GREEN}🎉 压力测试执行完成${NC}"
echo ""
