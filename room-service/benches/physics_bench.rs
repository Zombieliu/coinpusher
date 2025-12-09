/*!
 * Rust Room Service 性能基准测试
 *
 * 测试场景：
 * 1. 单硬币物理模拟
 * 2. 50 硬币物理模拟
 * 3. 100 硬币物理模拟
 * 4. 200 硬币物理模拟
 * 5. 房间创建/销毁性能
 * 6. 消息编解码性能
 */

use criterion::{black_box, criterion_group, criterion_main, BenchmarkId, Criterion};
use room_service::protocol::{CoinState, FromNode, Position, RoomConfig, Rotation, ToNode};
use room_service::room::physics::PhysicsWorld;
use room_service::room::RoomManager;

fn create_test_config() -> RoomConfig {
    RoomConfig {
        gravity: -20.0,
        drop_height: 10.0,
        coin_radius: 0.5,
        coin_height: 0.1,
        reward_line_z: -0.5,
        push_min_z: -8.8,
        push_max_z: -6.0,
        push_speed: 1.5,
    }
}

/// 基准测试：单个硬币的物理步进
fn bench_single_coin_physics(c: &mut Criterion) {
    c.bench_function("physics_step_1_coin", |b| {
        let config = create_test_config();
        let mut world = PhysicsWorld::new(config);
        world.spawn_coin(0.0, Some("player1".to_string()));

        b.iter(|| {
            world.step(black_box(1.0 / 30.0));
        });
    });
}

/// 基准测试：多个硬币的物理步进
fn bench_multiple_coins_physics(c: &mut Criterion) {
    let mut group = c.benchmark_group("physics_step_multiple_coins");

    for coin_count in [10, 50, 100, 200].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(coin_count),
            coin_count,
            |b, &coin_count| {
                let config = create_test_config();
                let mut world = PhysicsWorld::new(config);

                // 生成指定数量的硬币
                for i in 0..coin_count {
                    let x = (i as f32 % 10.0) - 5.0; // -5 到 5 之间分布
                    world.spawn_coin(x, Some(format!("player{}", i % 4)));
                }

                b.iter(|| {
                    world.step(black_box(1.0 / 30.0));
                });
            },
        );
    }

    group.finish();
}

/// 基准测试：收集硬币状态
fn bench_collect_coin_states(c: &mut Criterion) {
    let mut group = c.benchmark_group("collect_coin_states");

    for coin_count in [10, 50, 100, 200].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(coin_count),
            coin_count,
            |b, &coin_count| {
                let config = create_test_config();
                let mut world = PhysicsWorld::new(config);

                for i in 0..coin_count {
                    let x = (i as f32 % 10.0) - 5.0;
                    world.spawn_coin(x, Some(format!("player{}", i % 4)));
                }

                // 步进一次让硬币有位置
                world.step(1.0 / 30.0);

                b.iter(|| {
                    let states = world.collect_coin_states();
                    black_box(states);
                });
            },
        );
    }

    group.finish();
}

/// 基准测试：房间管理器创建/销毁房间
fn bench_room_manager_create_destroy(c: &mut Criterion) {
    c.bench_function("room_create_destroy", |b| {
        let mut room_id = 0;

        b.iter(|| {
            let mut manager = RoomManager::new();
            let mut outgoing = Vec::new();

            room_id += 1;
            let id = format!("room-{}", room_id);

            // 创建房间
            manager.handle_msg_from_node(
                FromNode::CreateRoom {
                    room_id: id.clone(),
                    config: create_test_config(),
                },
                &mut outgoing,
            );

            // 销毁房间
            manager.handle_msg_from_node(
                FromNode::DestroyRoom { room_id: id },
                &mut outgoing,
            );

            black_box(manager);
        });
    });
}

/// 基准测试：房间 tick（包含物理步进和快照生成）
fn bench_room_tick_with_coins(c: &mut Criterion) {
    let mut group = c.benchmark_group("room_tick_with_coins");

    for coin_count in [10, 50, 100].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(coin_count),
            coin_count,
            |b, &coin_count| {
                let mut manager = RoomManager::new();
                let mut outgoing = Vec::new();

                // 创建房间
                manager.handle_msg_from_node(
                    FromNode::CreateRoom {
                        room_id: "bench-room".to_string(),
                        config: create_test_config(),
                    },
                    &mut outgoing,
                );

                // 生成硬币
                for i in 0..coin_count {
                    let x = (i as f32 % 10.0) - 5.0;
                    manager.handle_msg_from_node(
                        FromNode::PlayerDropCoin {
                            room_id: "bench-room".to_string(),
                            player_id: format!("player{}", i % 4),
                            x,
                            client_tick: None,
                        },
                        &mut outgoing,
                    );
                }

                b.iter(|| {
                    outgoing.clear();
                    manager.tick_all(black_box(1.0 / 30.0), &mut outgoing);
                    black_box(&outgoing);
                });
            },
        );
    }

    group.finish();
}

/// 基准测试：JSON 序列化（Snapshot 消息）
fn bench_json_serialize_snapshot(c: &mut Criterion) {
    let mut group = c.benchmark_group("json_serialize_snapshot");

    for coin_count in [10, 50, 100, 200].iter() {
        group.bench_with_input(
            BenchmarkId::from_parameter(coin_count),
            coin_count,
            |b, &coin_count| {
                // 构造快照数据
                let coins: Vec<CoinState> = (0..coin_count)
                    .map(|i| CoinState {
                        id: i as u64,
                        p: Position {
                            x: i as f32,
                            y: 5.0,
                            z: -7.0,
                        },
                        r: Rotation {
                            x: 0.0,
                            y: 0.0,
                            z: 0.0,
                            w: 1.0,
                        },
                    })
                    .collect();

                let snapshot = ToNode::Snapshot {
                    room_id: "room-123".to_string(),
                    tick: 1234,
                    push_z: -7.5,
                    coins,
                    events: vec![],
                };

                b.iter(|| {
                    let json = serde_json::to_string(&snapshot).unwrap();
                    black_box(json);
                });
            },
        );
    }

    group.finish();
}

/// 基准测试：JSON 反序列化（FromNode 消息）
fn bench_json_deserialize_drop_coin(c: &mut Criterion) {
    c.bench_function("json_deserialize_drop_coin", |b| {
        let json = r#"{
            "type": "PlayerDropCoin",
            "room_id": "room-123",
            "player_id": "player1",
            "x": 2.5
        }"#;

        b.iter(|| {
            let msg: FromNode = serde_json::from_str(black_box(json)).unwrap();
            black_box(msg);
        });
    });
}

criterion_group!(
    benches,
    bench_single_coin_physics,
    bench_multiple_coins_physics,
    bench_collect_coin_states,
    bench_room_manager_create_destroy,
    bench_room_tick_with_coins,
    bench_json_serialize_snapshot,
    bench_json_deserialize_drop_coin
);

criterion_main!(benches);
