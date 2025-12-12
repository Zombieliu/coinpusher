export interface ReqGetStatistics {
    __ssoToken?: string;
}

export interface ResGetStatistics {
    // 必需字段
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    newUsersToday: number;

    // 扩展统计字段
    dau?: number;              // 日活跃用户
    mau?: number;              // 月活跃用户
    todayRevenue?: number;     // 今日收入
    arpu?: number;             // 平均每用户收入
    arppu?: number;            // 平均每付费用户收入
    payRate?: number;          // 付费率
    totalMatches?: number;     // 总对局数
    avgSessionTime?: number;   // 平均游戏时长（分钟）
}
