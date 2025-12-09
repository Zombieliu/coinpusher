#!/usr/bin/env zsh

# 🌐 带网络模拟的性能测试
#
# 模拟真实云服务器网络条件：
# - 带宽限制（1Mbps, 5Mbps, 10Mbps）
# - 网络延迟（10ms, 50ms, 100ms）
# - 丢包率（0%, 1%, 5%）
#
# 用法:
#   ./perf-test-with-network.sh --bandwidth 5mbps --latency 20ms --loss 0%
#   ./perf-test-with-network.sh --preset china-telecom   # 电信场景
#   ./perf-test-with-network.sh --preset mobile-4g       # 移动4G
#   ./perf-test-with-network.sh --help

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 默认配置
BANDWIDTH="10mbit"
LATENCY="0ms"
LOSS="0%"
PRESET=""
RESULTS_DIR="./perf-results-network"

# 预设场景
declare -A PRESETS
PRESETS=(
    # 场景名称="带宽,延迟,丢包率,描述"
    ["local"]="1000mbit,0ms,0%,本地测试（无限制）"
    ["china-telecom-1m"]="1mbit,30ms,0.5%,电信1Mbps宽带"
    ["china-telecom-5m"]="5mbit,20ms,0.2%,电信5Mbps宽带"
    ["china-telecom-10m"]="10mbit,15ms,0.1%,电信10Mbps宽带"
    ["china-unicom-5m"]="5mbit,25ms,0.3%,联通5Mbps宽带"
    ["mobile-4g"]="20mbit,40ms,1%,移动4G网络"
    ["mobile-5g"]="100mbit,10ms,0.1%,移动5G网络"
    ["cross-region"]="10mbit,100ms,0.5%,跨地域访问"
    ["poor-network"]="2mbit,150ms,3%,弱网环境"
    # 全球化场景
    ["gfw"]="3mbit,500ms,5%,GFW场景（中国翻墙访问海外）"
    ["transpacific"]="10mbit,200ms,1%,跨太平洋（中国↔美国）"
    ["transatlantic"]="20mbit,150ms,0.5%,跨大西洋（欧洲↔美国）"
    ["south-america"]="5mbit,400ms,3%,南美洲用户"
    ["africa"]="3mbit,450ms,5%,非洲用户"
)

show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  --bandwidth <速率>    设置带宽限制 (如: 5mbit, 10mbit)"
    echo "  --latency <延迟>      设置网络延迟 (如: 20ms, 100ms)"
    echo "  --loss <丢包率>       设置丢包率 (如: 0%, 1%, 5%)"
    echo "  --preset <场景>       使用预设场景"
    echo "  --help               显示帮助"
    echo ""
    echo "预设场景:"
    for preset in ${(k)PRESETS}; do
        IFS=',' read -r bw lat loss desc <<< "${PRESETS[$preset]}"
        printf "  %-25s %s\n" "$preset" "$desc (带宽:$bw 延迟:$lat 丢包:$loss)"
    done
    echo ""
    echo "示例:"
    echo "  $0 --preset china-telecom-5m"
    echo "  $0 --bandwidth 5mbit --latency 20ms --loss 0.5%"
}

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --bandwidth)
            BANDWIDTH="$2"
            shift 2
            ;;
        --latency)
            LATENCY="$2"
            shift 2
            ;;
        --loss)
            LOSS="$2"
            shift 2
            ;;
        --preset)
            PRESET="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 应用预设
if [ -n "$PRESET" ]; then
    if [[ -v "PRESETS[$PRESET]" ]]; then
        IFS=',' read -r BANDWIDTH LATENCY LOSS DESC <<< "${PRESETS[$PRESET]}"
        echo -e "${CYAN}📡 使用预设场景: $PRESET${NC}"
        echo -e "${CYAN}   $DESC${NC}"
    else
        echo -e "${RED}❌ 未知预设: $PRESET${NC}"
        echo "可用预设: ${(k)PRESETS}"
        exit 1
    fi
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}🌐 带网络模拟的性能测试${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}网络条件:${NC}"
echo -e "  带宽限制: ${YELLOW}$BANDWIDTH${NC}"
echo -e "  网络延迟: ${YELLOW}$LATENCY${NC}"
echo -e "  丢包率:   ${YELLOW}$LOSS${NC}"
echo ""

# 检查依赖
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ 未安装 Docker${NC}"
    exit 1
fi

# 创建结果目录
mkdir -p "$RESULTS_DIR"

# 启动容器
echo -e "${BLUE}🚀 启动测试容器...${NC}"
docker run -d \
    --name room-service-nettest \
    --cpus=4.0 \
    --memory=8g \
    --cap-add=NET_ADMIN \
    -p 9020:9000 \
    -e RUST_LOG=info \
    -e ROOM_SERVICE_ADDR=0.0.0.0:9000 \
    -e TICK_RATE=30 \
    room-service:latest 2>/dev/null || {
        echo -e "${YELLOW}⚠️  容器已存在或镜像未构建，尝试重新构建...${NC}"
        docker stop room-service-nettest 2>/dev/null || true
        docker rm room-service-nettest 2>/dev/null || true

        echo -e "${BLUE}🔨 构建 Docker 镜像...${NC}"
        docker build -t room-service:latest . || {
            echo -e "${RED}❌ 构建失败${NC}"
            exit 1
        }

        docker run -d \
            --name room-service-nettest \
            --cpus=4.0 \
            --memory=8g \
            --cap-add=NET_ADMIN \
            -p 9020:9000 \
            -e RUST_LOG=info \
            -e ROOM_SERVICE_ADDR=0.0.0.0:9000 \
            -e TICK_RATE=30 \
            room-service:latest
    }

sleep 3

# 检查容器状态
if ! docker ps | grep -q room-service-nettest; then
    echo -e "${RED}❌ 容器启动失败${NC}"
    docker logs room-service-nettest
    docker rm -f room-service-nettest 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ 容器已启动${NC}"
echo ""

# 应用网络限制
echo -e "${BLUE}🌐 配置网络限制...${NC}"

# 清除现有规则
docker exec room-service-nettest tc qdisc del dev eth0 root 2>/dev/null || true

# 添加网络限制
docker exec room-service-nettest tc qdisc add dev eth0 root handle 1: htb default 12
docker exec room-service-nettest tc class add dev eth0 parent 1: classid 1:1 htb rate $BANDWIDTH
docker exec room-service-nettest tc class add dev eth0 parent 1:1 classid 1:12 htb rate $BANDWIDTH

# 添加延迟和丢包
if [ "$LATENCY" != "0ms" ] || [ "$LOSS" != "0%" ]; then
    docker exec room-service-nettest tc qdisc add dev eth0 parent 1:12 handle 10: netem delay $LATENCY loss $LOSS
fi

echo -e "${GREEN}✅ 网络限制已应用${NC}"
echo ""

# 验证网络配置
echo -e "${BLUE}📊 当前网络配置:${NC}"
docker exec room-service-nettest tc qdisc show dev eth0
echo ""

# 运行压力测试
echo -e "${BLUE}🔥 开始压力测试...${NC}"
echo ""

TEST_NAME="${PRESET:-custom}"
OUTPUT_FILE="$RESULTS_DIR/${TEST_NAME}_$(date +%Y%m%d_%H%M%S).json"

python3 << PYEOF
import socket
import struct
import json
import time
import threading

HOST = '127.0.0.1'
PORT = 9020
ROOM_COUNT = 50
COINS_PER_ROOM = 80
DROP_INTERVAL = 0.05

stats = {
    'test_name': '$TEST_NAME',
    'bandwidth': '$BANDWIDTH',
    'latency': '$LATENCY',
    'loss': '$LOSS',
    'messages_sent': 0,
    'messages_received': 0,
    'errors': 0,
    'timeouts': 0,
    'start_time': None,
    'snapshots': [],
    'latencies': [],
    'connection_times': []
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
        sock.settimeout(5.0)  # 5秒超时
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
    except socket.timeout:
        stats['timeouts'] += 1
        return None
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
        connect_start = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((HOST, PORT))
        connect_time = (time.time() - connect_start) * 1000
        stats['connection_times'].append(connect_time)

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
        stats['errors'] += 1

# 主测试
stats['start_time'] = time.time()

threads = []
for i in range(ROOM_COUNT):
    room_id = f'nettest-room-{i}'
    t = threading.Thread(target=stress_test_room, args=(room_id, COINS_PER_ROOM))
    t.start()
    threads.append(t)
    time.sleep(0.3)

for t in threads:
    t.join()

# 统计
elapsed = time.time() - stats['start_time']
msg_per_sec = stats['messages_sent'] / elapsed if elapsed > 0 else 0

print('')
print('━' * 80)
print(f'📊 网络模拟性能测试报告')
print('━' * 80)
print(f'  测试场景: $TEST_NAME')
print(f'  网络条件: 带宽=$BANDWIDTH 延迟=$LATENCY 丢包=$LOSS')
print(f'  运行时间: {elapsed:.2f}s')
print(f'  房间数量: {ROOM_COUNT}')
print(f'  总硬币数: {ROOM_COUNT * COINS_PER_ROOM}')
print(f'  发送消息: {stats["messages_sent"]}')
print(f'  接收消息: {stats["messages_received"]}')
print(f'  错误次数: {stats["errors"]}')
print(f'  超时次数: {stats["timeouts"]}')
print(f'  消息速率: {msg_per_sec:.1f} msg/s')

if stats['latencies']:
    avg_lat = sum(stats['latencies']) / len(stats['latencies'])
    p50_lat = sorted(stats['latencies'])[int(len(stats['latencies']) * 0.50)]
    p95_lat = sorted(stats['latencies'])[int(len(stats['latencies']) * 0.95)]
    p99_lat = sorted(stats['latencies'])[int(len(stats['latencies']) * 0.99)]
    print(f'  平均延迟: {avg_lat:.2f}ms')
    print(f'  P50 延迟: {p50_lat:.2f}ms')
    print(f'  P95 延迟: {p95_lat:.2f}ms')
    print(f'  P99 延迟: {p99_lat:.2f}ms')

if stats['connection_times']:
    avg_conn = sum(stats['connection_times']) / len(stats['connection_times'])
    print(f'  平均连接时间: {avg_conn:.2f}ms')

if stats['snapshots']:
    snapshot_hz = len(stats['snapshots']) / elapsed if elapsed > 0 else 0
    print(f'  快照频率: {snapshot_hz:.1f} Hz')

timeout_rate = (stats['timeouts'] / stats['messages_sent'] * 100) if stats['messages_sent'] > 0 else 0
error_rate = (stats['errors'] / stats['messages_sent'] * 100) if stats['messages_sent'] > 0 else 0
print(f'  超时率: {timeout_rate:.2f}%')
print(f'  错误率: {error_rate:.2f}%')

print('━' * 80)

# 保存结果
with open('$OUTPUT_FILE', 'w') as f:
    json.dump({
        'test_name': stats['test_name'],
        'network': {
            'bandwidth': '$BANDWIDTH',
            'latency': '$LATENCY',
            'loss': '$LOSS'
        },
        'metrics': {
            'elapsed': elapsed,
            'room_count': ROOM_COUNT,
            'total_coins': ROOM_COUNT * COINS_PER_ROOM,
            'messages_sent': stats['messages_sent'],
            'messages_received': stats['messages_received'],
            'errors': stats['errors'],
            'timeouts': stats['timeouts'],
            'msg_per_sec': msg_per_sec,
            'avg_latency': sum(stats['latencies']) / len(stats['latencies']) if stats['latencies'] else 0,
            'p50_latency': sorted(stats['latencies'])[int(len(stats['latencies']) * 0.50)] if stats['latencies'] else 0,
            'p95_latency': sorted(stats['latencies'])[int(len(stats['latencies']) * 0.95)] if stats['latencies'] else 0,
            'p99_latency': sorted(stats['latencies'])[int(len(stats['latencies']) * 0.99)] if stats['latencies'] else 0,
            'avg_connection_time': sum(stats['connection_times']) / len(stats['connection_times']) if stats['connection_times'] else 0,
            'timeout_rate': timeout_rate,
            'error_rate': error_rate
        }
    }, f, indent=2)

print(f'\\n✅ 结果已保存: $OUTPUT_FILE')
PYEOF

echo ""
echo -e "${YELLOW}🧹 清理容器...${NC}"
docker stop room-service-nettest >/dev/null 2>&1
docker rm room-service-nettest >/dev/null 2>&1

echo ""
echo -e "${GREEN}🎉 测试完成！${NC}"
echo -e "${BLUE}📁 结果文件: $OUTPUT_FILE${NC}"
echo ""
