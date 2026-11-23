import mysql from 'mysql2/promise';
export function createPool() {
  return mysql.createPool({ host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'dockpoint', password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'deliveryslot',
    timezone: 'Z', waitForConnections: true, connectionLimit: 10, queueLimit: 100 });
}
