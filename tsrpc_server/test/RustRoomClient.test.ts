/**
 * RustRoomClient 集成测试
 *
 * 前提条件：需要先启动 Rust Room Service
 * ```bash
 * cd room-service
 * cargo run --release
 * ```
 */

import { describe, it, before, after } from 'mocha';
import * as assert from 'assert';
import { RustRoomClient, RoomConfig, ToNode } from '../src/server/room/RustRoomClient';

describe('RustRoomClient 集成测试', () => {
    let client: RustRoomClient;
    const testRoomId = 'test-room-' + Date.now();

    before((done) => {
        // 创建客户端并连接
        client = new RustRoomClient('127.0.0.1', 9000);

        client.once('connected', () => {
            console.log('✅ 连接成功');
            done();
        });

        client.once('error', (err: Error) => {
            console.error('❌ 连接失败:', err.message);
            console.error('请确保 Rust Room Service 已启动: cd room-service && cargo run');
            done(err);
        });

        client.connect();
    });

    after(() => {
        // 清理：销毁测试房间
        if (client.isConnected()) {
            client.destroyRoom(testRoomId);
            client.disconnect();
        }
    });

    it('应该能够连接到 Rust Room Service', () => {
        assert.strictEqual(client.isConnected(), true);
    });

    it('应该能够创建房间', (done) => {
        const config: RoomConfig = {
            gravity: -20.0,
            drop_height: 10.0,
            coin_radius: 0.5,
            coin_height: 0.1,
            reward_line_z: -0.5,
            push_min_z: -8.8,
            push_max_z: -6.0,
            push_speed: 1.5,
            snapshot_rate: 30.0
        };

        const success = client.createRoom(testRoomId, config);
        assert.strictEqual(success, true);

        // 等待快照确认房间创建（支持 Snapshot 和 DeltaSnapshot）
        const timeout = setTimeout(() => {
            done(new Error('未收到快照，房间可能创建失败'));
        }, 2000);

        const handleSnapshot = (msg: ToNode) => {
            if (msg.room_id === testRoomId) {
                clearTimeout(timeout);
                assert.ok(msg.type === 'Snapshot' || msg.type === 'DeltaSnapshot');
                console.log(`✅ 收到${msg.type} tick=${msg.tick}`);
                client.off('snapshot', handleSnapshot);
                client.off('deltaSnapshot', handleSnapshot);
                done();
            }
        };

        client.once('snapshot', handleSnapshot);
        client.once('deltaSnapshot', handleSnapshot);
    });

    it('应该能够通知玩家加入', () => {
        const success = client.playerJoin(testRoomId, 'player1');
        assert.strictEqual(success, true);
    });

    it('应该能够投币', function(done) {
        this.timeout(5000); // 延长超时到5秒

        const success = client.playerDropCoin(testRoomId, 'player1', 2.5);
        assert.strictEqual(success, true);

        // 等待快照中包含硬币（支持 Snapshot 和 DeltaSnapshot）
        const timeout = setTimeout(() => {
            done(new Error('未收到包含硬币的快照'));
        }, 4000);

        const checkSnapshot = (msg: ToNode) => {
            if (msg.room_id === testRoomId) {
                let coinCount = 0;
                let coins: any[] = [];

                if (msg.type === 'Snapshot') {
                    coinCount = msg.coins.length;
                    coins = msg.coins;
                } else if (msg.type === 'DeltaSnapshot') {
                    coinCount = (msg.added?.length || 0) + (msg.updated?.length || 0);
                    coins = [...(msg.added || []), ...(msg.updated || [])];
                }

                if (coinCount > 0 && coins.length > 0 && coins[0]?.p) {
                    clearTimeout(timeout);
                    console.log(`✅ 硬币已生成 (${msg.type}): ID=${coins[0].id}, Y=${coins[0].p.y.toFixed(2)}`);
                    client.off('snapshot', checkSnapshot);
                    client.off('deltaSnapshot', checkSnapshot);
                    done();
                }
            }
        };

        client.on('snapshot', checkSnapshot);
        client.on('deltaSnapshot', checkSnapshot);
    });

    it('应该能够接收多个快照', function(done) {
        this.timeout(5000); // 延长超时到5秒

        let snapshotCount = 0;
        const targetCount = 5;

        const checkSnapshot = (msg: ToNode) => {
            if (msg.room_id === testRoomId) {
                snapshotCount++;

                let coinInfo = '';
                let tick = 0;
                let pushZ = 0;

                if (msg.type === 'Snapshot') {
                    coinInfo = `coins=${msg.coins.length}`;
                    tick = msg.tick;
                    pushZ = msg.push_z;
                } else if (msg.type === 'DeltaSnapshot') {
                    coinInfo = `delta(+${msg.added?.length || 0} ~${msg.updated?.length || 0} -${msg.removed?.length || 0})`;
                    tick = msg.tick;
                    pushZ = msg.push_z;
                }

                console.log(`  ${msg.type} ${snapshotCount}/${targetCount}: tick=${tick}, ${coinInfo}, pushZ=${pushZ.toFixed(2)}`);

                if (snapshotCount >= targetCount) {
                    client.off('snapshot', checkSnapshot);
                    client.off('deltaSnapshot', checkSnapshot);
                    assert.ok(true, `成功接收 ${targetCount} 个快照`);
                    done();
                }
            }
        };

        client.on('snapshot', checkSnapshot);
        client.on('deltaSnapshot', checkSnapshot);
    });

    it('应该能够投多个硬币', (done) => {
        // 投3个硬币
        client.playerDropCoin(testRoomId, 'player1', -2.0);
        client.playerDropCoin(testRoomId, 'player1', 0.0);
        client.playerDropCoin(testRoomId, 'player1', 2.0);

        const timeout = setTimeout(() => {
            done(new Error('未收到包含多个硬币的快照'));
        }, 3000);

        // 使用 snapshot 事件来检查（因为我们在 handleRustDeltaSnapshot 中会应用增量并发送完整状态）
        const checkSnapshot = (msg: Extract<ToNode, { type: 'Snapshot' }>) => {
            if (msg.room_id === testRoomId && msg.coins.length >= 4) { // 之前已经有1个
                clearTimeout(timeout);
                assert.ok(msg.coins.length >= 4, `应该至少有4个硬币，实际: ${msg.coins.length}`);
                console.log(`✅ 多个硬币已生成: ${msg.coins.length}个`);
                client.off('snapshot', checkSnapshot);
                done();
            }
        };

        client.on('snapshot', checkSnapshot);
    });

    it('应该能够通知玩家离开', () => {
        const success = client.playerLeave(testRoomId, 'player1');
        assert.strictEqual(success, true);
    });

    it('应该能够销毁房间', () => {
        const success = client.destroyRoom(testRoomId);
        assert.strictEqual(success, true);
    });
});
