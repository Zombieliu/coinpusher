import * as crypto from 'crypto';

/**
 * 🔒 客户端代码完整性校验
 *
 * 功能：
 * - 验证客户端代码未被篡改
 * - 防止作弊脚本注入
 * - 支持多版本并存
 */

export interface CodeManifest {
    version: string;           // 版本号，如 "1.0.0"
    buildTime: number;         // 构建时间戳
    files: {
        [path: string]: {
            hash: string;      // 文件SHA-256哈希
            size: number;      // 文件大小（字节）
        };
    };
    signature?: string;        // manifest的签名（用INTERNAL_SECRET_KEY签名）
}

export class IntegrityValidator {
    private static manifests: Map<string, CodeManifest> = new Map();

    /**
     * 注册代码清单
     * @param manifest 代码清单对象
     */
    static registerManifest(manifest: CodeManifest): void {
        // 验证清单签名
        if (manifest.signature) {
            const isValid = this.verifyManifestSignature(manifest);
            if (!isValid) {
                throw new Error('Invalid manifest signature');
            }
        }

        this.manifests.set(manifest.version, manifest);
        console.log(`[IntegrityValidator] Registered manifest version ${manifest.version}`);
    }

    /**
     * 从JSON文件加载清单
     * @param jsonPath 清单文件路径
     */
    static async loadManifestFromFile(jsonPath: string): Promise<void> {
        try {
            const fs = require('fs').promises;
            const content = await fs.readFile(jsonPath, 'utf-8');
            const manifest: CodeManifest = JSON.parse(content);
            this.registerManifest(manifest);
        } catch (error) {
            console.error(`[IntegrityValidator] Failed to load manifest from ${jsonPath}:`, error);
            throw error;
        }
    }

    /**
     * 验证客户端上报的文件哈希
     * @param version 客户端版本
     * @param clientHashes 客户端计算的文件哈希映射
     * @returns 验证结果
     */
    static validateClientCode(
        version: string,
        clientHashes: { [path: string]: string }
    ): {
        valid: boolean;
        errors: string[];
        missingFiles: string[];
        modifiedFiles: string[];
    } {
        const manifest = this.manifests.get(version);
        if (!manifest) {
            return {
                valid: false,
                errors: [`Unknown client version: ${version}`],
                missingFiles: [],
                modifiedFiles: []
            };
        }

        const errors: string[] = [];
        const missingFiles: string[] = [];
        const modifiedFiles: string[] = [];

        // 检查所有关键文件
        for (const [filePath, fileInfo] of Object.entries(manifest.files)) {
            const clientHash = clientHashes[filePath];

            if (!clientHash) {
                missingFiles.push(filePath);
                errors.push(`Missing file: ${filePath}`);
            } else if (clientHash !== fileInfo.hash) {
                modifiedFiles.push(filePath);
                errors.push(`Modified file: ${filePath} (expected: ${fileInfo.hash.substring(0, 8)}..., got: ${clientHash.substring(0, 8)}...)`);
            }
        }

        // 检查是否有额外的未知文件
        for (const filePath of Object.keys(clientHashes)) {
            if (!manifest.files[filePath]) {
                errors.push(`Unknown file: ${filePath}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            missingFiles,
            modifiedFiles
        };
    }

    /**
     * 生成清单签名
     * @param manifest 代码清单（不含signature字段）
     */
    static signManifest(manifest: Omit<CodeManifest, 'signature'>): string {
        const secretKey = process.env.INTERNAL_SECRET_KEY || '';
        if (!secretKey || secretKey.length < 32) {
            throw new Error('INTERNAL_SECRET_KEY not configured properly');
        }

        const dataToSign = JSON.stringify({
            version: manifest.version,
            buildTime: manifest.buildTime,
            files: manifest.files
        });

        return crypto
            .createHmac('sha256', secretKey)
            .update(dataToSign)
            .digest('hex');
    }

    /**
     * 验证清单签名
     */
    private static verifyManifestSignature(manifest: CodeManifest): boolean {
        if (!manifest.signature) {
            return false;
        }

        const expectedSignature = this.signManifest({
            version: manifest.version,
            buildTime: manifest.buildTime,
            files: manifest.files
        });

        return manifest.signature === expectedSignature;
    }

    /**
     * 计算文件哈希（工具函数，用于生成清单）
     * @param filePath 文件路径
     */
    static async computeFileHash(filePath: string): Promise<string> {
        const fs = require('fs').promises;
        const content = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * 获取已注册的版本列表
     */
    static getRegisteredVersions(): string[] {
        return Array.from(this.manifests.keys());
    }

    /**
     * 检查版本是否受支持
     */
    static isVersionSupported(version: string): boolean {
        return this.manifests.has(version);
    }

    /**
     * 获取最新版本
     */
    static getLatestVersion(): string | null {
        if (this.manifests.size === 0) {
            return null;
        }

        const versions = Array.from(this.manifests.keys());
        // 简单按字符串排序，可根据需要改为语义化版本比较
        versions.sort((a, b) => b.localeCompare(a));
        return versions[0];
    }
}
