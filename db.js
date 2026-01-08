// db.js
const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.SQL_SERVER,                 // localhost
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  port: process.env.SQL_PORT ? parseInt(process.env.SQL_PORT, 10) : undefined, // 1433
  options: {
    encrypt: process.env.SQL_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_TRUSTCERT === 'true',
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

async function query(q, params = []) {
  await poolConnect;
  const r = pool.request();
  params.forEach(p => r.input(p.name, p.type, p.value));
  return r.query(q);
}
async function proc(name, params = []) {
  await poolConnect;
  const r = pool.request();
  params.forEach(p => r.input(p.name, p.type, p.value));
  return r.execute(name);
}
module.exports = { sql, query, proc };
