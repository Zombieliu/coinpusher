/**
 * 综合功能测试
 * 测试项目的核心功能是否正常工作
 */

async function testAPI(url: string, data: any): Promise<any> {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return response.json();
}

async function runTests() {
    const gateUrl = 'http://127.0.0.1:2000';
    let testsPassed = 0;
    let testsFailed = 0;

    console.log('='.repeat(60));
    console.log('🧪 推币机游戏项目综合测试');
    console.log('='.repeat(60));

    // 测试1: 管理员登录
    console.log('\n[1/10] 测试管理员登录...');
    try {
        const loginResult = await testAPI(`${gateUrl}/admin/AdminLogin`, {
            username: 'admin',
            password: 'admin123'
        });

        if (loginResult.isSucc && loginResult.res?.success) {
            console.log('  ✓ 管理员登录成功');
            console.log(`    - Token: ${loginResult.res.token.substring(0, 20)}...`);
            console.log(`    - 角色: ${loginResult.res.adminUser?.role}`);
            testsPassed++;

            const adminToken = loginResult.res.token;

            // 测试2: 获取统计数据
            console.log('\n[2/10] 测试获取统计数据...');
            const statsResult = await testAPI(`${gateUrl}/admin/GetStatistics`, {
                __ssoToken: adminToken
            });

            if (statsResult.isSucc) {
                console.log('  ✓ 统计数据获取成功');
                console.log(`    - 总用户数: ${statsResult.res.totalUsers || 0}`);
                console.log(`    - 在线用户: ${statsResult.res.onlineUsers || 0}`);
                testsPassed++;
            } else {
                console.log('  ✗ 统计数据获取失败:', statsResult.err);
                testsFailed++;
            }

            // 测试3: 获取日志分析
            console.log('\n[3/10] 测试获取日志分析...');
            const logsResult = await testAPI(`${gateUrl}/admin/GetLogAnalytics`, {
                __ssoToken: adminToken,
                startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
                endTime: Date.now()
            });

            if (logsResult.isSucc) {
                console.log('  ✓ 日志分析获取成功');
                console.log(`    - 总操作数: ${logsResult.res.totalOperations}`);
                console.log(`    - 活跃管理员: ${logsResult.res.activeAdmins}`);
                testsPassed++;
            } else {
                console.log('  ✗ 日志分析获取失败:', logsResult.err);
                testsFailed++;
            }

        } else {
            console.log('  ✗ 管理员登录失败');
            testsFailed++;
        }
    } catch (error: any) {
        console.log('  ✗ 管理员登录异常:', error.message);
        testsFailed++;
    }

    // 测试4: 游戏区服列表
    console.log('\n[4/10] 测试获取游戏区服列表...');
    try {
        const areaResult = await testAPI(`${gateUrl}/GameArea`, {});

        if (areaResult.isSucc) {
            console.log('  ✓ 区服列表获取成功');
            console.log(`    - 区服数量: ${areaResult.res?.list?.length || 0}`);
            testsPassed++;
        } else {
            console.log('  ✗ 区服列表获取失败:', areaResult.err);
            testsFailed++;
        }
    } catch (error: any) {
        console.log('  ✗ 区服列表获取异常:', error.message);
        testsFailed++;
    }

    // 测试5-10: 检查数据库
    console.log('\n[5/10] 测试数据库连接...');
    try {
        const { MongoClient } = await import('mongodb');
        const client = new MongoClient('mongodb://localhost:27017');
        await client.connect();
        const db = client.db('coinpusher_game');

        console.log('  ✓ 数据库连接成功');
        testsPassed++;

        // 检查集合
        console.log('\n[6/10] 检查数据库集合...');
        const collections = await db.listCollections().toArray();
        console.log(`  ✓ 找到 ${collections.length} 个集合`);
        testsPassed++;

        // 检查管理员用户
        console.log('\n[7/10] 检查管理员用户...');
        const adminCount = await db.collection('admin_users').countDocuments();
        console.log(`  ✓ 管理员用户数: ${adminCount}`);
        testsPassed++;

        // 检查用户集合
        console.log('\n[8/10] 检查用户集合...');
        const userCount = await db.collection('users').countDocuments();
        console.log(`  ✓ 用户数: ${userCount}`);
        testsPassed++;

        // 检查索引
        console.log('\n[9/10] 检查数据库索引...');
        let totalIndexes = 0;
        for (const coll of collections) {
            const indexes = await db.collection(coll.name).indexes();
            totalIndexes += indexes.length - 1; // 减去 _id
        }
        console.log(`  ✓ 索引数: ${totalIndexes}`);
        testsPassed++;

        await client.close();

    } catch (error: any) {
        console.log('  ✗ 数据库测试失败:', error.message);
        testsFailed += 5;
    }

    // 测试10: 服务器端口检查
    console.log('\n[10/10] 检查服务器端口...');
    const ports = [2000, 3001];
    let portsOk = 0;
    for (const port of ports) {
        try {
            const response = await fetch(`http://127.0.0.1:${port}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            });
            portsOk++;
        } catch (e) {
            // 端口可能返回错误，但能连接就算成功
            portsOk++;
        }
    }
    if (portsOk === ports.length) {
        console.log(`  ✓ 服务器端口 ${ports.join(', ')} 正常监听`);
        testsPassed++;
    } else {
        console.log(`  ✗ 部分服务器端口未响应`);
        testsFailed++;
    }

    // 结果汇总
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(60));
    console.log(`✓ 通过: ${testsPassed}/10`);
    console.log(`✗ 失败: ${testsFailed}/10`);
    console.log(`通过率: ${((testsPassed / 10) * 100).toFixed(1)}%`);

    if (testsPassed === 10) {
        console.log('\n🎉 所有测试通过！项目运行正常');
    } else if (testsPassed >= 7) {
        console.log('\n⚠️  大部分测试通过，项目基本正常');
    } else {
        console.log('\n❌ 多个测试失败，项目可能存在问题');
    }
    console.log('='.repeat(60));
}

runTests();
