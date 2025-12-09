/**
 * 初始化游戏配置数据
 * 填充任务、成就、道具、商品等基础数据
 */

import { MongoClient } from 'mongodb';

async function initializeGameData() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        console.log('✓ 已连接到 MongoDB\n');

        const db = client.db('coinpusher_game');

        console.log('🎮 开始初始化游戏配置数据...\n');

        // 1. 初始化任务配置
        console.log('[1/8] 初始化任务配置...');
        const tasksCollection = db.collection('tasks');
        const existingTasks = await tasksCollection.countDocuments();

        if (existingTasks === 0) {
            const tasks = [
                {
                    taskId: 'task_001',
                    name: '首次登录',
                    description: '完成游戏首次登录',
                    type: 'daily',
                    targetType: 'login',
                    targetValue: 1,
                    rewards: { gold: 100, exp: 50 },
                    order: 1,
                    createdAt: Date.now()
                },
                {
                    taskId: 'task_002',
                    name: '完成3场对局',
                    description: '参与并完成3场游戏对局',
                    type: 'daily',
                    targetType: 'match',
                    targetValue: 3,
                    rewards: { gold: 300, exp: 150 },
                    order: 2,
                    createdAt: Date.now()
                },
                {
                    taskId: 'task_003',
                    name: '获得5次击杀',
                    description: '在对局中击杀5个敌方单位',
                    type: 'daily',
                    targetType: 'kill',
                    targetValue: 5,
                    rewards: { gold: 200, exp: 100 },
                    order: 3,
                    createdAt: Date.now()
                },
                {
                    taskId: 'task_004',
                    name: '胜利1场',
                    description: '获得1场对局胜利',
                    type: 'daily',
                    targetType: 'win',
                    targetValue: 1,
                    rewards: { gold: 500, exp: 200 },
                    order: 4,
                    createdAt: Date.now()
                }
            ];

            await tasksCollection.insertMany(tasks);
            console.log(`  ✓ 已添加 ${tasks.length} 个任务配置`);
        } else {
            console.log(`  ℹ 已存在 ${existingTasks} 个任务配置，跳过`);
        }

        // 2. 初始化成就配置
        console.log('\n[2/8] 初始化成就配置...');
        const achievementsCollection = db.collection('achievements');
        const existingAchievements = await achievementsCollection.countDocuments();

        if (existingAchievements === 0) {
            const achievements = [
                {
                    achievementId: 'ach_001',
                    name: '新手上路',
                    description: '完成第1场对局',
                    icon: 'newbie',
                    targetType: 'match_count',
                    targetValue: 1,
                    rewards: { gold: 500, exp: 100 },
                    points: 10,
                    category: 'beginner',
                    createdAt: Date.now()
                },
                {
                    achievementId: 'ach_002',
                    name: '初出茅庐',
                    description: '完成10场对局',
                    icon: 'rookie',
                    targetType: 'match_count',
                    targetValue: 10,
                    rewards: { gold: 1000, exp: 300 },
                    points: 20,
                    category: 'beginner',
                    createdAt: Date.now()
                },
                {
                    achievementId: 'ach_003',
                    name: '连胜达人',
                    description: '获得3连胜',
                    icon: 'streak',
                    targetType: 'win_streak',
                    targetValue: 3,
                    rewards: { gold: 2000, exp: 500 },
                    points: 30,
                    category: 'combat',
                    createdAt: Date.now()
                },
                {
                    achievementId: 'ach_004',
                    name: '杀戮狂魔',
                    description: '累计击杀100个敌方单位',
                    icon: 'killer',
                    targetType: 'kill_count',
                    targetValue: 100,
                    rewards: { gold: 5000, exp: 1000 },
                    points: 50,
                    category: 'combat',
                    createdAt: Date.now()
                },
                {
                    achievementId: 'ach_005',
                    name: '社交达人',
                    description: '添加10个好友',
                    icon: 'social',
                    targetType: 'friend_count',
                    targetValue: 10,
                    rewards: { gold: 1000, exp: 200 },
                    points: 20,
                    category: 'social',
                    createdAt: Date.now()
                }
            ];

            await achievementsCollection.insertMany(achievements);
            console.log(`  ✓ 已添加 ${achievements.length} 个成就配置`);
        } else {
            console.log(`  ℹ 已存在 ${existingAchievements} 个成就配置，跳过`);
        }

        // 3. 初始化道具配置
        console.log('\n[3/8] 初始化道具配置...');
        const itemsCollection = db.collection('items');
        const existingItems = await itemsCollection.countDocuments();

        if (existingItems === 0) {
            const items = [
                {
                    itemId: 'item_exp_boost_1h',
                    name: '经验加速卡(1小时)',
                    description: '使用后1小时内获得的经验提升50%',
                    type: 'consumable',
                    rarity: 'common',
                    stackable: true,
                    maxStack: 99,
                    effects: [{ type: 'exp_boost', value: 0.5, duration: 3600000 }],
                    cooldown: 0,
                    price: 100,
                    createdAt: Date.now()
                },
                {
                    itemId: 'item_gold_boost_1h',
                    name: '金币加速卡(1小时)',
                    description: '使用后1小时内获得的金币提升50%',
                    type: 'consumable',
                    rarity: 'common',
                    stackable: true,
                    maxStack: 99,
                    effects: [{ type: 'gold_boost', value: 0.5, duration: 3600000 }],
                    cooldown: 0,
                    price: 100,
                    createdAt: Date.now()
                },
                {
                    itemId: 'item_revive',
                    name: '复活币',
                    description: '在对局中阵亡时可立即复活',
                    type: 'consumable',
                    rarity: 'rare',
                    stackable: true,
                    maxStack: 10,
                    effects: [{ type: 'revive', value: 1 }],
                    cooldown: 0,
                    price: 500,
                    createdAt: Date.now()
                },
                {
                    itemId: 'item_name_change',
                    name: '改名卡',
                    description: '可以修改一次游戏昵称',
                    type: 'permanent',
                    rarity: 'epic',
                    stackable: true,
                    maxStack: 10,
                    effects: [{ type: 'name_change', value: 1 }],
                    cooldown: 0,
                    price: 1000,
                    createdAt: Date.now()
                }
            ];

            await itemsCollection.insertMany(items);
            console.log(`  ✓ 已添加 ${items.length} 个道具配置`);
        } else {
            console.log(`  ℹ 已存在 ${existingItems} 个道具配置，跳过`);
        }

        // 4. 初始化商品配置
        console.log('\n[4/8] 初始化商品配置...');
        const shopCollection = db.collection('shop_products');
        const existingProducts = await shopCollection.countDocuments();

        if (existingProducts === 0) {
            const products = [
                {
                    productId: 'shop_gold_100',
                    name: '金币袋(小)',
                    description: '获得100金币',
                    category: 'currency',
                    price: 1.0,
                    currency: 'USD',
                    rewards: { gold: 100 },
                    discount: 0,
                    featured: false,
                    stock: -1, // 无限
                    createdAt: Date.now()
                },
                {
                    productId: 'shop_gold_500',
                    name: '金币袋(中)',
                    description: '获得500金币 + 额外50金币',
                    category: 'currency',
                    price: 5.0,
                    currency: 'USD',
                    rewards: { gold: 550 },
                    discount: 0.1,
                    featured: true,
                    stock: -1,
                    createdAt: Date.now()
                },
                {
                    productId: 'shop_gold_1000',
                    name: '金币袋(大)',
                    description: '获得1000金币 + 额外150金币',
                    category: 'currency',
                    price: 10.0,
                    currency: 'USD',
                    rewards: { gold: 1150 },
                    discount: 0.15,
                    featured: true,
                    stock: -1,
                    createdAt: Date.now()
                },
                {
                    productId: 'shop_starter_pack',
                    name: '新手礼包',
                    description: '包含金币、经验卡和复活币',
                    category: 'package',
                    price: 4.99,
                    currency: 'USD',
                    rewards: {
                        gold: 500,
                        items: [
                            { itemId: 'item_exp_boost_1h', count: 3 },
                            { itemId: 'item_gold_boost_1h', count: 3 },
                            { itemId: 'item_revive', count: 2 }
                        ]
                    },
                    discount: 0.5,
                    featured: true,
                    stock: 1, // 每人限购1次
                    createdAt: Date.now()
                }
            ];

            await shopCollection.insertMany(products);
            console.log(`  ✓ 已添加 ${products.length} 个商品配置`);
        } else {
            console.log(`  ℹ 已存在 ${existingProducts} 个商品配置，跳过`);
        }

        // 5. 初始化抽奖配置
        console.log('\n[5/8] 初始化抽奖配置...');
        const lotteryCollection = db.collection('lottery_configs');
        const existingLottery = await lotteryCollection.countDocuments();

        if (existingLottery === 0) {
            const lotteries = [
                {
                    lotteryId: 'lottery_basic',
                    name: '基础抽奖',
                    description: '使用金币进行抽奖',
                    costType: 'gold',
                    costAmount: 100,
                    prizes: [
                        { itemId: 'gold', amount: 50, weight: 30, rarity: 'common' },
                        { itemId: 'gold', amount: 100, weight: 20, rarity: 'common' },
                        { itemId: 'gold', amount: 200, weight: 15, rarity: 'uncommon' },
                        { itemId: 'item_exp_boost_1h', amount: 1, weight: 15, rarity: 'uncommon' },
                        { itemId: 'item_gold_boost_1h', amount: 1, weight: 10, rarity: 'uncommon' },
                        { itemId: 'item_revive', amount: 1, weight: 7, rarity: 'rare' },
                        { itemId: 'item_name_change', amount: 1, weight: 3, rarity: 'epic' }
                    ],
                    active: true,
                    createdAt: Date.now()
                },
                {
                    lotteryId: 'lottery_premium',
                    name: '高级抽奖',
                    description: '使用钻石进行抽奖，奖励更丰厚',
                    costType: 'diamond',
                    costAmount: 10,
                    prizes: [
                        { itemId: 'gold', amount: 500, weight: 25, rarity: 'uncommon' },
                        { itemId: 'gold', amount: 1000, weight: 20, rarity: 'rare' },
                        { itemId: 'item_exp_boost_1h', amount: 3, weight: 20, rarity: 'uncommon' },
                        { itemId: 'item_gold_boost_1h', amount: 3, weight: 15, rarity: 'uncommon' },
                        { itemId: 'item_revive', amount: 5, weight: 10, rarity: 'rare' },
                        { itemId: 'item_name_change', amount: 1, weight: 7, rarity: 'epic' },
                        { itemId: 'gold', amount: 5000, weight: 3, rarity: 'legendary' }
                    ],
                    active: true,
                    createdAt: Date.now()
                }
            ];

            await lotteryCollection.insertMany(lotteries);
            console.log(`  ✓ 已添加 ${lotteries.length} 个抽奖配置`);
        } else {
            console.log(`  ℹ 已存在 ${existingLottery} 个抽奖配置，跳过`);
        }

        // 6. 初始化邮件模板
        console.log('\n[6/8] 初始化邮件模板...');
        const mailTemplatesCollection = db.collection('mail_templates');
        const existingTemplates = await mailTemplatesCollection.countDocuments();

        if (existingTemplates === 0) {
            const templates = [
                {
                    templateId: 'welcome',
                    title: '欢迎来到游戏！',
                    content: '感谢你加入我们的游戏！这是新手礼物，请查收。',
                    rewards: { gold: 1000, exp: 500 },
                    expiryDays: 7,
                    createdAt: Date.now()
                },
                {
                    templateId: 'daily_reward',
                    title: '每日奖励',
                    content: '这是你今天的登录奖励，明天记得继续登录哦！',
                    rewards: { gold: 100, exp: 50 },
                    expiryDays: 1,
                    createdAt: Date.now()
                },
                {
                    templateId: 'compensation',
                    title: '系统维护补偿',
                    content: '感谢你对游戏的支持，这是系统维护期间的补偿奖励。',
                    rewards: { gold: 500, exp: 200 },
                    expiryDays: 3,
                    createdAt: Date.now()
                }
            ];

            await mailTemplatesCollection.insertMany(templates);
            console.log(`  ✓ 已添加 ${templates.length} 个邮件模板`);
        } else {
            console.log(`  ℹ 已存在 ${existingTemplates} 个邮件模板，跳过`);
        }

        // 7. 初始化VIP配置
        console.log('\n[7/8] 初始化VIP配置...');
        const vipConfigsCollection = db.collection('vip_configs');
        const existingVIP = await vipConfigsCollection.countDocuments();

        if (existingVIP === 0) {
            const vipConfigs = [
                {
                    level: 1,
                    name: 'VIP 1',
                    price: 4.99,
                    duration: 30 * 24 * 60 * 60 * 1000, // 30天
                    benefits: {
                        expBonus: 0.1,
                        goldBonus: 0.1,
                        dailyRewards: { gold: 100 }
                    },
                    createdAt: Date.now()
                },
                {
                    level: 2,
                    name: 'VIP 2',
                    price: 9.99,
                    duration: 30 * 24 * 60 * 60 * 1000,
                    benefits: {
                        expBonus: 0.2,
                        goldBonus: 0.2,
                        dailyRewards: { gold: 250 }
                    },
                    createdAt: Date.now()
                },
                {
                    level: 3,
                    name: 'VIP 3',
                    price: 19.99,
                    duration: 30 * 24 * 60 * 60 * 1000,
                    benefits: {
                        expBonus: 0.3,
                        goldBonus: 0.3,
                        dailyRewards: { gold: 500 }
                    },
                    createdAt: Date.now()
                }
            ];

            await vipConfigsCollection.insertMany(vipConfigs);
            console.log(`  ✓ 已添加 ${vipConfigs.length} 个VIP配置`);
        } else {
            console.log(`  ℹ 已存在 ${existingVIP} 个VIP配置，跳过`);
        }

        // 8. 初始化活动配置
        console.log('\n[8/8] 初始化活动配置...');
        const eventsCollection = db.collection('events');
        const existingEvents = await eventsCollection.countDocuments();

        if (existingEvents === 0) {
            const now = Date.now();
            const events = [
                {
                    eventId: 'event_launch',
                    name: '开服活动',
                    description: '游戏开服，完成任务获得丰厚奖励！',
                    type: 'mission',
                    startTime: now,
                    endTime: now + 7 * 24 * 60 * 60 * 1000, // 7天
                    config: {
                        missions: [
                            { id: 'm1', desc: '完成5场对局', target: 5, reward: { gold: 500 } },
                            { id: 'm2', desc: '获得3次胜利', target: 3, reward: { gold: 1000 } },
                            { id: 'm3', desc: '击杀20个敌人', target: 20, reward: { gold: 800 } }
                        ]
                    },
                    active: true,
                    createdAt: now
                }
            ];

            await eventsCollection.insertMany(events);
            console.log(`  ✓ 已添加 ${events.length} 个活动配置`);
        } else {
            console.log(`  ℹ 已存在 ${existingEvents} 个活动配置，跳过`);
        }

        // 创建索引
        console.log('\n📊 创建数据库索引...');
        await tasksCollection.createIndex({ taskId: 1 }, { unique: true });
        await achievementsCollection.createIndex({ achievementId: 1 }, { unique: true });
        await itemsCollection.createIndex({ itemId: 1 }, { unique: true });
        await shopCollection.createIndex({ productId: 1 }, { unique: true });
        await lotteryCollection.createIndex({ lotteryId: 1 }, { unique: true });
        await eventsCollection.createIndex({ eventId: 1 }, { unique: true });
        console.log('  ✓ 索引创建完成');

        console.log('\n🎉 游戏配置数据初始化完成！\n');

        // 统计
        console.log('=== 数据统计 ===');
        console.log(`任务配置:   ${await tasksCollection.countDocuments()} 个`);
        console.log(`成就配置:   ${await achievementsCollection.countDocuments()} 个`);
        console.log(`道具配置:   ${await itemsCollection.countDocuments()} 个`);
        console.log(`商品配置:   ${await shopCollection.countDocuments()} 个`);
        console.log(`抽奖配置:   ${await lotteryCollection.countDocuments()} 个`);
        console.log(`邮件模板:   ${await mailTemplatesCollection.countDocuments()} 个`);
        console.log(`VIP配置:    ${await vipConfigsCollection.countDocuments()} 个`);
        console.log(`活动配置:   ${await eventsCollection.countDocuments()} 个`);

    } catch (error) {
        console.error('❌ 初始化失败:', error);
    } finally {
        await client.close();
    }
}

initializeGameData();
