import { ProductConfig } from '../../types/shop';

export interface ReqGetShopProducts {
    userId: string;
    category?: string;      // 可选：分类筛选
    tags?: string[];        // 可选：标签筛选
}

export interface ResGetShopProducts {
    products: ProductConfig[];
    hotProducts: ProductConfig[];
}
