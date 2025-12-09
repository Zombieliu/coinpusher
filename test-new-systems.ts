/**
 * 测试新增系统的API端点
 * 用法: npx ts-node test-new-systems.ts
 */

const API_BASE = 'http://localhost:3000';
const TEST_USER_ID = 'test_user_' + Date.now();

interface TestResult {
    api: string;
    status: 'PASS' | 'FAIL';
    message: string;
    duration: number;
}

const results: TestResult[] = [];

async function testAPI(apiName: string, endpoint: string, body: any): Promise<void> {
    const startTime = Date.now();
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const duration = Date.now() - startTime;
        const data = await response.json();

        if (response.ok && !data.err) {
            results.push({
                api: apiName,
                status: 'PASS',
                message: JSON.stringify(data.res || data).substring(0, 100),
                duration
            });
            console.log(`✅ ${apiName} - PASS (${duration}ms)`);
        } else {
            results.push({
                api: apiName,
                status: 'FAIL',
                message: data.err || data.message || 'Unknown error',
                duration
            });
            console.log(`❌ ${apiName} - FAIL: ${data.err || data.message}`);
        }
    } catch (error: any) {
        const duration = Date.now() - startTime;
        results.push({
            api: apiName,
            status: 'FAIL',
            message: error.message,
            duration
        });
        console.log(`❌ ${apiName} - FAIL: ${error.message}`);
    }
}

async function runTests() {
    console.log('🚀 开始测试新增系统API...\n');
    console.log(`测试用户ID: ${TEST_USER_ID}\n`);

    // 1. 签到系统测试
    console.log('📅 测试签到系统:');
    await testAPI('获取签到信息', '/GetSignInInfo', {
        userId: TEST_USER_ID
    });

    await testAPI('每日签到', '/SignIn', {
        userId: TEST_USER_ID
    });

    // 2. 等级系统测试
    console.log('\n🎖️ 测试等级系统:');
    await testAPI('获取等级信息', '/GetLevelInfo', {
        userId: TEST_USER_ID
    });

    // 3. 邮件系统测试
    console.log('\n📧 测试邮件系统:');
    await testAPI('获取邮件列表', '/GetMailList', {
        userId: TEST_USER_ID
    });

    // 4. VIP系统测试
    console.log('\n👑 测试VIP系统:');
    await testAPI('获取VIP信息', '/GetVIPInfo', {
        userId: TEST_USER_ID
    });

    // 5. Phase 1-3 系统测试
    console.log('\n🎁 测试Phase 1-3系统:');
    await testAPI('获取商品列表', '/GetShopProducts', {
        userId: TEST_USER_ID
    });

    await testAPI('获取邀请信息', '/GetInviteInfo', {
        userId: TEST_USER_ID
    });

    // 输出总结
    console.log('\n' + '='.repeat(60));
    console.log('📊 测试结果总结:\n');

    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / results.length;

    console.log(`总测试数: ${results.length}`);
    console.log(`通过: ${passCount} ✅`);
    console.log(`失败: ${failCount} ❌`);
    console.log(`通过率: ${((passCount / results.length) * 100).toFixed(2)}%`);
    console.log(`平均响应时间: ${avgDuration.toFixed(2)}ms`);
    console.log(`总耗时: ${totalDuration}ms`);

    if (failCount > 0) {
        console.log('\n❌ 失败的测试:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  - ${r.api}: ${r.message}`);
        });
    }

    console.log('\n' + '='.repeat(60));

    // 退出码
    process.exit(failCount > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
});
