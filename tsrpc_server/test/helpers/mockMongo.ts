import { strict as assert } from 'assert';
import crypto from 'crypto';

type Filter<T> = Partial<Record<keyof T, any>> & Record<string, any>;

function matchFilter<T extends Record<string, any>>(doc: T, filter: Filter<T>): boolean {
    return Object.entries(filter).every(([k, v]) => doc[k as keyof T] === v);
}

export class InMemoryCollection<T extends Record<string, any>> {
    private data = new Map<string, T>();

    constructor(private readonly idField: keyof T = 'orderId' as keyof T) { }

    async insertOne(doc: T) {
        const key = (doc[this.idField] as any) || crypto.randomUUID?.() || `${Date.now()}_${Math.random()}`;
        this.data.set(String(key), { ...doc, [this.idField]: key });
        return { insertedId: key };
    }

    async updateOne(filter: Filter<T>, update: any) {
        const doc = await this.findOne(filter);
        if (!doc) return { matchedCount: 0, modifiedCount: 0 };
        const targetKey = doc[this.idField] as any;
        const merged = applyUpdate(doc, update);
        this.data.set(String(targetKey), merged);
        return { matchedCount: 1, modifiedCount: 1 };
    }

    async findOne(filter: Filter<T>): Promise<T | null> {
        for (const value of this.data.values()) {
            if (matchFilter(value, filter)) return { ...value };
        }
        return null;
    }

    async findOneAndUpdate(filter: Filter<T>, update: any) {
        const doc = await this.findOne(filter);
        if (!doc) return { value: null };
        await this.updateOne(filter, update);
        return { value: await this.findOne(filter) };
    }

    async countDocuments(filter: Filter<T>) {
        let count = 0;
        for (const value of this.data.values()) {
            if (matchFilter(value, filter)) count++;
        }
        return count;
    }

    async deleteMany(filter: Filter<T>) {
        let deleted = 0;
        for (const [k, v] of this.data.entries()) {
            if (matchFilter(v, filter)) {
                this.data.delete(k);
                deleted++;
            }
        }
        return { deletedCount: deleted };
    }

    clear() {
        this.data.clear();
    }

    dump() {
        return Array.from(this.data.values());
    }
}

function applyUpdate<T extends Record<string, any>>(doc: T, update: any): T {
    if (!update || typeof update !== 'object') {
        return { ...doc };
    }
    const next = { ...doc };
    if (update.$set) {
        Object.assign(next, update.$set);
    }
    if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
            assert(typeof v === 'number', '$inc only supports numbers');
            next[k as keyof T] = ((next as any)[k] ?? 0) + v;
        }
    }
    return next;
}

// 简易 MongoDBService 替身
export class MockMongoService {
    private collections: Record<string, InMemoryCollection<any>> = {};

    getCollection<T extends Record<string, any>>(name: string, idField: keyof T = 'orderId' as any): InMemoryCollection<T> {
        if (!this.collections[name]) {
            this.collections[name] = new InMemoryCollection<T>(idField);
        }
        return this.collections[name] as InMemoryCollection<T>;
    }

    clearAll() {
        Object.values(this.collections).forEach(c => c.clear());
    }
}

export const mockMongo = new MockMongoService();

// 将真实 MongoDBService 方法指向内存替身
export function patchMongoDBService(real: any) {
    real.getCollection = (name: string) => mockMongo.getCollection(name);
    real.getDb = () => ({});
}
