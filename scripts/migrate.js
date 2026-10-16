const fs = require('fs');
const path = require('path');
const pool = require('../src/database/db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const MIGRATION_TABLE = 'taskflow_schema_migrations';

async function aplicarMigracoes() {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const arquivos = fs.readdirSync(MIGRATIONS_DIR)
      .filter(arquivo => /^\d+_[\w-]+\.sql$/.test(arquivo))
      .sort();

    for (const arquivo of arquivos) {
      await client.query('BEGIN');
      try {
        await client.query('SELECT pg_advisory_xact_lock($1)', [731904212]);
        const aplicada = await client.query(
          `SELECT 1 FROM ${MIGRATION_TABLE} WHERE filename = $1`,
          [arquivo]
        );

        if (aplicada.rowCount > 0) {
          await client.query('COMMIT');
          continue;
        }

        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, arquivo), 'utf8');
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATION_TABLE} (filename) VALUES ($1)`,
          [arquivo]
        );
        await client.query('COMMIT');
        console.log(`Migração aplicada: ${arquivo}`);
      } catch (erro) {
        await client.query('ROLLBACK');
        throw erro;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

aplicarMigracoes().catch(erro => {
  console.error('Falha ao aplicar migrações:', erro.message);
  process.exitCode = 1;
});
