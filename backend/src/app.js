import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRouter } from './routes/api.js';
import { createAuth } from './middleware/auth.js';
import { DeliveryService } from './services/delivery.js';
export function createApp(pool, options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    req.body ??= {}; next();
  });
  app.get('/health', async (req, res) => {
    if (options.databaseDisabled) return res.json({ status: 'ok', database: 'disabled' });
    await pool.execute('SELECT 1'); res.json({ status: 'ok' });
  });
  if (options.databaseDisabled) {
    app.use((req, res) => res.status(503).json({ error: 'Database temporarily disabled' }));
    return app;
  }
  const ttl = Number(process.env.SESSION_TTL_SECONDS || 28800);
  if (!Number.isInteger(ttl) || ttl < 1) throw new Error('Invalid SESSION_TTL_SECONDS');
  app.use(apiRouter(pool, options.service || new DeliveryService(pool), options.auth || createAuth(pool, ttl)));
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  app.use((error, req, res, next) => {
    const status = error.status >= 400 && error.status <= 599 ? error.status : 500;
    if (status === 500) console.error(error);
    res.status(status).json({ error: status === 500 ? 'Internal server error' : error.type === 'entity.parse.failed' ? 'Invalid JSON' : error.message });
  });
  return app;
}
