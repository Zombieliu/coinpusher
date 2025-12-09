import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { MongoDBService } from '../gate/db/MongoDBService';

/**
 * 🔒 Encrypted Backup System
 *
 * 加密备份系统，确保敏感数据安全存储:
 * - AES-256-GCM 加密
 * - 定期自动备份
 * - 完整性验证
 * - 安全密钥管理
 *
 * 备份内容:
 * - 用户数据
 * - 审计日志
 * - 管理员账户
 * - 配置数据
 */

export interface BackupMetadata {
    timestamp: number;
    collections: string[];
    encrypted: boolean;
    algorithm: string;
    iv?: string;
    authTag?: string;
    checksum: string;
}

export interface BackupConfig {
    backupDir?: string;
    encryptionKey?: string;
    autoBackup?: boolean;
    backupInterval?: number;  // 毫秒
    maxBackups?: number;      // 保留最多N个备份
    collections?: string[];   // 要备份的集合
}

export class EncryptedBackup {
    private static readonly DEFAULT_BACKUP_DIR = './backups';
    private static readonly ALGORITHM = 'aes-256-gcm';
    private static readonly KEY_LENGTH = 32;  // 256 bits

    private static config: BackupConfig;
    private static backupTimer?: NodeJS.Timeout;

    /**
     * 🔒 初始化备份系统
     */
    static initialize(config?: BackupConfig): void {
        this.config = {
            backupDir: config?.backupDir || this.DEFAULT_BACKUP_DIR,
            encryptionKey: config?.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY,
            autoBackup: config?.autoBackup !== false,
            backupInterval: config?.backupInterval || 24 * 60 * 60 * 1000,  // 24小时
            maxBackups: config?.maxBackups || 7,  // 保留7个备份
            collections: config?.collections || [
                'users',
                'admin_users',
                'admin_sessions',
                'admin_logs',
                'audit_logs',
                'game_config'
            ]
        };

        // 创建备份目录
        if (!fs.existsSync(this.config.backupDir!)) {
            fs.mkdirSync(this.config.backupDir!, { recursive: true });
        }

        // 验证加密密钥
        if (!this.config.encryptionKey) {
            console.warn('⚠️ [EncryptedBackup] No encryption key provided, backups will not be encrypted');
        } else if (Buffer.from(this.config.encryptionKey, 'hex').length !== this.KEY_LENGTH) {
            throw new Error(`Encryption key must be ${this.KEY_LENGTH * 2} hex characters (${this.KEY_LENGTH} bytes)`);
        }

        // 启动自动备份
        if (this.config.autoBackup) {
            this.startAutoBackup();
        }

        console.log(`🔒 [EncryptedBackup] Initialized (dir: ${this.config.backupDir})`);
    }

    /**
     * 🔒 创建加密备份
     */
    static async createBackup(): Promise<{
        success: boolean;
        backupFile?: string;
        error?: string;
    }> {
        try {
            const timestamp = Date.now();
            const backupData: any = {
                metadata: {
                    timestamp,
                    version: '1.0',
                    serverVersion: process.env.npm_package_version || 'unknown'
                },
                collections: {}
            };

            // 备份所有配置的集合
            for (const collectionName of this.config.collections!) {
                try {
                    const collection = MongoDBService.getCollection(collectionName);
                    const documents = await collection.find({}).toArray();

                    backupData.collections[collectionName] = documents;
                    console.log(`🔒 [EncryptedBackup] Backed up ${documents.length} documents from ${collectionName}`);
                } catch (error) {
                    console.error(`⚠️ [EncryptedBackup] Failed to backup ${collectionName}:`, error);
                }
            }

            // 序列化数据
            const jsonData = JSON.stringify(backupData, null, 2);

            // 计算校验和
            const checksum = crypto.createHash('sha256').update(jsonData).digest('hex');

            // 加密 (如果有密钥)
            let finalData: Buffer;
            let metadata: BackupMetadata;

            if (this.config.encryptionKey) {
                const { encrypted, iv, authTag } = this.encrypt(jsonData);
                finalData = encrypted;

                metadata = {
                    timestamp,
                    collections: this.config.collections!,
                    encrypted: true,
                    algorithm: this.ALGORITHM,
                    iv: iv.toString('hex'),
                    authTag: authTag.toString('hex'),
                    checksum
                };
            } else {
                finalData = Buffer.from(jsonData);

                metadata = {
                    timestamp,
                    collections: this.config.collections!,
                    encrypted: false,
                    algorithm: 'none',
                    checksum
                };
            }

            // 写入文件
            const filename = `backup_${timestamp}.enc`;
            const filepath = path.join(this.config.backupDir!, filename);

            // 写入元数据
            const metadataFile = filepath + '.meta';
            fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

            // 写入备份数据
            fs.writeFileSync(filepath, finalData);

            console.log(`✅ [EncryptedBackup] Backup created: ${filename}`);

            // 清理旧备份
            this.cleanOldBackups();

            return {
                success: true,
                backupFile: filename
            };
        } catch (error) {
            console.error('❌ [EncryptedBackup] Backup failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 🔒 恢复备份
     */
    static async restoreBackup(backupFile: string): Promise<{
        success: boolean;
        restoredCollections?: string[];
        error?: string;
    }> {
        try {
            const filepath = path.join(this.config.backupDir!, backupFile);
            const metadataFile = filepath + '.meta';

            // 读取元数据
            if (!fs.existsSync(metadataFile)) {
                throw new Error('Metadata file not found');
            }

            const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));

            // 读取备份数据
            const encryptedData = fs.readFileSync(filepath);

            // 解密 (如果需要)
            let jsonData: string;

            if (metadata.encrypted) {
                if (!this.config.encryptionKey) {
                    throw new Error('Encryption key required to restore encrypted backup');
                }

                const decrypted = this.decrypt(
                    encryptedData,
                    Buffer.from(metadata.iv!, 'hex'),
                    Buffer.from(metadata.authTag!, 'hex')
                );

                jsonData = decrypted;
            } else {
                jsonData = encryptedData.toString('utf-8');
            }

            // 验证校验和
            const checksum = crypto.createHash('sha256').update(jsonData).digest('hex');
            if (checksum !== metadata.checksum) {
                throw new Error('Checksum mismatch - backup file may be corrupted');
            }

            // 解析数据
            const backupData = JSON.parse(jsonData);

            // 恢复各个集合
            const restoredCollections: string[] = [];

            for (const [collectionName, documents] of Object.entries(backupData.collections)) {
                try {
                    const collection = MongoDBService.getCollection(collectionName);

                    // 清空现有数据 (谨慎!)
                    await collection.deleteMany({});

                    // 插入备份数据
                    if (Array.isArray(documents) && documents.length > 0) {
                        await collection.insertMany(documents as any[]);
                    }

                    restoredCollections.push(collectionName);
                    console.log(`✅ [EncryptedBackup] Restored ${(documents as any[]).length} documents to ${collectionName}`);
                } catch (error) {
                    console.error(`❌ [EncryptedBackup] Failed to restore ${collectionName}:`, error);
                }
            }

            console.log(`✅ [EncryptedBackup] Backup restored from ${backupFile}`);

            return {
                success: true,
                restoredCollections
            };
        } catch (error) {
            console.error('❌ [EncryptedBackup] Restore failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * 🔒 加密数据
     */
    private static encrypt(data: string): {
        encrypted: Buffer;
        iv: Buffer;
        authTag: Buffer;
    } {
        const key = Buffer.from(this.config.encryptionKey!, 'hex');
        const iv = crypto.randomBytes(16);  // IV for GCM

        const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

        const encrypted = Buffer.concat([
            cipher.update(data, 'utf8'),
            cipher.final()
        ]);

        const authTag = cipher.getAuthTag();

        return { encrypted, iv, authTag };
    }

    /**
     * 🔒 解密数据
     */
    private static decrypt(
        encrypted: Buffer,
        iv: Buffer,
        authTag: Buffer
    ): string {
        const key = Buffer.from(this.config.encryptionKey!, 'hex');

        const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);

        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final()
        ]);

        return decrypted.toString('utf8');
    }

    /**
     * 🔒 启动自动备份
     */
    private static startAutoBackup(): void {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
        }

        this.backupTimer = setInterval(() => {
            console.log('🔒 [EncryptedBackup] Starting scheduled backup...');
            this.createBackup();
        }, this.config.backupInterval!);

        console.log(`🔒 [EncryptedBackup] Auto-backup enabled (interval: ${this.config.backupInterval! / 1000 / 60} minutes)`);
    }

    /**
     * 🔒 停止自动备份
     */
    static stopAutoBackup(): void {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
            this.backupTimer = undefined;
            console.log('🔒 [EncryptedBackup] Auto-backup disabled');
        }
    }

    /**
     * 🔒 清理旧备份
     */
    private static cleanOldBackups(): void {
        try {
            const files = fs.readdirSync(this.config.backupDir!)
                .filter(f => f.startsWith('backup_') && f.endsWith('.enc'))
                .map(f => ({
                    name: f,
                    path: path.join(this.config.backupDir!, f),
                    time: fs.statSync(path.join(this.config.backupDir!, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time);  // 最新的在前

            // 删除超过限制的备份
            if (files.length > this.config.maxBackups!) {
                const toDelete = files.slice(this.config.maxBackups!);

                for (const file of toDelete) {
                    fs.unlinkSync(file.path);
                    fs.unlinkSync(file.path + '.meta');
                    console.log(`🔒 [EncryptedBackup] Deleted old backup: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('⚠️ [EncryptedBackup] Failed to clean old backups:', error);
        }
    }

    /**
     * 🔒 列出所有备份
     */
    static listBackups(): Array<{
        filename: string;
        timestamp: number;
        size: number;
        metadata: BackupMetadata;
    }> {
        const files = fs.readdirSync(this.config.backupDir!)
            .filter(f => f.startsWith('backup_') && f.endsWith('.enc'))
            .map(f => {
                const filepath = path.join(this.config.backupDir!, f);
                const metadataFile = filepath + '.meta';

                let metadata: BackupMetadata | undefined;
                if (fs.existsSync(metadataFile)) {
                    metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
                }

                return {
                    filename: f,
                    timestamp: metadata?.timestamp || 0,
                    size: fs.statSync(filepath).size,
                    metadata: metadata!
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp);

        return files;
    }

    /**
     * 🔒 验证备份完整性
     */
    static async verifyBackup(backupFile: string): Promise<{
        valid: boolean;
        errors: string[];
    }> {
        const errors: string[] = [];

        try {
            const filepath = path.join(this.config.backupDir!, backupFile);
            const metadataFile = filepath + '.meta';

            // 检查文件存在
            if (!fs.existsSync(filepath)) {
                errors.push('Backup file not found');
                return { valid: false, errors };
            }

            if (!fs.existsSync(metadataFile)) {
                errors.push('Metadata file not found');
                return { valid: false, errors };
            }

            // 读取元数据
            const metadata: BackupMetadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));

            // 读取备份数据
            const encryptedData = fs.readFileSync(filepath);

            // 解密
            let jsonData: string;

            if (metadata.encrypted) {
                if (!this.config.encryptionKey) {
                    errors.push('Encryption key required');
                    return { valid: false, errors };
                }

                try {
                    jsonData = this.decrypt(
                        encryptedData,
                        Buffer.from(metadata.iv!, 'hex'),
                        Buffer.from(metadata.authTag!, 'hex')
                    );
                } catch (e) {
                    errors.push('Decryption failed - invalid key or corrupted data');
                    return { valid: false, errors };
                }
            } else {
                jsonData = encryptedData.toString('utf-8');
            }

            // 验证校验和
            const checksum = crypto.createHash('sha256').update(jsonData).digest('hex');
            if (checksum !== metadata.checksum) {
                errors.push('Checksum mismatch - file may be corrupted');
            }

            // 验证JSON格式
            try {
                JSON.parse(jsonData);
            } catch (e) {
                errors.push('Invalid JSON format');
            }

            return {
                valid: errors.length === 0,
                errors
            };
        } catch (error) {
            errors.push(error instanceof Error ? error.message : 'Unknown error');
            return { valid: false, errors };
        }
    }

    /**
     * 🔒 生成新的加密密钥
     */
    static generateEncryptionKey(): string {
        return crypto.randomBytes(this.KEY_LENGTH).toString('hex');
    }
}

/**
 * 🔒 使用示例
 *
 * ```typescript
 * // 初始化
 * EncryptedBackup.initialize({
 *   encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
 *   autoBackup: true,
 *   backupInterval: 24 * 60 * 60 * 1000,  // 24小时
 *   maxBackups: 7
 * });
 *
 * // 手动创建备份
 * const result = await EncryptedBackup.createBackup();
 *
 * // 列出备份
 * const backups = EncryptedBackup.listBackups();
 *
 * // 恢复备份
 * await EncryptedBackup.restoreBackup('backup_1234567890.enc');
 *
 * // 验证备份
 * const verification = await EncryptedBackup.verifyBackup('backup_1234567890.enc');
 *
 * // 生成新密钥
 * const newKey = EncryptedBackup.generateEncryptionKey();
 * console.log('New encryption key:', newKey);
 * ```
 */
