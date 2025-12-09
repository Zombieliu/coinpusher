/**
 * 批量修复所有管理后台API文件
 * 1. 移除 .ts 扩展名
 * 2. 确保从协议文件导入类型定义
 * 3. 移除本地接口定义
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src/server/gate/api/admin');
const protocolDir = '../../../../tsrpc/protocols/gate/admin';

// 需要修复的API文件列表
const apiFiles = [
    'ApiAdminLogin.ts',
    'ApiGetStatistics.ts',
    'ApiGetUsers.ts',
    'ApiGetUserDetail.ts',
    'ApiBanUser.ts',
    'ApiUnbanUser.ts',
    'ApiGrantReward.ts',
    'ApiSendMail.ts',
    'ApiGetEvents.ts',
    'ApiCreateEvent.ts',
    'ApiUpdateEvent.ts',
    'ApiDeleteEvent.ts',
    'ApiGetConfig.ts',
    'ApiUpdateConfig.ts',
    'ApiGetConfigHistory.ts',
    'ApiRollbackConfig.ts',
    'ApiGetLogs.ts',
    'ApiGetNotifications.ts',
    'ApiBatchBanUsers.ts',
    'ApiBatchSendMail.ts',
    'ApiGetLogAnalytics.ts'
];

let fixedCount = 0;
let skippedCount = 0;

console.log('🔧 开始修复API文件...\n');

apiFiles.forEach(filename => {
    const apiPath = path.join(apiDir, filename);
    const protocolName = filename.replace('Api', 'Ptl').replace('.ts', '');

    // API名称 (去掉Api前缀)
    const apiName = filename.replace('Api', '').replace('.ts', '');
    const reqType = `Req${apiName}`;
    const resType = `Res${apiName}`;

    if (!fs.existsSync(apiPath)) {
        console.log(`⚠️  ${filename} 不存在，跳过`);
        skippedCount++;
        return;
    }

    let content = fs.readFileSync(apiPath, 'utf8');
    let modified = false;

    console.log(`🔨 检查 ${filename}...`);

    // 1. 修复 .ts 扩展名问题
    const wrongImportPattern1 = new RegExp(`from ["']${protocolDir}/${protocolName}\\.ts["']`, 'g');
    const wrongImportPattern2 = new RegExp(`from ["'].*protocols/gate/admin/Ptl.*\\.ts["']`, 'g');

    if (wrongImportPattern1.test(content) || wrongImportPattern2.test(content)) {
        console.log(`  ⚠️  发现 .ts 扩展名，正在移除...`);
        content = content.replace(wrongImportPattern1, `from "${protocolDir}/${protocolName}"`);
        content = content.replace(wrongImportPattern2, (match) => match.replace('.ts"', '"').replace(".ts'", "'"));
        modified = true;
    }

    // 2. 检查是否在文件内定义了接口
    const hasLocalReq = content.includes(`export interface ${reqType}`);
    const hasLocalRes = content.includes(`export interface ${resType}`);

    if (hasLocalReq || hasLocalRes) {
        console.log(`  ⚠️  发现本地接口定义，正在移除...`);

        // 移除本地接口定义
        content = content.replace(new RegExp(`export interface ${reqType}[\\s\\S]*?\\n}\\n`, 'g'), '');
        content = content.replace(new RegExp(`export interface ${resType}[\\s\\S]*?\\n}\\n`, 'g'), '');

        // 检查是否已有协议导入
        const correctImportPattern = new RegExp(`from ["']${protocolDir}/${protocolName}["']`);
        if (!correctImportPattern.test(content)) {
            console.log(`  ⚠️  添加协议导入...`);
            const protocolPath = `${protocolDir}/${protocolName}`;
            const importStatement = `import { ${reqType}, ${resType} } from "${protocolPath}";\n`;

            // 找到第一个import语句
            const firstImportMatch = content.match(/import.*from.*;\n/);
            if (firstImportMatch) {
                const insertPos = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length;
                content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
            } else {
                // 如果没有import，在文件开头添加
                content = importStatement + '\n' + content;
            }
        }

        modified = true;
    }

    if (modified) {
        // 清理多余的空行
        content = content.replace(/\n{3,}/g, '\n\n');

        // 写回文件
        fs.writeFileSync(apiPath, content, 'utf8');
        console.log(`  ✅ 已修复`);
        fixedCount++;
    } else {
        console.log(`  ✓ 无需修复`);
        skippedCount++;
    }
});

console.log('\n' + '='.repeat(60));
console.log('📊 修复总结:');
console.log(`  ✅ 已修复: ${fixedCount}`);
console.log(`  ⏭️  跳过: ${skippedCount}`);
console.log(`  📁 总计: ${apiFiles.length}`);
console.log('='.repeat(60));

if (fixedCount > 0) {
    console.log('\n⏭️  下一步: 验证TypeScript编译');
}
