const pool = require('../database/db');

const CAMPOS_PROJETO = `
  id,
  nome,
  descricao,
  usuario_id,
  criado_em AS "criadoEm",
  atualizado_em AS "atualizadoEm"
`;

async function listarProjetos(usuarioId) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_PROJETO}
     FROM projetos
     WHERE usuario_id = $1
     ORDER BY id`,
    [usuarioId]
  );
  return resultado.rows;
}

async function buscarProjetoPorId(id, usuarioId) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_PROJETO}
     FROM projetos
     WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId]
  );
  return resultado.rows[0];
}

async function adicionarProjeto(dados, usuarioId) {
  const resultado = await pool.query(
    `INSERT INTO projetos (nome, descricao, usuario_id)
     VALUES ($1, $2, $3)
     RETURNING ${CAMPOS_PROJETO}`,
    [dados.nome, dados.descricao || null, usuarioId]
  );
  return resultado.rows[0];
}

async function atualizarProjeto(id, dadosNovos, usuarioId) {
  const campos = [];
  const valores = [];

  if (dadosNovos.nome !== undefined) {
    valores.push(dadosNovos.nome);
    campos.push(`nome = $${valores.length}`);
  }

  if (dadosNovos.descricao !== undefined) {
    valores.push(dadosNovos.descricao);
    campos.push(`descricao = $${valores.length}`);
  }

  if (campos.length === 0) {
    return buscarProjetoPorId(id, usuarioId);
  }

  valores.push(id, usuarioId);
  const resultado = await pool.query(
    `UPDATE projetos
     SET ${campos.join(', ')}, atualizado_em = NOW()
     WHERE id = $${valores.length - 1} AND usuario_id = $${valores.length}
     RETURNING ${CAMPOS_PROJETO}`,
    valores
  );
  return resultado.rows[0] || null;
}

async function deletarProjeto(id, usuarioId) {
  const resultado = await pool.query(
    'DELETE FROM projetos WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [id, usuarioId]
  );
  return resultado.rowCount > 0;
}

module.exports = {
  listarProjetos,
  buscarProjetoPorId,
  adicionarProjeto,
  atualizarProjeto,
  deletarProjeto,
};
