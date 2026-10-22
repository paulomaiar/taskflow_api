const pool = require('../database/db');

async function listarPrioridades() {
  const resultado = await pool.query(
    'SELECT id, descricao FROM prioridades ORDER BY id'
  );
  return resultado.rows;
}

async function existePrioridade(id) {
  const resultado = await pool.query(
    'SELECT id FROM prioridades WHERE id = $1',
    [id]
  );
  return resultado.rowCount > 0;
}

module.exports = { listarPrioridades, existePrioridade };
