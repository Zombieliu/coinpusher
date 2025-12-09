export interface ReqGetFinancialStats {
    __ssoToken?: string;
    startDate: number;
    endDate: number;
}

export interface ResGetFinancialStats {
    success: boolean;
    error?: string;
    
    // 每日数据
    dailyRevenue: { 
        date: string; 
        revenue: number; 
        orders: number 
    }[];
    
    // 汇总数据
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    
    // 大R用户
    topSpenders: { 
        userId: string; 
        total: number 
    }[];
}
