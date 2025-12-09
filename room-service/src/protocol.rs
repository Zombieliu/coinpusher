/*!
 * 进程间通信协议 (Node ↔ Rust Room Service)
 *
 * 使用 JSON 序列化，length-prefix 编码
 * 4 字节长度前缀 + UTF-8 JSON 内容
 */

use serde::{Deserialize, Serialize};

pub type RoomId = String;
pub type PlayerId = String;
pub type CoinId = u64;
pub type TransactionId = String;

// ========== Node → Rust ==========

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum FromNode {
    /// 创建房间
    CreateRoom {
        room_id: RoomId,
        config: RoomConfig,
    },

    /// 销毁房间
    DestroyRoom {
        room_id: RoomId,
    },

    /// 玩家加入房间
    PlayerJoin {
        room_id: RoomId,
        player_id: PlayerId,
    },

    /// 玩家离开房间
    PlayerLeave {
        room_id: RoomId,
        player_id: PlayerId,
    },

    /// 玩家投币
    PlayerDropCoin {
        room_id: RoomId,
        player_id: PlayerId,
        x: f32,
        /// 客户端本地 tick（可选，用于延迟补偿）
        #[serde(skip_serializing_if = "Option::is_none")]
        client_tick: Option<u64>,
    },

    /// 钱包操作结果（Gate 回调）
    WalletResult {
        room_id: RoomId,
        player_id: PlayerId,
        tx_id: TransactionId,
        ok: bool,
    },
}

/// 房间配置（推币机参数）
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RoomConfig {
    /// 重力加速度 (m/s²)
    pub gravity: f32,

    /// 投币初始高度 (m)
    pub drop_height: f32,

    /// 硬币半径 (m)
    pub coin_radius: f32,

    /// 硬币高度/厚度 (m)
    pub coin_height: f32,

    /// 奖励线 Z 坐标（小于此值认为掉落到收集区）
    pub reward_line_z: f32,

    /// 推板最小 Z
    pub push_min_z: f32,

    /// 推板最大 Z
    pub push_max_z: f32,

    /// 推板速度 (m/s)
    pub push_speed: f32,

    /// 快照推送频率 (Hz)，默认 30
    /// 弱网环境可降低到 10-15 来减少带宽占用
    #[serde(default = "default_snapshot_rate")]
    pub snapshot_rate: f32,
}

fn default_snapshot_rate() -> f32 {
    30.0
}

impl Default for RoomConfig {
    fn default() -> Self {
        Self {
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
}

// ========== Rust → Node ==========

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type")]
pub enum ToNode {
    /// 完整物理快照（定期广播）
    Snapshot {
        room_id: RoomId,
        tick: u64,
        /// 推板 Z 位置
        push_z: f32,
        /// 硬币状态列表
        coins: Vec<CoinState>,
        /// 房间事件（收集、奖励等）
        events: Vec<RoomEvent>,
    },

    /// 增量快照（只包含变化的硬币，减少80%带宽）
    DeltaSnapshot {
        room_id: RoomId,
        tick: u64,
        /// 推板 Z 位置
        push_z: f32,
        /// 新增的硬币
        #[serde(skip_serializing_if = "Vec::is_empty", default)]
        added: Vec<CoinState>,
        /// 更新的硬币（移动或旋转）
        #[serde(skip_serializing_if = "Vec::is_empty", default)]
        updated: Vec<CoinState>,
        /// 移除的硬币 ID
        #[serde(skip_serializing_if = "Vec::is_empty", default)]
        removed: Vec<CoinId>,
        /// 房间事件
        #[serde(skip_serializing_if = "Vec::is_empty", default)]
        events: Vec<RoomEvent>,
    },

    /// 请求扣费（转发给 Gate）
    NeedDeductGold {
        room_id: RoomId,
        player_id: PlayerId,
        tx_id: TransactionId,
        amount: i64,
    },

    /// 房间已关闭
    RoomClosed {
        room_id: RoomId,
        reason: String,
    },
}

/// 硬币状态
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CoinState {
    pub id: CoinId,
    /// 位置
    pub p: Position,
    /// 旋转（四元数）
    pub r: Rotation,
}

impl CoinState {
    /// 判断硬币状态是否有显著变化（用于增量更新）
    /// 阈值：位置变化 > 0.01m 或旋转变化 > 0.01
    pub fn has_significant_change(&self, other: &CoinState) -> bool {
        const POS_THRESHOLD: f32 = 0.01;
        const ROT_THRESHOLD: f32 = 0.01;

        let pos_diff = (self.p.x - other.p.x).abs()
            + (self.p.y - other.p.y).abs()
            + (self.p.z - other.p.z).abs();

        let rot_diff = (self.r.x - other.r.x).abs()
            + (self.r.y - other.r.y).abs()
            + (self.r.z - other.r.z).abs()
            + (self.r.w - other.r.w).abs();

        pos_diff > POS_THRESHOLD || rot_diff > ROT_THRESHOLD
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Position {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Rotation {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

/// 房间事件
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "kind")]
pub enum RoomEvent {
    /// 硬币掉落到奖励区
    CoinDroppedToReward {
        player_id: PlayerId,
        coin_id: CoinId,
        reward_amount: i64,
    },

    /// 硬币已收集（通用）
    CoinCollected {
        coin_ids: Vec<CoinId>,
    },
}
