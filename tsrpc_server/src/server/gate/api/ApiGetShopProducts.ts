import { ApiCall } from "tsrpc";
import { ReqGetShopProducts, ResGetShopProducts } from "../../../tsrpc/protocols/gate/PtlGetShopProducts";
import { ShopSystem } from "../bll/ShopSystem";
import { apiWrapper, validateRequired } from "../../utils/ErrorHandler";
import { Logger } from "../../utils/Logger";
import { getOrSet } from "../../utils/CacheManager";

/**
 * 获取商城商品列表API
 *
 * 优化：
 * - 使用 ErrorHandler 统一错误处理
 * - 使用 Logger 记录日志
 * - 使用 CacheManager 缓存商品列表（5分钟）
 */
export const ApiGetShopProducts = apiWrapper<ReqGetShopProducts, ResGetShopProducts>(
    async (call: ApiCall<ReqGetShopProducts, ResGetShopProducts>) => {
        // 参数验证
        validateRequired(call.req.userId, 'userId');

        const { userId, category } = call.req;

        // 生成缓存 key
        const cacheKey = category
            ? `shop:products:${category}`
            : 'shop:products:all';

        // 使用缓存（5分钟过期）
        const products = await getOrSet(
            cacheKey,
            async () => {
                Logger.debug('Fetching shop products from database', { category });
                return await ShopSystem.getAvailableProducts(userId);
            },
            {
                ttl: 300, // 5分钟
                prefix: 'api',
            }
        );

        // 记录日志
        Logger.info('Shop products retrieved', {
            userId,
            category,
            productCount: products.length,
            cached: true,
        });

        return {
            products,
            hotProducts: []  // TODO: 实现热门商品逻辑
        };
    }
);
