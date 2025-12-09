import { HttpClient } from 'tsrpc-browser';
import { serviceProto as ServiceProtoGate } from './tsrpc_server/src/tsrpc/protocols/ServiceProtoGate';
import { getGateHttpUrl } from './test-env';

async function testLogin() {
    // 创建客户端
    const client = new HttpClient(ServiceProtoGate, {
        server: getGateHttpUrl(),
        json: true,
        logger: console
    });

    try {
        // 登录
        console.log('尝试登录...');
        const loginResult = await client.callApi('admin/AdminLogin', {
            username: 'admin',
            password: 'admin123'
        });

        if (loginResult.isSucc && loginResult.res.success) {
            console.log('✓ 登录成功!');
            console.log('\n=== 登录信息 ===');
            console.log('Token:', loginResult.res.token);
            console.log('用户名:', loginResult.res.adminUser?.username);
            console.log('角色:', loginResult.res.adminUser?.role);
            console.log('\n请使用这个 token 访问管理API');

            // 测试 GetLogAnalytics
            console.log('\n测试 GetLogAnalytics API...');
            const analyticsResult = await client.callApi('admin/GetLogAnalytics', {
                __ssoToken: loginResult.res.token,
                startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
                endTime: Date.now()
            });

            if (analyticsResult.isSucc) {
                console.log('✓ GetLogAnalytics 调用成功!');
                console.log('总操作数:', analyticsResult.res.totalOperations);
                console.log('活跃管理员:', analyticsResult.res.activeAdmins);
            } else {
                console.log('✗ GetLogAnalytics 失败:', analyticsResult.err);
            }
        } else {
            console.log('✗ 登录失败:', loginResult.isSucc ? loginResult.res.error : loginResult.err);
        }

    } catch (error) {
        console.error('错误:', error);
    }
}

testLogin();
