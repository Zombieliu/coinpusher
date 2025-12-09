/**
 * 批量创建管理后台协议文件
 */
const fs = require('fs');
const path = require('path');

const protocolsDir = path.join(__dirname, 'src/tsrpc/protocols/gate/admin');

// 确保目录存在
if (!fs.existsSync(protocolsDir)) {
    fs.mkdirSync(protocolsDir, { recursive: true });
}

// 所有需要创建的协议文件
const protocols = [
    {
        name: 'PtlGetUsers',
        req: `export interface ReqGetUsers {
    __ssoToken?: string;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}`,
        res: `export interface ResGetUsers {
    users: Array<{
        userId: string;
        username: string;
        gold: number;
        status: string;
        lastLoginTime: number;
        createdAt: number;
    }>;
    total: number;
    page: number;
    limit: number;
}`
    },
    {
        name: 'PtlGetUserDetail',
        req: `export interface ReqGetUserDetail {
    __ssoToken?: string;
    userId: string;
}`,
        res: `export interface ResGetUserDetail {
    user: {
        userId: string;
        username: string;
        gold: number;
        tickets: number;
        status: string;
        lastLoginTime: number;
        totalRewards: number;
        inventory: any[];
    };
}`
    },
    {
        name: 'PtlBanUser',
        req: `export interface ReqBanUser {
    __ssoToken?: string;
    userId: string;
    reason: string;
    duration: number;
}`,
        res: `export interface ResBanUser {
    success: boolean;
    message?: string;
}`
    },
    {
        name: 'PtlUnbanUser',
        req: `export interface ReqUnbanUser {
    __ssoToken?: string;
    userId: string;
}`,
        res: `export interface ResUnbanUser {
    success: boolean;
    message?: string;
}`
    },
    {
        name: 'PtlGrantReward',
        req: `export interface ReqGrantReward {
    __ssoToken?: string;
    userId: string;
    rewards: {
        gold?: number;
        tickets?: number;
        exp?: number;
        items?: Array<{ itemId: string; quantity: number }>;
    };
}`,
        res: `export interface ResGrantReward {
    success: boolean;
    message?: string;
}`
    },
    {
        name: 'PtlSendMail',
        req: `export interface ReqSendMail {
    __ssoToken?: string;
    type: string;
    userIds?: string[];
    title: string;
    content: string;
    rewards?: any;
    expireAt?: number;
}`,
        res: `export interface ResSendMail {
    success: boolean;
    sentCount?: number;
    message?: string;
}`
    },
    {
        name: 'PtlGetEvents',
        req: `export interface ReqGetEvents {
    __ssoToken?: string;
    status?: string;
}`,
        res: `export interface ResGetEvents {
    events: Array<{
        eventId: string;
        eventType: string;
        title: string;
        description: string;
        startTime: number;
        endTime: number;
        status: string;
        config: any;
        rewards: any;
    }>;
}`
    },
    {
        name: 'PtlCreateEvent',
        req: `export interface ReqCreateEvent {
    __ssoToken?: string;
    eventType: string;
    title: string;
    description: string;
    startTime: number;
    endTime: number;
    config: any;
    rewards: any;
}`,
        res: `export interface ResCreateEvent {
    success: boolean;
    eventId?: string;
    message?: string;
}`
    },
    {
        name: 'PtlUpdateEvent',
        req: `export interface ReqUpdateEvent {
    __ssoToken?: string;
    eventId: string;
    title?: string;
    description?: string;
    startTime?: number;
    endTime?: number;
    status?: string;
    config?: any;
    rewards?: any;
}`,
        res: `export interface ResUpdateEvent {
    success: boolean;
    message?: string;
}`
    },
    {
        name: 'PtlDeleteEvent',
        req: `export interface ReqDeleteEvent {
    __ssoToken?: string;
    eventId: string;
}`,
        res: `export interface ResDeleteEvent {
    success: boolean;
    message?: string;
}`
    },
    {
        name: 'PtlGetConfig',
        req: `export interface ReqGetConfig {
    __ssoToken?: string;
    configType: string;
}`,
        res: `export interface ResGetConfig {
    configType: string;
    config: any;
    version: number;
    lastUpdatedAt: number;
    lastUpdatedBy?: string;
}`
    },
    {
        name: 'PtlUpdateConfig',
        req: `export interface ReqUpdateConfig {
    __ssoToken?: string;
    configType: string;
    config: any;
    comment?: string;
}`,
        res: `export interface ResUpdateConfig {
    success: boolean;
    version?: number;
    message?: string;
}`
    },
    {
        name: 'PtlGetConfigHistory',
        req: `export interface ReqGetConfigHistory {
    __ssoToken?: string;
    configType: string;
    page?: number;
    limit?: number;
}`,
        res: `export interface ResGetConfigHistory {
    history: Array<{
        historyId: string;
        version: number;
        config: any;
        updatedBy: string;
        updatedAt: number;
        comment: string;
    }>;
    total: number;
}`
    },
    {
        name: 'PtlRollbackConfig',
        req: `export interface ReqRollbackConfig {
    __ssoToken?: string;
    configType: string;
    historyId: string;
}`,
        res: `export interface ResRollbackConfig {
    success: boolean;
    version?: number;
    message?: string;
}`
    },
    {
        name: 'PtlGetLogs',
        req: `export interface ReqGetLogs {
    __ssoToken?: string;
    type: string;
    startTime?: number;
    endTime?: number;
    userId?: string;
    page?: number;
    limit?: number;
}`,
        res: `export interface ResGetLogs {
    logs: Array<{
        logId: string;
        type: string;
        userId?: string;
        action: string;
        details: any;
        timestamp: number;
    }>;
    total: number;
}`
    },
    {
        name: 'PtlGetNotifications',
        req: `export interface ReqGetNotifications {
    __ssoToken?: string;
    since?: number;
    limit?: number;
}`,
        res: `export interface ResGetNotifications {
    notifications: Array<{
        id: string;
        type: string;
        title: string;
        message: string;
        data?: any;
        timestamp: number;
        adminName?: string;
    }>;
}`
    },
    {
        name: 'PtlBatchBanUsers',
        req: `export interface ReqBatchBanUsers {
    __ssoToken?: string;
    userIds: string[];
    reason: string;
    duration: number;
}`,
        res: `export interface ResBatchBanUsers {
    success: boolean;
    successCount: number;
    failedCount: number;
    details: Array<{
        userId: string;
        success: boolean;
        message?: string;
    }>;
}`
    },
    {
        name: 'PtlBatchSendMail',
        req: `export interface ReqBatchSendMail {
    __ssoToken?: string;
    userIds: string[];
    title: string;
    content: string;
    rewards?: any;
    expireAt?: number;
}`,
        res: `export interface ResBatchSendMail {
    success: boolean;
    successCount: number;
    failedCount: number;
    details?: Array<{
        userId: string;
        success: boolean;
        message?: string;
    }>;
}`
    },
    {
        name: 'PtlGetLogAnalytics',
        req: `export interface ReqGetLogAnalytics {
    __ssoToken?: string;
    startTime?: number;
    endTime?: number;
}`,
        res: `export interface ResGetLogAnalytics {
    actionStats: Array<{
        action: string;
        count: number;
        percentage: number;
    }>;
    adminStats: Array<{
        adminId: string;
        adminName?: string;
        operationCount: number;
        lastOperation: number;
    }>;
    timeDistribution: Array<{
        hour: number;
        count: number;
    }>;
    dailyTrend: Array<{
        date: string;
        count: number;
    }>;
    totalOperations: number;
    activeAdmins: number;
    mostCommonAction: string;
}`
    }
];

// 创建所有协议文件
let successCount = 0;
let failCount = 0;

protocols.forEach(protocol => {
    const filePath = path.join(protocolsDir, `${protocol.name}.ts`);
    const content = `${protocol.req}\n\n${protocol.res}\n`;

    try {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Created: ${protocol.name}.ts`);
        successCount++;
    } catch (error) {
        console.error(`❌ Failed to create ${protocol.name}.ts:`, error.message);
        failCount++;
    }
});

console.log(`\n📊 Summary:`);
console.log(`✅ Success: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📁 Total: ${protocols.length}`);
console.log(`\n📂 Protocols created in: ${protocolsDir}`);
console.log(`\n⏭️  Next step: Run 'npm run proto' to generate ServiceProto`);
