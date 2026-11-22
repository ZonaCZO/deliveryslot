import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${hash.toString('hex')}`;
}
const dummy = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`;
export async function verifyPassword(password, encoded) {
  const valid = typeof encoded === 'string' && /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded);
  const [, salt, expected] = (valid ? encoded : dummy).split('$');
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(expected, 'hex')) && valid;
}
