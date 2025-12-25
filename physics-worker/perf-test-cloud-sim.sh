#!/usr/bin/env zsh

# 🌩️ 云服务器配置模拟性能测试
#
# 用法:
#   ./perf-test-cloud-sim.sh 4c8g    # 测试 4核8G 配置
#   ./perf-test-cloud-sim.sh 8c16g   # 测试 8核16G 配置
#   ./perf-test-cloud-sim.sh 2c4g    # 测试 2核4G 配置
#   ./perf-test-cloud-sim.sh all     # 测试所有配置

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PROFILE="${1:-4c8g}"
RESULTS_DIR="./perf-results"

# 配置映射函数 (兼容 zsh 和旧版 bash)
get_config() {
    case "$1" in
        2c4g)  echo "2核4G,9003,50,50" ;;
        4c8g)  echo "4核8G,9001,100,100" ;;
        8c16g) echo "8核16G,9002,200,150" ;;
        *)     echo "" ;;
    esac
}

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🌩️  云服务器配置模拟性能测试${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 检查 Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 未安装 Docker${NC}"
    echo "请安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ 未安装 docker-compose${NC}"
    echo "请安装 docker-compose"
    exit 1
fi

# 创建结果目录
mkdir -p "$RESULTS_DIR"

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}🧹 清理资源...${NC}"
    docker-compose --profile "$1" down 2>/dev/null || true
}

# 监控容器资源
monitor_container() {
    local container=$1
    local output_file=$2
    local duration=$3

    echo "timestamp,cpu_percent,memory_mb,memory_percent" > "$output_file"

    for i in $(seq 1 $duration); do
        stats=$(docker stats "$container" --no-stream --format "{{.CPUPerc}},{{.MemUsage}}" 2>/dev/null || echo "0%,0MiB / 0MiB")

        # 解析 CPU 百分比
        cpu=$(echo "$stats" | cut -d',' -f1 | sed 's/%//')

        # 解析内存使用
        mem_usage=$(echo "$stats" | cut -d',' -f2 | awk '{print $1}' | sed 's/MiB//')
        mem_total=$(echo "$stats" | cut -d',' -f2 | awk '{print $3}' | sed 's/MiB//')

        if [ -n "$mem_total" ] && [ "$mem_total" != "0" ]; then
            mem_percent=$(awk "BEGIN {printf \"%.2f\", ($mem_usage/$mem_total)*100}")
        else
            mem_percent="0"
        fi

        echo "$(date +%s),$cpu,$mem_usage,$mem_percent" >> "$output_file"
        sleep 1
    done
}

# 运行单个配置测试
run_test() {
    local profile=$1
    local config_info=$(get_config "$profile")

    if [ -z "$config_info" ]; then
        echo -e "${RED}❌ 未知配置: $profile${NC}"
        echo "可用配置: 2c4g 4c8g 8c16g"
        exit 1
    fi

    IFS=',' read -r desc port room_count coins_per_room <<< "$config_info"

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📊 测试配置: $desc${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    # 清理旧容器
    cleanup "$profile"

    # 构建并启动容器
    echo -e "${BLUE}🔨 构建 Docker 镜像...${NC}"
    docker-compose build

    echo -e "${BLUE}🚀 启动容器 (配置: $desc)...${NC}"
    docker-compose --profile "$profile" up -d

    # 等待服务启动
    echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
    sleep 5

    container_name="room-service-$profile"

    # 检查容器状态
    if ! docker ps | grep -q "$container_name"; then
        echo -e "${RED}❌ 容器启动失败${NC}"
        docker-compose --profile "$profile" logs
        cleanup "$profile"
        exit 1
    fi

    echo -e "${GREEN}✅ 容器已启动${NC}"
    docker ps | grep "$container_name"
    echo ""

    # 开始监控
    monitor_file="$RESULTS_DIR/${profile}_monitor.csv"
    test_duration=30

    echo -e "${BLUE}📈 开始监控容器资源 (${test_duration}秒)...${NC}"
    monitor_container "$container_name" "$monitor_file" $test_duration &
    MONITOR_PID=$!

    # 等待几秒让监控稳定
    sleep 3

    # 运行压力测试
    echo -e "${BLUE}🔥 开始压力测试...${NC}"
    echo ""

    python3 << PYEOF
import socket
import struct
import json
import time
import threading
from datetime import datetime

HOST = '127.0.0.1'
PORT = $port
ROOM_COUNT = $room_count
COINS_PER_ROOM = $coins_per_room
DROP_INTERVAL = 0.05

stats = {
    'messages_sent': 0,
    'messages_received': 0,
    'errors': 0,
    'start_time': None,
    'snapshots': [],
    'latencies': []
}

def send_message(sock, msg):
    try:
        start = time.time()
        json_bytes = json.dumps(msg).encode('utf-8')
        length_prefix = struct.pack('>I', len(json_bytes))
        sock.sendall(length_prefix + json_bytes)
        latency = (time.time() - start) * 1000
        stats['latencies'].append(latency)
        stats['messages_sent'] += 1
        return True
    except Exception as e:
        stats['errors'] += 1
        return False

def receive_message(sock):
    try:
        buf = b''
        while len(buf) < 4:
            chunk = sock.recv(4 - len(buf))
            if not chunk:
                return None
            buf += chunk
        msg_len = struct.unpack('>I', buf)[0]

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
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((HOST, PORT))

        receiver = threading.Thread(target=receiver_thread, args=(sock, room_id), daemon=True)
        receiver.start()

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
        send_message(sock, create_msg)
        time.sleep(0.3)

        for i in range(coin_count):
            x = (i % 10) - 5.0
            drop_msg = {
                "type": "PlayerDropCoin",
                "room_id": room_id,
                "player_id": f"player{i % 4}",
                "x": x
            }
            send_message(sock, drop_msg)
            time.sleep(DROP_INTERVAL)

        time.sleep(5)
        sock.close()
    except Exception as e:
        print(f'房间 {room_id} 测试失败: {e}')

# 主测试
stats['start_time'] = time.time()

threads = []
for i in range(ROOM_COUNT):
    room_id = f'perf-room-{i}'
    t = threading.Thread(target=stress_test_room, args=(room_id, COINS_PER_ROOM))
    t.start()
    threads.append(t)
    time.sleep(0.3)

for t in threads:
    t.join()

# 统计
elapsed = time.time() - stats['start_time']
msg_per_sec = stats['messages_sent'] / elapsed if elapsed > 0 else 0
snapshot_count = len(stats['snapshots'])

print('')
print('━' * 70)
print(f'📊 性能测试报告 - $desc')
print('━' * 70)
print(f'  配置: $desc')
print(f'  运行时间: {elapsed:.2f}s')
print(f'  房间数量: {ROOM_COUNT}')
print(f'  总硬币数: {ROOM_COUNT * COINS_PER_ROOM}')
print(f'  发送消息: {stats["messages_sent"]}')
print(f'  接收消息: {stats["messages_received"]}')
print(f'  快照数量: {snapshot_count}')
print(f'  错误次数: {stats["errors"]}')
print(f'  消息速率: {msg_per_sec:.1f} msg/s')

if stats['latencies']:
    avg_latency = sum(stats['latencies']) / len(stats['latencies'])
    p95_latency = sorted(stats['latencies'])[int(len(stats['latencies']) * 0.95)]
    p99_latency = sorted(stats['latencies'])[int(len(stats['latencies']) * 0.99)]
    print(f'  平均延迟: {avg_latency:.2f}ms')
    print(f'  P95 延迟: {p95_latency:.2f}ms')
    print(f'  P99 延迟: {p99_latency:.2f}ms')

if stats['snapshots']:
    recent = stats['snapshots'][-20:]
    avg_coins = sum(s['coins'] for s in recent) / len(recent)
    print(f'  快照硬币数: {avg_coins:.0f} (平均)')

    if len(stats['snapshots']) > 1:
        times = [s['time'] for s in stats['snapshots']]
        intervals = [times[i+1] - times[i] for i in range(len(times)-1) if times[i+1] > times[i]]
        if intervals:
            avg_interval = sum(intervals) / len(intervals)
            snapshot_hz = 1.0 / avg_interval if avg_interval > 0 else 0
            print(f'  快照频率: {snapshot_hz:.1f} Hz')

print('━' * 70)

# 保存结果到文件
with open('$RESULTS_DIR/${profile}_results.json', 'w') as f:
    json.dump({
        'profile': '$profile',
        'config': '$desc',
        'elapsed': elapsed,
        'room_count': ROOM_COUNT,
        'coins_per_room': COINS_PER_ROOM,
        'total_coins': ROOM_COUNT * COINS_PER_ROOM,
        'messages_sent': stats['messages_sent'],
        'messages_received': stats['messages_received'],
        'snapshots': snapshot_count,
        'errors': stats['errors'],
        'msg_per_sec': msg_per_sec,
        'avg_latency': sum(stats['latencies']) / len(stats['latencies']) if stats['latencies'] else 0,
        'p95_latency': sorted(stats['latencies'])[int(len(stats['latencies']) * 0.95)] if stats['latencies'] else 0,
        'p99_latency': sorted(stats['latencies'])[int(len(stats['latencies']) * 0.99)] if stats['latencies'] else 0,
    }, f, indent=2)

PYEOF

    # 等待监控结束
    wait $MONITOR_PID 2>/dev/null || true

    echo ""
    echo -e "${GREEN}✅ 测试完成: $desc${NC}"
    echo -e "${BLUE}📁 结果已保存到: $RESULTS_DIR/${profile}_*.{json,csv}${NC}"
    echo ""

    # 显示容器日志摘要
    echo -e "${BLUE}📋 容器日志 (最后20行):${NC}"
    docker-compose --profile "$profile" logs --tail=20

    # 清理
    cleanup "$profile"
}

# 生成对比报告
generate_report() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}📊 性能对比报告${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    python3 << 'PYEOF'
import json
import glob
import os

result_files = glob.glob('./perf-results/*_results.json')
if not result_files:
    print("未找到测试结果")
    exit(0)

results = []
for f in result_files:
    with open(f) as fp:
        results.append(json.load(fp))

results.sort(key=lambda x: x.get('total_coins', 0))

print("\n{:<12} {:<12} {:<12} {:<12} {:<12} {:<12}".format(
    "配置", "总硬币", "消息/秒", "平均延迟", "P95延迟", "错误率"
))
print("-" * 80)

for r in results:
    error_rate = (r['errors'] / r['messages_sent'] * 100) if r['messages_sent'] > 0 else 0
    print("{:<12} {:<12} {:<12.1f} {:<12.2f}ms {:<12.2f}ms {:<12.2f}%".format(
        r['config'],
        r['total_coins'],
        r['msg_per_sec'],
        r['avg_latency'],
        r['p95_latency'],
        error_rate
    ))

print("\n建议:")
for r in results:
    if r['p95_latency'] < 10:
        print(f"✅ {r['config']}: 性能优秀，延迟低于10ms")
    elif r['p95_latency'] < 50:
        print(f"⚠️  {r['config']}: 性能良好，但在高负载下可能有压力")
    else:
        print(f"❌ {r['config']}: 性能不足，建议升级配置或优化代码")
PYEOF

    echo ""
}

# 主流程
if [ "$PROFILE" = "all" ]; then
    echo -e "${YELLOW}🔄 测试所有配置...${NC}"
    echo ""

    for profile in 2c4g 4c8g 8c16g; do
        run_test "$profile"
        echo ""
        echo -e "${YELLOW}⏸️  暂停5秒后继续...${NC}"
        sleep 5
    done

    generate_report
else
    run_test "$PROFILE"
fi

echo ""
echo -e "${GREEN}🎉 所有测试完成！${NC}"
echo -e "${BLUE}📁 结果目录: $RESULTS_DIR/${NC}"
echo ""
