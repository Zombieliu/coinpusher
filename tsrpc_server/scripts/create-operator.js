#!/usr/bin/env node
/**
 * 快速创建运营人员账号脚本
 *
 * 使用方法：
 * node scripts/create-operator.js <用户名> <密码> <邮箱>
 *
 * 示例：
 * node scripts/create-operator.js operator001 MyPassword123! operator@company.com
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB 连接配置
const MONGO_URI = process.env.MONGO_URI || 'mongodb://coinpusher_app:coinpusher_secure_password_2025@localhost:27017/coinpusher_game?authSource=admin';
const DB_NAME = process.env.DB_NAME || 'coinpusher_game';

// 从命令行参数获取用户信息
const [,, username, password, email] = process.argv;

if (!username || !password || !email) {
    console.error('❌ 用法错误！');
    console.log('\n使用方法:');
    console.log('  node scripts/create-operator.js <用户名> <密码> <邮箱>');
    console.log('\n示例:');
    console.log('  node scripts/create-operator.js operator001 MyPassword123! operator@company.com');
    process.exit(1);
}

// 密码哈希函数（与 AdminUserSystem 保持一致）
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + 'admin_salt_2024').digest('hex');
}

async function createOperator() {
    let client;

    try {
        console.log('🔌 连接数据库...');
        client = await MongoClient.connect(MONGO_URI);
        const db = client.db(DB_NAME);
        const adminsCollection = db.collection('admin_users');

        // 检查用户名是否已存在
        const existingUser = await adminsCollection.findOne({ username });
        if (existingUser) {
            console.error(`❌ 用户名 "${username}" 已存在！`);
            process.exit(1);
        }

        // 检查邮箱是否已存在
        const existingEmail = await adminsCollection.findOne({ email });
        if (existingEmail) {
            console.error(`❌ 邮箱 "${email}" 已被使用！`);
            process.exit(1);
        }

        // 创建运营账号
        const operatorUser = {
            adminId: 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            username: username,
            passwordHash: hashPassword(password),
            role: 'operator',  // 运营人员角色
            email: email,
            status: 'active',
            createdAt: Date.now(),
            permissions: [] // 使用默认角色权限
        };

        console.log('✨ 创建运营账号...');
        await adminsCollection.insertOne(operatorUser);

        console.log('\n✅ 运营账号创建成功！');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`👤 用户名:     ${username}`);
        console.log(`🔑 密码:       ${password}`);
        console.log(`📧 邮箱:       ${email}`);
        console.log(`👔 角色:       Operator (运营人员)`);
        console.log(`🆔 管理员ID:   ${operatorUser.adminId}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📋 运营人员权限:');
        console.log('  ✅ 查看用户');
        console.log('  ✅ 发送邮件（单发/群发）');
        console.log('  ✅ 管理活动');
        console.log('  ✅ 修改配置');
        console.log('  ✅ 查看统计数据');
        console.log('  ✅ 查看日志');
        console.log('  ❌ 封禁用户（无权限）');
        console.log('  ❌ 发放奖励（无权限）');
        console.log('  ❌ 管理其他管理员（无权限）');
        console.log('\n🌐 登录地址: http://localhost:3005');
        console.log('\n⚠️  请妥善保管账号密码，建议首次登录后立即修改密码！');

    } catch (error) {
        console.error('❌ 创建失败:', error.message);
        process.exit(1);
    } finally {
        if (client) {
            await client.close();
            console.log('\n🔌 数据库连接已关闭');
        }
    }
}

createOperator();
