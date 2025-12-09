/**
 * 测试管理后台是否正常工作
 */

import { getGateHttpUrl } from './test-env';

async function testAdminDashboard() {
    console.log('🧪 测试管理后台修复\n');

    const gateUrl = getGateHttpUrl();

    // 1. 登录获取 token
    console.log('[1/2] 管理员登录...');
    const loginRes = await fetch(`${gateUrl}/admin/AdminLogin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: 'admin',
            password: 'admin123'
        })
    });

    const loginData = await loginRes.json();

    if (!loginData.isSucc || !loginData.res?.success) {
        console.log('✗ 登录失败');
        return;
    }

    console.log('✓ 登录成功');
    const token = loginData.res.token;

    // 2. 测试 GetStatistics
    console.log('\n[2/2] 测试 GetStatistics API...');
    const statsRes = await fetch(`${gateUrl}/admin/GetStatistics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            __ssoToken: token
        })
    });

    const statsData = await statsRes.json();

    if (statsData.isSucc && statsData.res) {
        console.log('✓ GetStatistics 调用成功\n');
        console.log('=== API 返回字段 ===');
        console.log('totalUsers:', statsData.res.totalUsers);
        console.log('activeUsers:', statsData.res.activeUsers);
        console.log('newUsersToday:', statsData.res.newUsersToday);
        console.log('totalRevenue:', statsData.res.totalRevenue);
        console.log('dau:', statsData.res.dau);
        console.log('mau:', statsData.res.mau);
        console.log('todayRevenue:', statsData.res.todayRevenue);
        console.log('arpu:', statsData.res.arpu);
        console.log('arppu:', statsData.res.arppu);
        console.log('payRate:', statsData.res.payRate);
        console.log('totalMatches:', statsData.res.totalMatches);
        console.log('avgSessionTime:', statsData.res.avgSessionTime);

        // 验证所有字段都存在且不是 undefined
        const requiredFields = [
            'totalUsers', 'activeUsers', 'newUsersToday', 'totalRevenue',
            'dau', 'mau', 'todayRevenue', 'arpu', 'arppu', 'payRate',
            'totalMatches', 'avgSessionTime'
        ];

        let allFieldsOk = true;
        const missingFields: string[] = [];

        for (const field of requiredFields) {
            if (statsData.res[field] === undefined) {
                allFieldsOk = false;
                missingFields.push(field);
            }
        }

        if (allFieldsOk) {
            console.log('\n🎉 所有字段都存在！管理后台应该能正常显示了');
            console.log('\n管理后台地址: http://localhost:3003');
            console.log('使用 admin / admin123 登录');
        } else {
            console.log('\n⚠️  以下字段缺失:', missingFields.join(', '));
        }
    } else {
        console.log('✗ GetStatistics 失败:', statsData.err);
    }
}

testAdminDashboard();
