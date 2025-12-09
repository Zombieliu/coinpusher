import { MongoClient } from 'mongodb';

const TOKEN = '8dd53a8adb277d910d75f651b02ab6bb04fdb51a7cc52f171eb76cc724441646';

async function checkToken() {
    const client = new MongoClient('mongodb://localhost:27017');

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('coinpusher_game');

        // 查找 session
        const session = await db.collection('admin_sessions').findOne({ token: TOKEN });
        console.log('\nSession 信息:');
        console.log(JSON.stringify(session, null, 2));

        if (session) {
            // 查找对应的管理员
            const admin = await db.collection('admin_users').findOne({ adminId: session.adminId });
            console.log('\n管理员信息:');
            console.log(JSON.stringify({
                adminId: admin?.adminId,
                username: admin?.username,
                role: admin?.role,
                status: admin?.status
            }, null, 2));

            // 检查权限
            console.log('\n该角色的权限:');
            const rolePermissions = {
                'super_admin': '所有权限',
                'operator': 'view_users, send_mail, send_broadcast_mail, view_config, edit_config, view_events, edit_events, view_statistics, view_logs',
                'customer_service': 'view_users, ban_users, grant_rewards, send_mail, view_logs',
                'analyst': 'view_users, view_config, view_events, view_statistics, view_logs'
            };
            console.log(rolePermissions[admin?.role as string] || '未知角色');
        } else {
            console.log('\n⚠️  Session 不存在或已过期');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

checkToken();
