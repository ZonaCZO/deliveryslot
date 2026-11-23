import { createPool } from '../src/db/pool.js';
import { hashPassword } from '../src/utils/passwords.js';
import { email } from '../src/utils/validation.js';
const [address, role] = process.argv.slice(2);
const password = process.env.DOCKPOINT_USER_PASSWORD;
if (!['carrier', 'warehouse_staff'].includes(role) || !password || password.length < 12 || password.length > 1024) throw new Error('Set DOCKPOINT_USER_PASSWORD (12-1024 chars), then npm run user:set -- email carrier|warehouse_staff');
const pool = createPool();
try {
  await pool.execute(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash), role=VALUES(role)`, [email(address), await hashPassword(password), role]);
  console.log('Account configured');
} finally { await pool.end(); }
