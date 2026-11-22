import { createApp } from './app.js';
// MySQL temporarily disabled. Restore these lines when the database is ready:
// import { createPool } from './db/pool.js';
// const pool = createPool();
// await pool.execute('SELECT 1');
const pool = { end: async () => {} };
// Remove databaseDisabled when restoring the MySQL pool above.
const server = createApp(pool, { databaseDisabled: true }).listen(Number(process.env.PORT || 3000), () => console.log('DockPoint API ready (database disabled)'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  server.close(async () => { await pool.end(); process.exit(0); });
  setTimeout(() => process.exit(1), 10000).unref();
});
