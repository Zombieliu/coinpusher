# 🔧 客户端适配指南

## 概述

服务器已升级到优化协议，客户端需要相应更新以支持：
1. **MessagePack** 序列化格式
2. **Delta

Snapshot** 增量更新
3. 新的网络协议格式

---

## 📦 安装依赖

### Node.js / TypeScript

```bash
npm install msgpack-lite
npm install @types/msgpack-lite --save-dev
```

### Python（测试）

```bash
pip3 install msgpack
```

---

## 🔌 网络协议适配

### 新协议格式

```
┌──────────────┬─────────────────┬────────────────────┐
│ 格式标志(1B) │  长度前缀(4B)   │   消息体(变长)      │
├──────────────┼─────────────────┼────────────────────┤
│ 0 = JSON     │  Big Endian     │   JSON 或          │
│ 1 = MsgPack  │  Uint32         │   MessagePack      │
└──────────────┴─────────────────┴────────────────────┘
```

---

## 💻 Node.js/TypeScript 实现

### 1. 消息发送

```typescript
import * as msgpack from 'msgpack-lite';

class RoomServiceClient {
    private socket: net.Socket;

    /**
     * 发送消息到服务器
     * @param message 消息对象
     * @param useMessagePack 是否使用 MessagePack（默认 true）
     */
    sendMessage(message: any, useMessagePack: boolean = true): void {
        let data: Buffer;
        let formatByte: number;

        if (useMessagePack) {
            // 使用 MessagePack 编码
            data = msgpack.encode(message);
            formatByte = 1;
        } else {
            // 使用 JSON 编码
            data = Buffer.from(JSON.stringify(message), 'utf-8');
            formatByte = 0;
        }

        // 构建完整消息
        const header = Buffer.allocUnsafe(5);
        header.writeUInt8(formatByte, 0);           // 格式标志
        header.writeUInt32BE(data.length, 1);      // 长度前缀

        // 发送
        this.socket.write(Buffer.concat([header, data]));
    }

    /**
     * 创建房间示例
     */
    createRoom(roomId: string, config: RoomConfig): void {
        this.sendMessage({
            type: 'CreateRoom',
            room_id: roomId,
            config: config
        });
    }

    /**
     * 玩家投币示例
     */
    playerDropCoin(roomId: string, playerId: string, x: number): void {
        this.sendMessage({
            type: 'PlayerDropCoin',
            room_id: roomId,
            player_id: playerId,
            x: x
        });
    }
}
```

### 2. 消息接收

```typescript
class RoomServiceClient {
    private receiveBuffer: Buffer = Buffer.allocUnsafe(0);

    /**
     * 处理接收到的数据
     */
    onData(chunk: Buffer): void {
        // 追加到缓冲区
        this.receiveBuffer = Buffer.concat([this.receiveBuffer, chunk]);

        // 循环解析消息
        while (this.tryParseMessage()) {
            // 继续解析下一条消息
        }
    }

    /**
     * 尝试解析一条完整消息
     */
    private tryParseMessage(): boolean {
        // 至少需要 5 字节（格式标志 + 长度）
        if (this.receiveBuffer.length < 5) {
            return false;
        }

        // 读取格式标志
        const formatByte = this.receiveBuffer.readUInt8(0);

        // 读取消息长度
        const messageLength = this.receiveBuffer.readUInt32BE(1);

        // 检查是否有完整消息
        if (this.receiveBuffer.length < 5 + messageLength) {
            return false; // 等待更多数据
        }

        // 提取消息体
        const messageData = this.receiveBuffer.slice(5, 5 + messageLength);

        // 移除已处理的数据
        this.receiveBuffer = this.receiveBuffer.slice(5 + messageLength);

        // 解码消息
        let message: any;
        if (formatByte === 0) {
            // JSON 格式
            message = JSON.parse(messageData.toString('utf-8'));
        } else if (formatByte === 1) {
            // MessagePack 格式
            message = msgpack.decode(messageData);
            // 转换数组格式到对象格式
            message = this.parseMessagePackMessage(message);
        } else {
            console.error(`Unknown format byte: ${formatByte}`);
            return true;
        }

        // 处理消息
        this.handleMessage(message);

        return true;
    }

    /**
     * 解析 MessagePack 数组格式到对象格式
     */
    private parseMessagePackMessage(msgArray: any): any {
        if (!Array.isArray(msgArray) || msgArray.length === 0) {
            return msgArray;
        }

        const msgType = msgArray[0];

        switch (msgType) {
            case 'Snapshot':
                return {
                    type: 'Snapshot',
                    room_id: msgArray[1],
                    tick: msgArray[2],
                    push_z: msgArray[3],
                    coins: msgArray[4],
                    events: msgArray[5] || []
                };

            case 'DeltaSnapshot':
                return {
                    type: 'DeltaSnapshot',
                    room_id: msgArray[1],
                    tick: msgArray[2],
                    push_z: msgArray[3],
                    added: msgArray[4] || [],
                    updated: msgArray[5] || [],
                    removed: msgArray[6] || [],
                    events: msgArray[7] || []
                };

            case 'NeedDeductGold':
                return {
                    type: 'NeedDeductGold',
                    room_id: msgArray[1],
                    player_id: msgArray[2],
                    tx_id: msgArray[3],
                    amount: msgArray[4]
                };

            case 'RoomClosed':
                return {
                    type: 'RoomClosed',
                    room_id: msgArray[1],
                    reason: msgArray[2]
                };

            default:
                console.warn(`Unknown message type: ${msgType}`);
                return msgArray;
        }
    }
}
```

### 3. 增量更新处理

```typescript
interface CoinState {
    id: number;
    p: { x: number; y: number; z: number };
    r: { x: number; y: number; z: number; w: number };
}

class RoomStateManager {
    // 房间的硬币状态缓存
    private coinStates: Map<number, CoinState> = new Map();

    /**
     * 应用完整快照
     */
    applyFullSnapshot(snapshot: FullSnapshot): void {
        // 清空并重建
        this.coinStates.clear();
        for (const coin of snapshot.coins) {
            this.coinStates.set(coin.id, coin);
        }

        // 更新渲染
        this.updateRendering();
    }

    /**
     * 应用增量快照
     */
    applyDeltaSnapshot(delta: DeltaSnapshot): void {
        // 1. 添加新硬币
        for (const coin of delta.added || []) {
            this.coinStates.set(coin.id, coin);
        }

        // 2. 更新已有硬币
        for (const coin of delta.updated || []) {
            this.coinStates.set(coin.id, coin);
        }

        // 3. 移除硬币
        for (const coinId of delta.removed || []) {
            this.coinStates.delete(coinId);
        }

        // 更新渲染
        this.updateRendering();
    }

    /**
     * 更新游戏渲染
     */
    private updateRendering(): void {
        // 遍历所有硬币并更新显示
        for (const [coinId, coin] of this.coinStates) {
            this.updateCoinVisual(coinId, coin);
        }
    }

    private updateCoinVisual(coinId: number, state: CoinState): void {
        // TODO: 更新 Cocos Creator 节点位置和旋转
        const node = this.getCoinNode(coinId);
        if (node) {
            node.setPosition(state.p.x, state.p.y, state.p.z);
            node.setRotationFromQuaternion(
                state.r.x, state.r.y, state.r.z, state.r.w
            );
        }
    }

    private getCoinNode(coinId: number): any {
        // TODO: 从场景中获取硬币节点
        return null;
    }
}
```

### 4. 完整客户端示例

```typescript
import * as net from 'net';
import * as msgpack from 'msgpack-lite';

class RoomServiceClient {
    private socket: net.Socket;
    private receiveBuffer: Buffer = Buffer.allocUnsafe(0);
    private stateManager: RoomStateManager;

    constructor(host: string, port: number) {
        this.stateManager = new RoomStateManager();
        this.connect(host, port);
    }

    private connect(host: string, port: number): void {
        this.socket = net.createConnection({ host, port }, () => {
            console.log('✅ Connected to Room Service');
        });

        this.socket.on('data', (chunk) => this.onData(chunk));
        this.socket.on('error', (err) => console.error('Socket error:', err));
        this.socket.on('close', () => console.log('Connection closed'));
    }

    // ... (前面的 sendMessage, onData, tryParseMessage 等方法)

    /**
     * 处理接收到的消息
     */
    private handleMessage(message: any): void {
        switch (message.type) {
            case 'Snapshot':
                this.stateManager.applyFullSnapshot(message);
                break;

            case 'DeltaSnapshot':
                this.stateManager.applyDeltaSnapshot(message);
                break;

            case 'NeedDeductGold':
                this.handleDeductGold(message);
                break;

            case 'RoomClosed':
                this.handleRoomClosed(message);
                break;

            default:
                console.warn('Unknown message type:', message.type);
        }
    }

    private handleDeductGold(msg: any): void {
        console.log(`Need deduct ${msg.amount} gold from ${msg.player_id}`);
        // TODO: 调用钱包服务扣费
    }

    private handleRoomClosed(msg: any): void {
        console.log(`Room ${msg.room_id} closed: ${msg.reason}`);
        // TODO: 处理房间关闭
    }
}

// 使用示例
const client = new RoomServiceClient('127.0.0.1', 9000);

// 创建房间
client.createRoom('game-room-1', {
    gravity: -20.0,
    drop_height: 10.0,
    coin_radius: 0.5,
    coin_height: 0.1,
    reward_line_z: -0.5,
    push_min_z: -8.8,
    push_max_z: -6.0,
    push_speed: 1.5,
    snapshot_rate: 30.0  // 30 Hz
});

// 投币
client.playerDropCoin('game-room-1', 'player-123', 2.5);
```

---

## 🐍 Python 实现（测试用）

```python
import socket
import struct
import msgpack
import json

class RoomServiceClient:
    def __init__(self, host='127.0.0.1', port=9000):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.connect((host, port))
        self.coin_states = {}  # coin_id -> CoinState

    def send_message(self, message, use_msgpack=True):
        """发送消息"""
        if use_msgpack:
            data = msgpack.packb(message)
            format_byte = b'\x01'
        else:
            data = json.dumps(message).encode('utf-8')
            format_byte = b'\x00'

        length = struct.pack('>I', len(data))
        self.sock.sendall(format_byte + length + data)

    def receive_message(self):
        """接收一条消息"""
        # 读取格式标志
        format_byte = self.sock.recv(1)[0]

        # 读取长度
        length_data = self.sock.recv(4)
        length = struct.unpack('>I', length_data)[0]

        # 读取消息体
        data = b''
        while len(data) < length:
            chunk = self.sock.recv(length - len(data))
            if not chunk:
                return None
            data += chunk

        # 解码
        if format_byte == 0:
            return json.loads(data.decode('utf-8'))
        elif format_byte == 1:
            msg = msgpack.unpackb(data, raw=False)
            return self.parse_msgpack_message(msg)

    def parse_msgpack_message(self, msg_array):
        """解析 MessagePack 数组格式"""
        if not isinstance(msg_array, list):
            return msg_array

        msg_type = msg_array[0]

        if msg_type == 'Snapshot':
            return {
                'type': 'Snapshot',
                'room_id': msg_array[1],
                'tick': msg_array[2],
                'push_z': msg_array[3],
                'coins': msg_array[4],
                'events': msg_array[5] if len(msg_array) > 5 else []
            }
        elif msg_type == 'DeltaSnapshot':
            return {
                'type': 'DeltaSnapshot',
                'room_id': msg_array[1],
                'tick': msg_array[2],
                'push_z': msg_array[3],
                'added': msg_array[4] if len(msg_array) > 4 else [],
                'updated': msg_array[5] if len(msg_array) > 5 else [],
                'removed': msg_array[6] if len(msg_array) > 6 else [],
                'events': msg_array[7] if len(msg_array) > 7 else []
            }

        return msg_array

    def apply_delta_snapshot(self, delta):
        """应用增量更新"""
        # 新增
        for coin in delta.get('added', []):
            self.coin_states[coin['id']] = coin

        # 更新
        for coin in delta.get('updated', []):
            self.coin_states[coin['id']] = coin

        # 移除
        for coin_id in delta.get('removed', []):
            self.coin_states.pop(coin_id, None)

        print(f"Updated coin states: {len(self.coin_states)} coins")
```

---

## ⚠️ 重要注意事项

### 1. 数组格式处理

MessagePack 将 Rust 枚举序列化为数组：
```python
['DeltaSnapshot', room_id, tick, push_z, [...]]
```

**必须**使用 `parseMessagePackMessage` 转换为对象格式。

### 2. 完整快照定期接收

服务器每 30 次增量后发送 1 次完整快照，客户端应支持两种类型：
- `Snapshot` - 完整状态
- `DeltaSnapshot` - 增量更新

### 3. 带宽优化建议

根据网络质量动态调整 `snapshot_rate`：
```typescript
// 弱网环境
client.createRoom(roomId, {
    ...config,
    snapshot_rate: 15.0  // 降低频率
});

// 5G 网络
client.createRoom(roomId, {
    ...config,
    snapshot_rate: 60.0  // 提高流畅度
});
```

### 4. 错误处理

务必添加错误处理：
```typescript
try {
    const message = this.parseMessagePackMessage(msgArray);
    this.handleMessage(message);
} catch (error) {
    console.error('Failed to parse message:', error);
    // 记录原始数据用于调试
    console.debug('Raw message:', msgArray);
}
```

---

## 📝 迁移检查清单

- [ ] 安装 msgpack 依赖
- [ ] 更新消息发送逻辑（添加格式标志）
- [ ] 更新消息接收逻辑（解析格式标志）
- [ ] 实现 MessagePack 数组格式解析
- [ ] 实现增量更新应用逻辑
- [ ] 支持完整快照和增量快照两种类型
- [ ] 测试网络连接
- [ ] 测试消息收发
- [ ] 测试增量更新效果
- [ ] 部署到生产环境

---

## 🧪 测试建议

### 1. 本地测试

```bash
# 启动 Rust 服务器
cd room-service
./target/release/room-service

# 运行测试客户端
node test-client.js
# 或
python3 test-client.py
```

### 2. 验证点

- ✅ 能够成功连接服务器
- ✅ 能够发送 MessagePack 消息
- ✅ 能够接收并解析 DeltaSnapshot
- ✅ 增量更新正确应用到状态
- ✅ 完整快照能覆盖增量累积误差
- ✅ 网络断线重连正常

---

## 📞 技术支持

如有问题，请参考：
- `BANDWIDTH_OPTIMIZATION_SUMMARY.md` - 优化技术细节
- `OPTIMIZATION_COMPARISON.md` - 效果对比数据
- `test-protocol.py` - 协议调试工具

---

**文档版本：** 1.0
**最后更新：** 2025-12-01
**适用服务器版本：** 0.1.0+
