/**
 * 最终修复所有管理后台API文件
 * 彻底移除本地接口定义
 */

const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src/server/gate/api/admin');

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

console.log('🔧 最终修复API文件...\n');

apiFiles.forEach(filename => {
    const apiPath = path.join(apiDir, filename);
    const apiName = filename.replace('Api', '').replace('.ts', '');
    const reqType = `Req${apiName}`;
    const resType = `Res${apiName}`;

    if (!fs.existsSync(apiPath)) {
        console.log(`⚠️  ${filename} 不存在，跳过`);
        return;
    }

    let content = fs.readFileSync(apiPath, 'utf8');
    let lines = content.split('\n');
    let newLines = [];
    let skipUntilCloseBrace = false;
    let interfaceName = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 检测是否是要删除的接口定义
        if (line.includes(`export interface ${reqType}`) ||
            line.includes(`export interface ${resType}`)) {
            skipUntilCloseBrace = true;
            interfaceName = line.includes(reqType) ? reqType : resType;
            console.log(`  🗑️  删除接口定义: ${interfaceName}`);
            continue;
        }

        // 跳过接口定义内容
        if (skipUntilCloseBrace) {
            if (line.trim() === '}') {
                skipUntilCloseBrace = false;
            }
            continue;
        }

        newLines.push(line);
    }

    // 清理多余空行
    let finalContent = newLines.join('\n');
    finalContent = finalContent.replace(/\n{3,}/g, '\n\n');

    // 写回文件
    if (finalContent !== content) {
        fs.writeFileSync(apiPath, finalContent, 'utf8');
        console.log(`✅ ${filename} 已修复`);
        fixedCount++;
    } else {
        console.log(`✓ ${filename} 无需修复`);
    }
});

console.log('\n' + '='.repeat(60));
console.log(`📊 修复完成: ${fixedCount} 个文件`);
console.log('='.repeat(60));
