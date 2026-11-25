import { randomBytes, scrypt as callback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(callback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await scrypt(password, salt, 64)).toString('hex')}`;
}
export async function verifyPassword(password, encoded) {
  const valid = typeof encoded === 'string' && /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded);
  const [, salt, expected] = (valid ? encoded : `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`).split('$');
  return timingSafeEqual(await scrypt(password, salt, 64), Buffer.from(expected, 'hex')) && valid;
}
