import { createApp } from './app.js';
import { createJsonBackend } from './services/json-delivery.js';
const mode = process.env.DATA_MODE || 'json';
if (!['json', 'mysql'].includes(mode)) throw new Error('DATA_MODE must be json or mysql');
let pool, options;
if (mode === 'mysql') {
  const { createPool } = await import('./db/pool.js');
  pool = createPool(); await pool.execute('SELECT 1'); options = {};
} else {
  pool = { end: async () => {} }; options = await createJsonBackend();
}
const server = createApp(pool, options).listen(Number(process.env.PORT || 3000), () => console.log(`DockPoint API ready (${mode} mode)`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
});
