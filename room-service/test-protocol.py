#!/usr/bin/env python3
"""简单测试 - 调试协议格式"""

import socket
import struct
import msgpack
import json

HOST = '127.0.0.1'
PORT = 9000

def send_msgpack(sock, msg):
    """发送 MessagePack 消息"""
    data = msgpack.packb(msg)
    format_byte = b'\x01'  # MessagePack
    length = struct.pack('>I', len(data))
    sock.sendall(format_byte + length + data)
    print(f"📤 发送: {msg}")
    print(f"   大小: {len(data)} bytes (MessagePack)")

def receive_any(sock):
    """接收并调试消息"""
    # 读取格式字节
    format_byte = sock.recv(1)
    if not format_byte:
        return None

    print(f"\n📥 格式字节: {format_byte[0]} ({'JSON' if format_byte[0] == 0 else 'MessagePack'})")

    # 读取长度
    buf = b''
    while len(buf) < 4:
        chunk = sock.recv(4 - len(buf))
        if not chunk:
            return None
        buf += chunk
    length = struct.unpack('>I', buf)[0]
    print(f"   长度: {length} bytes")

    # 读取数据
    buf = b''
    while len(buf) < length:
        chunk = sock.recv(length - len(buf))
        if not chunk:
            return None
        buf += chunk

    # 解码
    if format_byte[0] == 0:  # JSON
        msg = json.loads(buf.decode('utf-8'))
    else:  # MessagePack
        msg = msgpack.unpackb(buf, raw=False)

    print(f"   解码结果类型: {type(msg)}")
    print(f"   内容: {msg}")

    return msg

try:
    print("🔗 连接服务器...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.connect((HOST, PORT))
    sock.settimeout(5.0)
    print("✅ 连接成功!\n")

    # 发送创建房间消息
    create_msg = {
        "type": "CreateRoom",
        "room_id": "debug-room-1",
        "config": {
            "gravity": -20.0,
            "drop_height": 10.0,
            "coin_radius": 0.5,
            "coin_height": 0.1,
            "reward_line_z": -0.5,
            "push_min_z": -8.8,
            "push_max_z": -6.0,
            "push_speed": 1.5,
            "snapshot_rate": 30.0
        }
    }

    send_msgpack(sock, create_msg)

    # 接收几条消息看看格式
    print("\n" + "="*60)
    print("接收消息:")
    print("="*60)

    for i in range(5):
        try:
            msg = receive_any(sock)
            if msg is None:
                print("连接关闭")
                break
        except socket.timeout:
            print(f"\n超时（已接收 {i} 条消息）")
            break
        except Exception as e:
            print(f"\n❌ 错误: {e}")
            break

    sock.close()
    print("\n✅ 测试完成")

except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
