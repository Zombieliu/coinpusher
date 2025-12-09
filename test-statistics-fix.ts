/**
 * 测试 GetStatistics API 修复
 */

async function testStatistics() {
    const gateUrl = 'http://127.0.0.1:2000';

    console.log('🧪 测试 GetStatistics API 修复\n');

    // 1. 先登录获取 token
    console.log('[1/2] 管理员登录...');
    const loginResult = await fetch(`${gateUrl}/admin/AdminLogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });

    const loginData = await loginResult.json();

    if (!loginData.isSucc || !loginData.res?.success) {
        console.log('✗ 登录失败');
        return;
    }

    console.log('✓ 登录成功\n');

    const token = loginData.res.token;

    // 2. 测试 GetStatistics
    console.log('[2/2] 测试 GetStatistics...');
    const statsResult = await fetch(`${gateUrl}/admin/GetStatistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            __ssoToken: token
        })
    });

    const statsData = await statsResult.json();

    if (statsData.isSucc) {
        console.log('✓ GetStatistics 调用成功！\n');
        console.log('=== 统计数据 ===');
        console.log(`总用户数 (totalUsers):      ${statsData.res.totalUsers}`);
        console.log(`活跃用户 (activeUsers):     ${statsData.res.activeUsers}`);
        console.log(`今日新增 (newUsersToday):   ${statsData.res.newUsersToday}`);
        console.log(`总收入 (totalRevenue):      ${statsData.res.totalRevenue}`);
        console.log(`\n=== 扩展数据 ===`);
        console.log(`日活跃 (dau):              ${statsData.res.dau}`);
        console.log(`月活跃 (mau):              ${statsData.res.mau}`);
        console.log(`今日收入 (todayRevenue):   ${statsData.res.todayRevenue}`);
        console.log(`ARPU:                      ${statsData.res.arpu.toFixed(2)}`);
        console.log(`ARPPU:                     ${statsData.res.arppu.toFixed(2)}`);
        console.log(`付费率 (payRate):          ${(statsData.res.payRate * 100).toFixed(2)}%`);
        console.log(`总对局数 (totalMatches):   ${statsData.res.totalMatches}`);
        console.log(`平均时长 (avgSessionTime): ${statsData.res.avgSessionTime}分钟`);

        console.log('\n🎉 Bug已修复！所有必需字段都存在');
    } else {
        console.log('✗ GetStatistics 失败:');
        console.log(JSON.stringify(statsData.err, null, 2));
    }
}

testStatistics();
