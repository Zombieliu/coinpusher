import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'coinpusher';
const USERNAME = process.env.ADMIN_USERNAME || 'admin';
const NEW_PASSWORD = process.env.ADMIN_NEW_PASSWORD;

async function main() {
  if (!NEW_PASSWORD) {
    console.error('请通过环境变量 ADMIN_NEW_PASSWORD 传入新密码');
    process.exit(1);
  }

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);
  const users = db.collection('admin_users');
  const sessions = db.collection('admin_sessions');

  const hash = await bcrypt.hash(NEW_PASSWORD, 12);
  const res = await users.updateOne(
    { username: USERNAME },
    { $set: { passwordHash: hash, requirePasswordChange: false } }
  );

  if (res.matchedCount === 0) {
    console.error(`未找到管理员 ${USERNAME}`);
  } else {
    await sessions.deleteMany({ adminId: { $exists: true }, username: USERNAME });
    console.log(`已重置 ${USERNAME} 密码，并清理其会话。`);
  }

  await client.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
