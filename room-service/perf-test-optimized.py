#!/usr/bin/env python3
"""
性能测试客户端 - 支持优化后的协议
- MessagePack 序列化
- DeltaSnapshot 增量更新
- 新的网络格式（1字节格式标志 + 4字节长度 + 数据）
"""

import socket
import struct
import json
import time
import threading
import sys
from collections import defaultdict

try:
    import msgpack
except ImportError:
    print("❌ 需要安装 msgpack: pip3 install msgpack")
    sys.exit(1)

HOST = '127.0.0.1'
PORT = 9000
ROOM_COUNT = 50
COINS_PER_ROOM = 80
DROP_INTERVAL = 0.05

stats = {
    'messages_sent': 0,
    'messages_received': 0,
    'errors': 0,
    'timeouts': 0,
    'bytes_sent': 0,
    'bytes_received': 0,
    'start_time': None,
    'snapshots_full': 0,
    'snapshots_delta': 0,
    'latencies': [],
    'connection_times': [],
    'snapshot_sizes': []  # 用于记录快照大小
}

# 每个房间的硬币状态（用于应用增量更新）
room_coins = defaultdict(dict)

def send_message(sock, msg):
    """发送消息（支持 JSON 和 MessagePack）"""
    try:
        start = time.time()

        # 使用 MessagePack 编码
        data = msgpack.packb(msg)

        # 新协议格式：1字节格式标志(1=MessagePack) + 4字节长度 + 数据
        format_byte = b'\x01'  # 1 = MessagePack
        length_prefix = struct.pack('>I', len(data))

        full_message = format_byte + length_prefix + data
        sock.sendall(full_message)

        latency = (time.time() - start) * 1000
        stats['latencies'].append(latency)
        stats['messages_sent'] += 1
        stats['bytes_sent'] += len(full_message)

        return True
    except Exception as e:
        stats['errors'] += 1
        print(f"❌ 发送消息失败: {e}")
        return False

def receive_message(sock):
    """接收消息（支持新协议格式）"""
    try:
        sock.settimeout(5.0)

        # 读取格式标志（1字节）
        format_byte = sock.recv(1)
        if not format_byte or len(format_byte) != 1:
            return None

        format_flag = format_byte[0]

        # 读取长度前缀（4字节）
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
        stats['bytes_received'] += 1 + 4 + msg_len
        stats['snapshot_sizes'].append(1 + 4 + msg_len)

        # 根据格式标志解码
        if format_flag == 0:  # JSON
            return json.loads(buf.decode('utf-8'))
        elif format_flag == 1:  # MessagePack
            return msgpack.unpackb(buf, raw=False)
        else:
            print(f"❌ 未知格式标志: {format_flag}")
            return None

    except socket.timeout:
        stats['timeouts'] += 1
        return None
    except Exception as e:
        stats['errors'] += 1
        print(f"❌ 接收消息失败: {e}")
        return None

def apply_delta_snapshot(room_id, delta_msg):
    """应用增量快照到房间状态"""
    coins = room_coins[room_id]

    # 添加新硬币
    if 'added' in delta_msg:
        for coin in delta_msg['added']:
            coins[coin['id']] = coin

    # 更新已有硬币
    if 'updated' in delta_msg:
        for coin in delta_msg['updated']:
            coins[coin['id']] = coin

    # 移除硬币
    if 'removed' in delta_msg:
        for coin_id in delta_msg['removed']:
            coins.pop(coin_id, None)

    return len(coins)

def receiver_thread(sock, room_id):
    """接收线程 - 处理完整快照和增量快照"""
    while True:
        msg = receive_message(sock)
        if msg is None:
            break

        msg_type = msg.get('type')

        if msg.get('room_id') != room_id:
            continue

        if msg_type == 'Snapshot':
            # 完整快照
            stats['snapshots_full'] += 1
            # 更新房间硬币状态
            room_coins[room_id] = {coin['id']: coin for coin in msg.get('coins', [])}

        elif msg_type == 'DeltaSnapshot':
            # 增量快照
            stats['snapshots_delta'] += 1
            apply_delta_snapshot(room_id, msg)

def stress_test_room(room_id, coin_count):
    """单个房间的压力测试"""
    try:
        connect_start = time.time()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((HOST, PORT))
        connect_time = (time.time() - connect_start) * 1000
        stats['connection_times'].append(connect_time)

        # 启动接收线程
        receiver = threading.Thread(target=receiver_thread, args=(sock, room_id), daemon=True)
        receiver.start()

        # 创建房间
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
                "push_speed": 1.5,
                "snapshot_rate": 30.0  # 30 Hz
            }
        }
        send_message(sock, create_msg)
        time.sleep(0.3)

        # 投币
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

        # 等待接收快照
        time.sleep(5)
        sock.close()

    except Exception as e:
        print(f'❌ 房间 {room_id} 测试失败: {e}')
        stats['errors'] += 1

def main():
    """主测试流程"""
    print("🚀 开始性能测试（优化后协议）")
    print(f"📊 配置: {ROOM_COUNT} 房间 × {COINS_PER_ROOM} 硬币")
    print("")

    stats['start_time'] = time.time()

    # 创建并启动所有房间测试线程
    threads = []
    for i in range(ROOM_COUNT):
        room_id = f'opttest-room-{i}'
        t = threading.Thread(target=stress_test_room, args=(room_id, COINS_PER_ROOM))
        t.start()
        threads.append(t)
        time.sleep(0.3)

    # 等待所有线程完成
    for t in threads:
        t.join()

    # 计算统计数据
    elapsed = time.time() - stats['start_time']
    msg_per_sec = stats['messages_sent'] / elapsed if elapsed > 0 else 0

    # 计算延迟统计
    latencies = sorted(stats['latencies'])
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    p50_latency = latencies[len(latencies) // 2] if latencies else 0
    p95_latency = latencies[int(len(latencies) * 0.95)] if latencies else 0
    p99_latency = latencies[int(len(latencies) * 0.99)] if latencies else 0

    # 计算连接时间
    avg_conn = sum(stats['connection_times']) / len(stats['connection_times']) if stats['connection_times'] else 0

    # 计算快照大小
    avg_snapshot_size = sum(stats['snapshot_sizes']) / len(stats['snapshot_sizes']) if stats['snapshot_sizes'] else 0

    # 计算接收率
    receive_rate = (stats['messages_received'] / stats['messages_sent'] * 100) if stats['messages_sent'] > 0 else 0

    # 输出结果
    print("\n" + "="*60)
    print("📊 测试结果汇总")
    print("="*60)
    print(f"⏱️  总耗时: {elapsed:.2f}s")
    print(f"🏠 房间数量: {ROOM_COUNT}")
    print(f"🪙 总硬币数: {ROOM_COUNT * COINS_PER_ROOM}")
    print("")
    print(f"📤 发送消息: {stats['messages_sent']}")
    print(f"📥 接收消息: {stats['messages_received']}")
    print(f"📊 接收率: {receive_rate:.1f}%")
    print(f"❌ 错误数: {stats['errors']}")
    print(f"⏰ 超时数: {stats['timeouts']}")
    print("")
    print(f"📦 发送字节: {stats['bytes_sent']:,} ({stats['bytes_sent']/1024:.2f} KB)")
    print(f"📦 接收字节: {stats['bytes_received']:,} ({stats['bytes_received']/1024:.2f} KB)")
    print(f"📏 平均快照大小: {avg_snapshot_size:.0f} bytes")
    print("")
    print(f"📸 完整快照: {stats['snapshots_full']}")
    print(f"⚡ 增量快照: {stats['snapshots_delta']}")
    print(f"📊 增量比例: {stats['snapshots_delta'] / (stats['snapshots_full'] + stats['snapshots_delta']) * 100:.1f}%")
    print("")
    print(f"⚡ 吞吐量: {msg_per_sec:.2f} msg/s")
    print(f"⏱️  平均延迟: {avg_latency:.2f}ms")
    print(f"⏱️  P50 延迟: {p50_latency:.2f}ms")
    print(f"⏱️  P95 延迟: {p95_latency:.2f}ms")
    print(f"⏱️  P99 延迟: {p99_latency:.2f}ms")
    print(f"🔌 平均连接时间: {avg_conn:.2f}ms")
    print("="*60)

    # 保存 JSON 结果
    result = {
        "test_name": "optimized",
        "protocol": "MessagePack + DeltaSnapshot",
        "metrics": {
            "elapsed": elapsed,
            "room_count": ROOM_COUNT,
            "total_coins": ROOM_COUNT * COINS_PER_ROOM,
            "messages_sent": stats['messages_sent'],
            "messages_received": stats['messages_received'],
            "receive_rate": receive_rate,
            "bytes_sent": stats['bytes_sent'],
            "bytes_received": stats['bytes_received'],
            "avg_snapshot_size": avg_snapshot_size,
            "snapshots_full": stats['snapshots_full'],
            "snapshots_delta": stats['snapshots_delta'],
            "errors": stats['errors'],
            "timeouts": stats['timeouts'],
            "msg_per_sec": msg_per_sec,
            "avg_latency": avg_latency,
            "p50_latency": p50_latency,
            "p95_latency": p95_latency,
            "p99_latency": p99_latency,
            "avg_connection_time": avg_conn
        }
    }

    output_file = f"perf-results/optimized_{time.strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\n💾 结果已保存到: {output_file}")

if __name__ == '__main__':
    main()
