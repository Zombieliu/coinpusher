import { getGateHttpUrl } from './test-env';

async function testLogin() {
    const serverUrl = getGateHttpUrl();

    try {
        // 登录
        console.log('尝试登录 admin...');
        const loginResponse = await fetch(`${serverUrl}/admin/AdminLogin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });

        const loginData = await loginResponse.json();
        console.log('登录响应:', JSON.stringify(loginData, null, 2));

        // TSRPC 返回格式是 { isSucc, res } 或 { isSucc: false, err }
        if (loginData.isSucc && loginData.res?.success) {
            console.log('\n✓ 登录成功!');
            console.log('Token:', loginData.res.token);
            console.log('用户名:', loginData.res.adminUser?.username);
            console.log('角色:', loginData.res.adminUser?.role);

            // 测试 GetLogAnalytics
            console.log('\n测试 GetLogAnalytics API...');
            const analyticsResponse = await fetch(`${serverUrl}/admin/GetLogAnalytics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    __ssoToken: loginData.res.token,
                    startTime: Date.now() - 30 * 24 * 60 * 60 * 1000,
                    endTime: Date.now()
                })
            });

            const analyticsData = await analyticsResponse.json();
            console.log('\nGetLogAnalytics 响应:', JSON.stringify(analyticsData, null, 2));

            if (analyticsData.isSucc) {
                console.log('\n✓ GetLogAnalytics 调用成功!');
                console.log('总操作数:', analyticsData.res.totalOperations);
                console.log('活跃管理员:', analyticsData.res.activeAdmins);
            } else {
                console.log('\n✗ GetLogAnalytics 失败:', analyticsData.err);
            }
        } else {
            console.log('\n✗ 登录失败:', loginData.err?.message || loginData.err);
        }

    } catch (error) {
        console.error('错误:', error);
    }
}

testLogin();
