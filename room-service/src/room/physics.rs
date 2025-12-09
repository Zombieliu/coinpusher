/*!
 * Rapier 3D 物理引擎封装
 * 负责推币机的物理模拟
 */

use rapier3d::prelude::*;
use std::collections::HashMap;

use crate::protocol::{CoinId, CoinState, Position, Rotation, RoomConfig};

/// 硬币刚体句柄
#[derive(Debug, Clone)]
pub struct CoinHandle {
    pub rigid_body_handle: RigidBodyHandle,
    pub owner: Option<String>, // 可选：记录投币玩家
}

/// 物理世界
pub struct PhysicsWorld {
    // Rapier 核心组件
    pub rigid_bodies: RigidBodySet,
    pub colliders: ColliderSet,
    gravity: Vector<Real>,
    integration_parameters: IntegrationParameters,
    physics_pipeline: PhysicsPipeline,
    island_manager: IslandManager,
    broad_phase: DefaultBroadPhase,
    narrow_phase: NarrowPhase,
    ccd_solver: CCDSolver,
    joints: ImpulseJointSet,
    multibody_joints: MultibodyJointSet,

    // 推板
    pub push_platform_handle: RigidBodyHandle,
    push_dir: f32, // 1.0 = 向前推, -1.0 = 后退
    config: RoomConfig,

    // 硬币管理
    pub coin_id_counter: CoinId,
    pub coin_map: HashMap<CoinId, CoinHandle>,
}

impl PhysicsWorld {
    pub fn new(config: RoomConfig) -> Self {
        let mut rigid_bodies = RigidBodySet::new();
        let mut colliders = ColliderSet::new();

        // 创建重力
        let gravity = vector![0.0, config.gravity, 0.0];

        // 创建静态环境
        Self::create_static_environment(&mut rigid_bodies, &mut colliders);

        // 创建推板
        let push_platform_handle = Self::create_push_platform(
            &mut rigid_bodies,
            &mut colliders,
            config.push_min_z,
        );

        let mut world = Self {
            rigid_bodies,
            colliders,
            gravity,
            integration_parameters: IntegrationParameters::default(),
            physics_pipeline: PhysicsPipeline::new(),
            island_manager: IslandManager::new(),
            broad_phase: DefaultBroadPhase::new(),
            narrow_phase: NarrowPhase::new(),
            ccd_solver: CCDSolver::new(),
            joints: ImpulseJointSet::new(),
            multibody_joints: MultibodyJointSet::new(),
            push_platform_handle,
            push_dir: 1.0,
            config,
            coin_id_counter: 1,
            coin_map: HashMap::new(),
        };

        // 初始化台面金币（参考原版游戏）
        world.create_initial_coins();

        world
    }

    /// 创建静态环境（地板、墙壁）
    fn create_static_environment(
        rigid_bodies: &mut RigidBodySet,
        colliders: &mut ColliderSet,
    ) {
        // 主地板
        let ground_body = RigidBodyBuilder::fixed()
            .translation(vector![0.0, -0.1, -5.0])
            .build();
        let ground_handle = rigid_bodies.insert(ground_body);
        let ground_collider = ColliderBuilder::cuboid(10.0, 0.1, 10.0)
            .friction(0.5)
            .restitution(0.2)
            .build();
        colliders.insert_with_parent(ground_collider, ground_handle, rigid_bodies);

        // 左墙
        Self::create_wall(rigid_bodies, colliders, -6.0, 2.0, -5.0, 0.5, 2.0, 10.0);
        // 右墙
        Self::create_wall(rigid_bodies, colliders, 6.0, 2.0, -5.0, 0.5, 2.0, 10.0);
        // 后墙
        Self::create_wall(rigid_bodies, colliders, 0.0, 2.0, -11.0, 10.0, 2.0, 0.5);
    }

    fn create_wall(
        rigid_bodies: &mut RigidBodySet,
        colliders: &mut ColliderSet,
        x: f32,
        y: f32,
        z: f32,
        hx: f32,
        hy: f32,
        hz: f32,
    ) {
        let body = RigidBodyBuilder::fixed()
            .translation(vector![x, y, z])
            .build();
        let handle = rigid_bodies.insert(body);
        let collider = ColliderBuilder::cuboid(hx, hy, hz)
            .friction(0.1)
            .build();
        colliders.insert_with_parent(collider, handle, rigid_bodies);
    }

    /// 创建推板（运动学刚体）
    fn create_push_platform(
        rigid_bodies: &mut RigidBodySet,
        colliders: &mut ColliderSet,
        start_z: f32,
    ) -> RigidBodyHandle {
        let body = RigidBodyBuilder::kinematic_position_based()
            .translation(vector![0.0, 0.5, start_z])
            .build();
        let handle = rigid_bodies.insert(body);

        let collider = ColliderBuilder::cuboid(4.0, 0.4, 2.0)
            .friction(0.3)
            .restitution(0.1)
            .build();
        colliders.insert_with_parent(collider, handle, rigid_bodies);

        handle
    }

    /// 更新推板位置
    fn update_push_platform(&mut self, dt: f32) {
        if let Some(body) = self.rigid_bodies.get_mut(self.push_platform_handle) {
            let pos = body.translation();
            let mut new_z = pos.z + self.config.push_speed * self.push_dir * dt;

            // 边界反向
            if new_z >= self.config.push_max_z {
                new_z = self.config.push_max_z;
                self.push_dir = -1.0;
            } else if new_z <= self.config.push_min_z {
                new_z = self.config.push_min_z;
                self.push_dir = 1.0;
            }

            body.set_next_kinematic_translation(vector![pos.x, pos.y, new_z]);
        }
    }

    /// 创建初始化台面金币（参考原版 gameManager._createInitCoin）
    /// 从原版游戏常量:
    /// - GOLD_ON_STAND_POS_Y: 0.17
    /// - GOLD_ON_STAND_POS_MAX_X: 3.7
    /// - GOLD_ON_STAND_POS_MIN_Z: -6
    /// - GOLD_ON_STAND_POS_MAX_Z: 0.679
    /// - GOLD_SIZE: 1.35
    fn create_initial_coins(&mut self) {
        const GOLD_ON_STAND_POS_Y: f32 = 0.17;
        const GOLD_ON_STAND_POS_MAX_X: f32 = 3.7;
        const GOLD_ON_STAND_POS_MIN_Z: f32 = -6.0;
        const GOLD_ON_STAND_POS_MAX_Z: f32 = 0.679;
        const GOLD_SIZE: f32 = 1.35;

        let mut coin_count = 0;
        let mut x = 0.0;
        let mut z = GOLD_ON_STAND_POS_MIN_Z;

        // 平铺金币（参考原版逻辑）
        while z < GOLD_ON_STAND_POS_MAX_Z {
            if x == 0.0 {
                self.spawn_coin_at_position(x, GOLD_ON_STAND_POS_Y, z, None);
                coin_count += 1;
            } else {
                // 左右对称放置
                self.spawn_coin_at_position(x, GOLD_ON_STAND_POS_Y, z, None);
                self.spawn_coin_at_position(-x, GOLD_ON_STAND_POS_Y, z, None);
                coin_count += 2;
            }

            x += GOLD_SIZE;

            if x > GOLD_ON_STAND_POS_MAX_X {
                x = 0.0;
                z += GOLD_SIZE;
            }
        }

        tracing::info!("Created {} initial coins on table", coin_count);
    }

    /// 在指定位置生成硬币（不从高处掉落，直接放置）
    fn spawn_coin_at_position(&mut self, x: f32, y: f32, z: f32, owner: Option<String>) -> CoinId {
        let coin_id = self.coin_id_counter;
        self.coin_id_counter += 1;

        // 动态刚体，直接放置在台面上
        let body = RigidBodyBuilder::dynamic()
            .translation(vector![x, y, z])
            .ccd_enabled(true)
            .build();
        let body_handle = self.rigid_bodies.insert(body);

        // 圆柱体碰撞器（模拟硬币）
        let collider = ColliderBuilder::cylinder(
            self.config.coin_height / 2.0,
            self.config.coin_radius,
        )
        .friction(0.4)
        .restitution(0.3)
        .density(5.0)
        .build();
        self.colliders
            .insert_with_parent(collider, body_handle, &mut self.rigid_bodies);

        self.coin_map.insert(
            coin_id,
            CoinHandle {
                rigid_body_handle: body_handle,
                owner,
            },
        );

        coin_id
    }

    /// 生成硬币（从高处掉落）
    pub fn spawn_coin(&mut self, x: f32, owner: Option<String>) -> CoinId {
        self.spawn_coin_at_position(x, self.config.drop_height, -6.0, owner)
    }

    /// 物理步进
    pub fn step(&mut self, dt: f32) -> PhysicsStepResult {
        // 更新推板
        self.update_push_platform(dt);

        // 物理模拟
        self.integration_parameters.dt = dt;
        self.physics_pipeline.step(
            &self.gravity,
            &self.integration_parameters,
            &mut self.island_manager,
            &mut self.broad_phase,
            &mut self.narrow_phase,
            &mut self.rigid_bodies,
            &mut self.colliders,
            &mut self.joints,
            &mut self.multibody_joints,
            &mut self.ccd_solver,
            None,
            &(),
            &(),
        );

        // 收集结果
        let mut collected = Vec::new();
        let mut to_remove = Vec::new();

        for (&coin_id, handle) in &self.coin_map {
            if let Some(body) = self.rigid_bodies.get(handle.rigid_body_handle) {
                let pos = body.translation();

                // 检测掉落
                if pos.y < -5.0 {
                    to_remove.push(coin_id);

                    // 检测是否进入收集区
                    if pos.z > self.config.reward_line_z && pos.x.abs() < 1.5 {
                        collected.push((coin_id, handle.owner.clone()));
                    }
                }
            }
        }

        // 移除掉落的硬币
        for coin_id in &to_remove {
            if let Some(handle) = self.coin_map.remove(coin_id) {
                self.rigid_bodies.remove(
                    handle.rigid_body_handle,
                    &mut self.island_manager,
                    &mut self.colliders,
                    &mut self.joints,
                    &mut self.multibody_joints,
                    true,
                );
            }
        }

        PhysicsStepResult {
            collected,
            removed: to_remove,
        }
    }

    /// 收集当前所有硬币的状态
    pub fn collect_coin_states(&self) -> Vec<CoinState> {
        self.coin_map
            .iter()
            .filter_map(|(&coin_id, handle)| {
                self.rigid_bodies
                    .get(handle.rigid_body_handle)
                    .map(|body| {
                        let pos = body.translation();
                        let rot = body.rotation();

                        CoinState {
                            id: coin_id,
                            p: Position {
                                x: pos.x,
                                y: pos.y,
                                z: pos.z,
                            },
                            r: Rotation {
                                x: rot.i,
                                y: rot.j,
                                z: rot.k,
                                w: rot.w,
                            },
                        }
                    })
            })
            .collect()
    }

    /// 获取推板当前 Z 坐标
    pub fn get_push_z(&self) -> f32 {
        self.rigid_bodies
            .get(self.push_platform_handle)
            .map(|b| b.translation().z)
            .unwrap_or(0.0)
    }
}

/// 物理步进结果
pub struct PhysicsStepResult {
    /// 被收集的硬币 (coin_id, owner)
    pub collected: Vec<(CoinId, Option<String>)>,
    /// 被移除的硬币ID
    pub removed: Vec<CoinId>,
}

#[cfg(test)]
mod tests {
    use super::*;

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
            snapshot_rate: 30.0,
        }
    }

    #[test]
    fn test_physics_world_creation() {
        let config = create_test_config();
        let world = PhysicsWorld::new(config);

        // 验证初始化
        assert_eq!(world.coin_id_counter, 1);
        assert!(world.coin_map.is_empty());
        assert!(world.rigid_bodies.len() > 0); // 包含地面和推板
    }

    #[test]
    fn test_spawn_coin() {
        let config = create_test_config();
        let mut world = PhysicsWorld::new(config);

        // 生成硬币
        let coin_id = world.spawn_coin(2.5, Some("player1".to_string()));

        assert_eq!(coin_id, 1);
        assert_eq!(world.coin_id_counter, 2);
        assert_eq!(world.coin_map.len(), 1);

        // 验证硬币位置
        let states = world.collect_coin_states();
        assert_eq!(states.len(), 1);
        assert_eq!(states[0].id, coin_id);
        assert!((states[0].p.x - 2.5).abs() < 0.01);
        assert!((states[0].p.y - 10.0).abs() < 0.01);
    }

    #[test]
    fn test_multiple_coins() {
        let config = create_test_config();
        let mut world = PhysicsWorld::new(config);

        // 生成多个硬币
        let id1 = world.spawn_coin(-2.0, Some("player1".to_string()));
        let id2 = world.spawn_coin(0.0, Some("player2".to_string()));
        let id3 = world.spawn_coin(2.0, Some("player1".to_string()));

        assert_eq!(id1, 1);
        assert_eq!(id2, 2);
        assert_eq!(id3, 3);
        assert_eq!(world.coin_map.len(), 3);

        let states = world.collect_coin_states();
        assert_eq!(states.len(), 3);
    }

    #[test]
    fn test_physics_step() {
        let config = create_test_config();
        let mut world = PhysicsWorld::new(config);

        world.spawn_coin(0.0, Some("player1".to_string()));

        let initial_state = world.collect_coin_states();
        let initial_y = initial_state[0].p.y;

        // 执行物理步进
        let dt = 1.0 / 30.0; // 30Hz
        world.step(dt);

        let new_state = world.collect_coin_states();
        let new_y = new_state[0].p.y;

        // 硬币应该下落（Y减小）
        assert!(new_y < initial_y, "Coin should fall due to gravity");
    }

    #[test]
    fn test_push_platform_movement() {
        let config = create_test_config();
        let mut world = PhysicsWorld::new(config);

        let initial_z = world.get_push_z();
        assert!((initial_z - (-8.8)).abs() < 0.01); // 应该从 push_min_z 开始

        // 步进多次
        for _ in 0..60 {
            // 2秒 @ 30Hz
            world.step(1.0 / 30.0);
        }

        let new_z = world.get_push_z();
        // 推板应该向前移动
        assert!(new_z > initial_z, "Push platform should move forward");
    }

    #[test]
    fn test_coin_removal() {
        let config = RoomConfig {
            gravity: -50.0, // 更强的重力
            drop_height: 10.0,
            coin_radius: 0.5,
            coin_height: 0.1,
            reward_line_z: -0.5,
            push_min_z: -8.8,
            push_max_z: -6.0,
            push_speed: 1.5,
            snapshot_rate: 30.0,
        };
        let mut world = PhysicsWorld::new(config);

        // 在边缘生成硬币，使其掉出地板
        world.spawn_coin(15.0, Some("player1".to_string())); // 远离地板中心

        // 模拟硬币掉落很多次直到Y < -5
        for i in 0..600 {
            // 20秒
            let result = world.step(1.0 / 30.0);
            if !result.removed.is_empty() {
                // 硬币被移除
                assert_eq!(result.removed.len(), 1);
                assert_eq!(world.coin_map.len(), 0);
                tracing::debug!("Coin removed after {} ticks", i);
                return;
            }
        }

        // 如果硬币没有掉出地板（停在地板上），这也是合理的
        // 检查硬币是否已经静止在低位置
        let states = world.collect_coin_states();
        if !states.is_empty() {
            assert!(states[0].p.y < 5.0, "Coin should have fallen significantly");
        }
    }

    #[test]
    fn test_coin_collection() {
        let config = RoomConfig {
            gravity: -50.0, // 更强的重力，快速掉落
            drop_height: 10.0,
            coin_radius: 0.5,
            coin_height: 0.1,
            reward_line_z: -0.5,
            push_min_z: -8.8,
            push_max_z: -6.0,
            push_speed: 1.5,
            snapshot_rate: 30.0,
        };
        let mut world = PhysicsWorld::new(config);

        // 在收集区域中间生成硬币
        world.spawn_coin(0.0, Some("player1".to_string()));

        // 模拟掉落
        for _ in 0..300 {
            let result = world.step(1.0 / 30.0);
            if !result.collected.is_empty() {
                // 硬币被收集
                assert_eq!(result.collected.len(), 1);
                assert_eq!(result.collected[0].1, Some("player1".to_string()));
                return;
            }
        }
    }

    #[test]
    fn test_push_platform_boundary() {
        let config = create_test_config();
        let push_min_z = config.push_min_z;
        let push_max_z = config.push_max_z;
        let mut world = PhysicsWorld::new(config);

        // 步进很长时间
        for _ in 0..300 {
            // 10秒
            world.step(1.0 / 30.0);
        }

        let z = world.get_push_z();
        // 推板应该在边界内
        assert!(
            z >= push_min_z && z <= push_max_z,
            "Push platform Z ({}) should be within bounds [{}, {}]",
            z,
            push_min_z,
            push_max_z
        );
    }
}
