import { randomBytes, createHash } from 'node:crypto';
import { requireThat } from '../utils/errors.js';
import { mysqlUsers } from '../db/users.js';
const digest = token => createHash('sha256').update(token).digest('hex');
export function createAuth(pool, ttlSeconds = 28800, users = mysqlUsers(pool)) {
  const sessions = new Map();
  const prune = () => { for (const [key, session] of sessions) if (session.expiresAt <= Date.now()) sessions.delete(key); };
  const timer = setInterval(prune, 60000); timer.unref();
  return {
    issue(user) {
      prune(); requireThat(sessions.size < 10000, 503, 'Too many active sessions');
      const token = randomBytes(32).toString('hex');
      sessions.set(digest(token), { userId: user.id, expiresAt: Date.now() + ttlSeconds * 1000 }); return token;
    },
    revoke(token) { sessions.delete(digest(token)); },
    middleware: async (req, res, next) => {
      const token = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization || '')?.[1];
      const session = token && sessions.get(digest(token));
      requireThat(session && session.expiresAt > Date.now(), 401, 'Authentication required');
      const user = await users.byId(session.userId);
      requireThat(user, 401, 'Authentication required');
      req.user = user; req.token = token; next();
    },
  };
}
export const role = expected => (req, res, next) => { requireThat(req.user.role === expected, 403, 'Forbidden'); next(); };
