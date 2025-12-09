/*!
 * 单个房间的状态管理
 */

use std::collections::HashMap;

use crate::protocol::{CoinId, CoinState, PlayerId, RoomConfig, RoomEvent};

use super::events::Event;
use super::physics::PhysicsWorld;

/// 玩家信息
#[derive(Debug, Clone)]
pub struct PlayerInfo {
    pub id: PlayerId,
    // 可扩展：连击、下注等
}

/// 房间状态
pub struct RoomState {
    pub id: String,
    pub config: RoomConfig,
    pub tick: u64,
    pub physics: PhysicsWorld,
    pub players: HashMap<PlayerId, PlayerInfo>,
    pub event_queue: Vec<Event>,

    // 增量更新支持
    /// 上一次快照的硬币状态（用于计算 delta）
    last_snapshot: HashMap<CoinId, CoinState>,
    /// 自上次完整快照以来的增量快照计数
    delta_snapshot_count: u32,

    // 自适应推送频率
    /// 累积时间（用于控制快照发送频率）
    accumulated_time: f32,
}

impl RoomState {
    pub fn new(id: String, config: RoomConfig) -> Self {
        Self {
            id,
            physics: PhysicsWorld::new(config.clone()),
            config,
            tick: 0,
            players: HashMap::new(),
            event_queue: Vec::new(),
            last_snapshot: HashMap::new(),
            delta_snapshot_count: 0,
            accumulated_time: 0.0,
        }
    }

    /// 推入事件到队列
    pub fn push_event(&mut self, event: Event) {
        self.event_queue.push(event);
    }

    /// 执行一次 tick
    pub fn tick(&mut self, dt: f32, out_events: &mut Vec<RoomEvent>) {
        self.tick += 1;

        // 1. 处理事件队列（先取出事件避免借用冲突）
        let events: Vec<Event> = self.event_queue.drain(..).collect();
        for event in events {
            event.apply(self, out_events);
        }

        // 2. 物理步进
        let result = self.physics.step(dt);

        // 3. 处理收集事件
        for (coin_id, owner) in result.collected {
            if let Some(player_id) = owner {
                out_events.push(RoomEvent::CoinDroppedToReward {
                    player_id,
                    coin_id,
                    reward_amount: 1, // 简化：每个硬币奖励1
                });
            }
        }

        // 4. 如果有硬币被收集，发送通用事件
        if !result.removed.is_empty() {
            out_events.push(RoomEvent::CoinCollected {
                coin_ids: result.removed,
            });
        }
    }

    /// 计算增量快照（只包含变化的硬币）
    /// 返回：(added, updated, removed)
    pub fn compute_delta(
        &mut self,
        current_coins: &[CoinState],
    ) -> (Vec<CoinState>, Vec<CoinState>, Vec<CoinId>) {
        let mut added = Vec::new();
        let mut updated = Vec::new();
        let mut removed = Vec::new();

        // 构建当前硬币 ID 集合
        let current_ids: HashMap<CoinId, &CoinState> =
            current_coins.iter().map(|c| (c.id, c)).collect();

        // 检查新增和更新的硬币
        for coin in current_coins {
            if let Some(last_coin) = self.last_snapshot.get(&coin.id) {
                // 硬币已存在，检查是否有显著变化
                if coin.has_significant_change(last_coin) {
                    updated.push(coin.clone());
                }
            } else {
                // 新硬币
                added.push(coin.clone());
            }
        }

        // 检查移除的硬币
        for old_id in self.last_snapshot.keys() {
            if !current_ids.contains_key(old_id) {
                removed.push(*old_id);
            }
        }

        (added, updated, removed)
    }

    /// 更新快照缓存
    pub fn update_snapshot_cache(&mut self, coins: &[CoinState]) {
        self.last_snapshot.clear();
        for coin in coins {
            self.last_snapshot.insert(coin.id, coin.clone());
        }
    }

    /// 增加增量快照计数
    pub fn increment_delta_count(&mut self) {
        self.delta_snapshot_count += 1;
    }

    /// 重置增量快照计数（发送完整快照后调用）
    pub fn reset_delta_count(&mut self) {
        self.delta_snapshot_count = 0;
    }

    /// 检查是否应该发送完整快照
    /// 每 30 次增量快照后发送一次完整快照（约1秒）
    pub fn should_send_full_snapshot(&self) -> bool {
        self.delta_snapshot_count >= 30
    }

    /// 累积时间并检查是否应该发送快照
    /// 返回 true 表示应该发送，false 表示跳过本帧
    pub fn accumulate_and_should_send_snapshot(&mut self, dt: f32) -> bool {
        self.accumulated_time += dt;

        // 计算快照间隔（秒）
        let snapshot_interval = 1.0 / self.config.snapshot_rate;

        if self.accumulated_time >= snapshot_interval {
            // 重置累积时间（保留余数避免累积误差）
            self.accumulated_time -= snapshot_interval;
            true
        } else {
            false
        }
    }

    /// 设置快照推送频率（用于自适应调整）
    pub fn set_snapshot_rate(&mut self, rate: f32) {
        self.config.snapshot_rate = rate.max(5.0).min(60.0); // 限制在 5-60 Hz 之间
        tracing::info!("Room {} snapshot rate adjusted to {} Hz", self.id, self.config.snapshot_rate);
    }
}
