import { ApiCall } from "tsrpc";
import { ReqValidateIntegrity, ResValidateIntegrity } from "../../../tsrpc/protocols/gate/PtlValidateIntegrity";
import { IntegrityValidator } from "../../utils/IntegrityValidator";

/**
 * 🔒 客户端代码完整性验证 API
 *
 * 客户端在登录后调用此接口上报文件哈希
 * 服务器验证代码完整性，防止作弊
 */
export async function ApiValidateIntegrity(call: ApiCall<ReqValidateIntegrity, ResValidateIntegrity>) {
    const { clientVersion, fileHashes } = call.req;

    // 1. 检查版本是否受支持
    if (!IntegrityValidator.isVersionSupported(clientVersion)) {
        const latestVersion = IntegrityValidator.getLatestVersion();
        const supportedVersions = IntegrityValidator.getRegisteredVersions();

        call.succ({
            valid: false,
            serverVersion: latestVersion || 'unknown',
            action: 'warn',
            message: `客户端版本 ${clientVersion} 不受支持。支持的版本：${supportedVersions.join(', ')}`
        });
        return;
    }

    // 2. 验证文件哈希
    const validation = IntegrityValidator.validateClientCode(clientVersion, fileHashes);

    if (!validation.valid) {
        // 🔒 记录可疑的完整性验证失败
        console.warn(`[IntegrityValidator] Client integrity check failed for version ${clientVersion}:`, {
            errors: validation.errors,
            missingFiles: validation.missingFiles,
            modifiedFiles: validation.modifiedFiles
        });

        // 根据配置决定是警告还是阻止
        const strictMode = process.env.INTEGRITY_CHECK_STRICT === 'true';

        call.succ({
            valid: false,
            serverVersion: clientVersion,
            errors: validation.errors,
            missingFiles: validation.missingFiles,
            modifiedFiles: validation.modifiedFiles,
            action: strictMode ? 'block' : 'warn',
            message: strictMode
                ? '检测到客户端代码被修改，无法继续游戏。请重新下载官方版本。'
                : '检测到客户端代码异常，可能影响游戏体验。'
        });
        return;
    }

    // 3. 验证通过
    call.succ({
        valid: true,
        serverVersion: clientVersion,
        action: 'allow',
        message: '客户端验证通过'
    });
}
