#!/usr/bin/env ts-node

/**
 * 🔍 调试客户端 - 验证消息格式
 *
 * 用于测试单个连接的完整消息流
 */

import WebSocket from 'ws';

const GATEWAY_URL = 'ws://localhost:3000';
const USER_ID = 'debug_user_001';
const ROOM_ID = 'debug_room_001';

let ws: WebSocket;
let requestId: string;

console.log('🔍 Debug Client Starting...\n');

// 连接到Gateway
ws = new WebSocket(GATEWAY_URL);

ws.on('open', () => {
    console.log('✅ Connected to Gateway\n');
});

ws.on('message', (data: Buffer) => {
    const message = JSON.parse(data.toString());
    console.log('📨 Received message:');
    console.log(JSON.stringify(message, null, 2));
    console.log('');

    // 处理不同的消息类型
    switch (message.type) {
        case 'connected':
            console.log('➡️  Sending auth...\n');
            send({
                type: 'auth',
                payload: {
                    userId: USER_ID,
                    token: 'test-token'
                }
            });
            break;

        case 'auth_success':
            console.log('➡️  Sending join_room...\n');
            send({
                type: 'join_room',
                payload: {
                    roomId: ROOM_ID
                }
            });
            break;

        case 'room_joined':
            console.log('➡️  Sending drop_coin...\n');
            requestId = `req-${Date.now()}-${Math.random()}`;
            send({
                type: 'drop_coin',
                payload: {
                    x: 1.5,
                    z: -6,
                    requestId: requestId  // 客户端请求ID
                }
            });
            break;

        case 'coin_dropped':
            console.log('✅ Coin dropped successfully!');
            console.log(`   Client requestId: ${requestId}`);
            console.log(`   Response requestId: ${message.data?.requestId}`);
            console.log(`   Match: ${message.data?.requestId === requestId ? '✅ YES' : '❌ NO'}`);
            console.log('');

            // 等待一下物理帧然后退出
            setTimeout(() => {
                console.log('👋 Disconnecting...\n');
                ws.close();
            }, 2000);
            break;

        case 'physics_frame':
            console.log('📡 Physics frame received (frame id:', message.frame.frameId, ')');
            break;

        case 'error':
            console.error('❌ Error:', message.error);
            ws.close();
            break;
    }
});

ws.on('close', () => {
    console.log('🔌 Connection closed');
    process.exit(0);
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
    process.exit(1);
});

function send(message: any) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
}

// 超时保护
setTimeout(() => {
    console.log('⏰ Timeout - exiting');
    ws.close();
}, 15000);
