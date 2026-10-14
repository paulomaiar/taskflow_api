const { Pool } = require('pg');
require('dotenv').config();

const ssl = process.env.DATABASE_URL || process.env.PGSSLMODE
  ? { rejectUnauthorized: true }
  : false;

const pool = new Pool(process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || 'taskflow',
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      ssl,
    });

module.exports = pool;
