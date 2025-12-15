export interface ReqGetUserDetail {
    __ssoToken?: string;
    userId: string;
}

export interface ResGetUserDetail {
    success: boolean;
    error?: string;
    user?: {
        // 基础信息
        userId: string;
        username: string;
        nickname?: string;
        avatar?: string;
        
        // 资产
        gold: number;
        tickets: number;
        gems?: number;
        exp: number;
        level: number;
        vipLevel: number;
        
        // 状态
        status: string; // active, banned
        createdAt: number;
        lastLoginTime: number;
        lastLoginIp?: string;
        deviceModel?: string;
        channel?: string;
        campaign?: string;
        platform?: 'ios' | 'android' | 'pc';
        clientVersion?: string;
        country?: string;
        web3Accounts?: Array<{
            address: string;
            chainId: number;
            network?: string;
            walletType?: string;
            boundAt: number;
        }>;
        
        // 统计
        totalRecharge: number; // 总充值
        totalGames: number;    // 总局数
        winRate?: number;      // 胜率
        
        // 扩展数据
        inventory?: any[];
        activeBuffs?: any[];
        tags?: string[];       // 标签：大R，活跃，作弊嫌疑等
    };
    
    // 最近数据快照（可选，用于概览）
    recentOrders?: any[];
    recentLogs?: any[];
}
