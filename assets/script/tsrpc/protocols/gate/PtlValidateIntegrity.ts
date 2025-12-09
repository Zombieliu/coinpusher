/**
 * 🔒 客户端代码完整性验证协议
 */

export interface ReqValidateIntegrity {
    clientVersion: string;              // 客户端版本号
    fileHashes: {
        [filePath: string]: string;     // 文件路径 -> SHA-256哈希
    };
}

export interface ResValidateIntegrity {
    valid: boolean;                     // 验证是否通过
    serverVersion: string;              // 服务器支持的版本
    errors?: string[];                  // 验证错误列表
    missingFiles?: string[];            // 缺失的文件
    modifiedFiles?: string[];           // 被修改的文件
    action?: 'allow' | 'warn' | 'block'; // 服务器建议的操作
    message?: string;                   // 给用户的提示信息
}
