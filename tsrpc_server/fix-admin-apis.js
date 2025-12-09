/**
 * 批量修复所有管理后台API文件
 * 确保它们从协议文件导入类型定义
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src/server/gate/api/admin');
const protocolDir = '../../../../tsrpc/protocols/gate/admin';

// 需要修复的API文件列表
const apiFiles = [
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
    const protocolName = filename.replace('Api', 'Ptl');

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

    // 检查是否已经从协议导入
    if (content.includes(`from "${protocolDir}/${protocolName}"`)) {
        console.log(`✓ ${filename} 已经修复过，跳过`);
        skippedCount++;
        return;
    }

    // 检查是否在文件内定义了接口
    const hasLocalReq = content.includes(`export interface ${reqType}`);
    const hasLocalRes = content.includes(`export interface ${resType}`);

    if (!hasLocalReq && !hasLocalRes) {
        console.log(`✓ ${filename} 无需修复，跳过`);
        skippedCount++;
        return;
    }

    console.log(`🔨 修复 ${filename}...`);

    // 移除本地接口定义
    content = content.replace(new RegExp(`export interface ${reqType}[\\s\\S]*?\\n}\\n`, 'g'), '');
    content = content.replace(new RegExp(`export interface ${resType}[\\s\\S]*?\\n}\\n`, 'g'), '');

    // 在import语句后添加协议导入（不包含.ts扩展名）
    const protocolPath = protocolDir + '/' + protocolName.replace('.ts', '');
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

    // 清理多余的空行
    content = content.replace(/\n{3,}/g, '\n\n');

    // 写回文件
    fs.writeFileSync(apiPath, content, 'utf8');
    console.log(`  ✅ 已修复`);
    fixedCount++;
});

console.log('\n' + '='.repeat(60));
console.log('📊 修复总结:');
console.log(`  ✅ 已修复: ${fixedCount}`);
console.log(`  ⏭️  跳过: ${skippedCount}`);
console.log(`  📁 总计: ${apiFiles.length}`);
console.log('='.repeat(60));

if (fixedCount > 0) {
    console.log('\n⏭️  下一步: 运行 npm run dev:gate 启动服务器');
}
