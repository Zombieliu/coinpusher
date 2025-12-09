/**
 * @file GameConfig.ts
 * @description 游戏配置常量
 *
 * @module coinpusher/model
 *
 * @author OOPS Framework
 * @created 2025-11-28
 *
 * @description
 * 从 gold/gameConstants.ts 迁移的游戏配置
 * 包含：
 * - 推动台配置
 * - 金币配置
 * - 大奖配置
 * - 物理分组配置
 * - 事件名称
 */

/** 游戏配置常量 */
export const GameConfig = {
    // ========== 推动台配置 ==========
    /** 推动台最小 Z 位置 */
    PUSH_MIN_POS_Z: -8.8,
    /** 推动台最大 Z 位置 */
    PUSH_MAX_POS_Z: -6,
    /** 推动台初始 X 位置 */
    PUSH_INIT_POS_X: 0,
    /** 推动台初始 Y 位置 */
    PUSH_INIT_POS_Y: -0.5,
    /** 推动台线性速度 Z 轴 */
    PUSH_LINEAR_VELOCITY_Z: 1.5,

    // ========== 金币配置 ==========
    /** 金币尺寸 */
    GOLD_SIZE: 0.5,
    /** 金币掉落 Y 位置 */
    GOLD_DROP_POS_Y: 10,
    /** 台面金币 Y 位置 */
    GOLD_ON_STAND_POS_Y: 0.25,
    /** 台面金币最小 Z 位置 */
    GOLD_ON_STAND_POS_MIN_Z: -8,
    /** 台面金币最大 Z 位置 */
    GOLD_ON_STAND_POS_MAX_Z: -5.5,
    /** 台面金币最大 X 位置 */
    GOLD_ON_STAND_POS_MAX_X: 3.5,
    /** 初始金币数量 */
    INIT_GOLD_NUM: 100,

    // ========== 金币检查配置 ==========
    /** 金币检查最大帧数 */
    GOLD_CHECK_MAX_FRAME: 60,
    /** 金币检查其他状态阈值 */
    GOODS_CHECK_OTHER_STATE: 9,
    /** 金币销毁 Y 位置 */
    GOODS_DESTROY_POS_Y: -5,
    /** 金币可获得最小 Y 位置 */
    GOODS_GET_MIN_POS_Y: -3,
    /** 金币可获得最小 X 位置 */
    GOODS_GET_MIN_POS_X: 1.5,
    /** 金币可获得最小 Z 位置 */
    GOODS_GET_MIN_POS_Z: -4.5,
    /** 金币可获得最大 Z 位置 */
    GOODS_GET_MAX_POS_Z: -0.5,

    // ========== 大奖配置 ==========
    /** 大奖掉落间隔（秒） */
    JACKPOT_DROP_INTERVAL: 0.05, // 每 50ms 掉落一个金币
    /** 大奖掉落区域 X 范围 */
    JACKPOT_DROP_AREA_X: 7,
    /** 大奖掉落区域 Z 范围 */
    JACKPOT_DROP_AREA_Z: 4,
    /** 大奖掉落基础 Y 位置 */
    JACKPOT_DROP_BASE_Y: 10,
    /** 大奖掉落 Y 随机范围 */
    JACKPOT_DROP_Y_RANDOM: 2,

    // ========== 物理分组配置 ==========
    GROUP_MASK_LIST: {
        DEFAULT: 1 << 0,
        PUSH_TOUCH: 1 << 1,
        WALL: 1 << 2,
        GOODS: 1 << 3, // 金币+掉落礼物
    },

    // ========== 事件名称 ==========
    EVENT_LIST: {
        /** 金币变化事件 */
        GOLD_CHANGED: 'gold_changed',
        /** 大奖触发事件 */
        JACKPOT_TRIGGER: 'jackpot_trigger',
        /** 金币收集事件 */
        COIN_COLLECTED: 'coin_collected',
        /** 金币掉落事件 */
        COIN_DROPPED: 'coin_dropped',
    },

    // ========== 音效路径配置 ==========
    AUDIO_PATH: {
        /** 按钮点击音效 */
        CLICK: 'audio/coinpusher/click',
        /** 金币掉落音效（数组，随机选择） */
        GOLD_DROP: ['audio/coinpusher/drop1', 'audio/coinpusher/drop2', 'audio/coinpusher/drop3'],
        /** 收集金币音效（数组，随机选择） */
        GET_GOLD: ['audio/coinpusher/getGold1', 'audio/coinpusher/getGold2', 'audio/coinpusher/getGold3'],
        /** 收集礼物音效 */
        GET_PRESENT: 'audio/coinpusher/getPresent',
        /** 大奖触发音效 */
        JACKPOT: 'audio/coinpusher/countDownGetGold',
        /** 倒计时奖励音效 */
        COUNTDOWN: 'audio/coinpusher/countDownGetGold',
        /** 广告奖励音效 */
        VIDEO_REWARD: 'audio/coinpusher/videoGetGold',
        /** 无效操作音效 */
        INVALID: 'audio/coinpusher/invalidGold',
    },

    // ========== GamePanel 配置 ==========
    /** GamePanel 点击间隔时间（秒） */
    GAMEPANEL_CAN_CLICK_INTERVAL: 0.5,
    /** 倒计时自动奖励时间（秒） */
    COUNTDOWN_REWARD_TIME: 60,
    /** 离线奖励计算间隔（分钟） */
    OFFLINE_ADD_GOLD_TIME: 60,
    /** 离线奖励最大金币数 */
    OFFLINE_MAX_GOLD: 100,

    // ========== 奖励配置 ==========
    /** 签到奖励金币数 */
    CHECKIN_REWARD_GOLD: 10,
    /** 观看广告奖励金币数 */
    VIDEO_REWARD_GOLD: 20,
    /** 倒计时奖励金币数 */
    COUNTDOWN_REWARD_GOLD: 1,
};
