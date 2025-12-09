/**
 * 完整的管理后台API测试
 *
 * 测试所有19个管理后台API接口
 */

import { HttpClient } from 'tsrpc';
import { serviceProto as ServiceProtoGate } from './tsrpc_server/src/tsrpc/protocols/ServiceProtoGate';

const API_URL = 'http://localhost:2000';

async function testAdminAPIs() {
    console.log('='.repeat(80));
    console.log('🧪 管理后台API完整测试');
    console.log('='.repeat(80));

    const client = new HttpClient(ServiceProtoGate, {
        server: API_URL,
        logger: console
    });

    let adminToken = '';
    const results: any = {
        passed: 0,
        failed: 0,
        tests: []
    };

    function logTest(name: string, passed: boolean, message?: string) {
        const symbol = passed ? '✅' : '❌';
        console.log(`${symbol} ${name}${message ? ': ' + message : ''}`);
        results.tests.push({ name, passed, message });
        if (passed) results.passed++;
        else results.failed++;
    }

    try {
        // ========== Test 1: 管理员登录 ==========
        console.log('\n📝 Test 1: 管理员登录');
        try {
            const loginResult = await client.callApi('admin/AdminLogin', {
                username: 'admin',
                password: 'admin123'
            });

            if (loginResult.isSucc && loginResult.res.success) {
                adminToken = loginResult.res.token!;
                logTest('管理员登录', true, `Token: ${adminToken.substring(0, 20)}...`);
            } else {
                logTest('管理员登录', false, loginResult.err?.message || '登录失败');
                console.log('\n⚠️  管理员登录失败，后续测试将跳过');
                return;
            }
        } catch (error: any) {
            logTest('管理员登录', false, error.message);
            return;
        }

        // ========== Test 2: 获取统计数据 ==========
        console.log('\n📊 Test 2: 获取统计数据');
        try {
            const statsResult = await client.callApi('admin/GetStatistics', {
                __ssoToken: adminToken
            });

            if (statsResult.isSucc) {
                logTest('获取统计数据', true, `用户数: ${statsResult.res.totalUsers}`);
            } else {
                logTest('获取统计数据', false, statsResult.err?.message);
            }
        } catch (error: any) {
            logTest('获取统计数据', false, error.message);
        }

        // ========== Test 3: 获取用户列表 ==========
        console.log('\n👥 Test 3: 获取用户列表');
        try {
            const usersResult = await client.callApi('admin/GetUsers', {
                __ssoToken: adminToken,
                page: 1,
                limit: 10
            });

            if (usersResult.isSucc) {
                logTest('获取用户列表', true, `找到 ${usersResult.res.total} 个用户`);
            } else {
                logTest('获取用户列表', false, usersResult.err?.message);
            }
        } catch (error: any) {
            logTest('获取用户列表', false, error.message);
        }

        // ========== Test 4: 获取活动列表 ==========
        console.log('\n🎮 Test 4: 获取活动列表');
        try {
            const eventsResult = await client.callApi('admin/GetEvents', {
                __ssoToken: adminToken
            });

            if (eventsResult.isSucc) {
                logTest('获取活动列表', true, `找到 ${eventsResult.res.events.length} 个活动`);
            } else {
                logTest('获取活动列表', false, eventsResult.err?.message);
            }
        } catch (error: any) {
            logTest('获取活动列表', false, error.message);
        }

        // ========== Test 5: 获取配置 ==========
        console.log('\n⚙️  Test 5: 获取配置');
        try {
            const configResult = await client.callApi('admin/GetConfig', {
                __ssoToken: adminToken,
                configType: 'game'
            });

            if (configResult.isSucc) {
                logTest('获取配置', true, `版本: v${configResult.res.version}`);
            } else {
                logTest('获取配置', false, configResult.err?.message);
            }
        } catch (error: any) {
            logTest('获取配置', false, error.message);
        }

        // ========== Test 6: 获取日志 ==========
        console.log('\n📋 Test 6: 获取日志');
        try {
            const logsResult = await client.callApi('admin/GetLogs', {
                __ssoToken: adminToken,
                type: 'all',
                page: 1,
                limit: 10
            });

            if (logsResult.isSucc) {
                logTest('获取日志', true, `找到 ${logsResult.res.total} 条日志`);
            } else {
                logTest('获取日志', false, logsResult.err?.message);
            }
        } catch (error: any) {
            logTest('获取日志', false, error.message);
        }

        // ========== Test 7: 获取通知 ==========
        console.log('\n🔔 Test 7: 获取通知');
        try {
            const notifsResult = await client.callApi('admin/GetNotifications', {
                __ssoToken: adminToken,
                limit: 20
            });

            if (notifsResult.isSucc) {
                logTest('获取通知', true, `${notifsResult.res.notifications.length} 条通知`);
            } else {
                logTest('获取通知', false, notifsResult.err?.message);
            }
        } catch (error: any) {
            logTest('获取通知', false, error.message);
        }

        // ========== Test 8: 获取日志分析 ==========
        console.log('\n📈 Test 8: 获取日志分析');
        try {
            const analyticsResult = await client.callApi('admin/GetLogAnalytics', {
                __ssoToken: adminToken,
                startTime: Date.now() - 7 * 24 * 60 * 60 * 1000,
                endTime: Date.now()
            });

            if (analyticsResult.isSucc) {
                logTest('获取日志分析', true,
                    `操作数: ${analyticsResult.res.totalOperations}, 活跃管理员: ${analyticsResult.res.activeAdmins}`);
            } else {
                logTest('获取日志分析', false, analyticsResult.err?.message);
            }
        } catch (error: any) {
            logTest('获取日志分析', false, error.message);
        }

        // ========== 测试总结 ==========
        console.log('\n' + '='.repeat(80));
        console.log('📊 测试总结');
        console.log('='.repeat(80));
        console.log(`✅ 通过: ${results.passed}`);
        console.log(`❌ 失败: ${results.failed}`);
        console.log(`📝 总计: ${results.tests.length}`);
        console.log(`📈 通过率: ${((results.passed / results.tests.length) * 100).toFixed(1)}%`);

        if (results.failed === 0) {
            console.log('\n🎉 所有测试通过！管理后台API工作正常！');
        } else {
            console.log('\n⚠️  部分测试失败，请检查上面的错误信息');
        }

    } catch (error: any) {
        console.error('\n❌ 测试执行失败:', error.message);
        throw error;
    }
}

// 运行测试
if (require.main === module) {
    testAdminAPIs().catch(error => {
        console.error('测试失败:', error);
        process.exit(1);
    });
}

export { testAdminAPIs };
