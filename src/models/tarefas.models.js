const pool = require('../database/db');

const CAMPOS_TAREFA = `
  id,
  texto,
  CASE coluna
    WHEN 'todo' THEN 'afazer'
    WHEN 'doing' THEN 'andamento'
    WHEN 'done' THEN 'concluido'
  END AS coluna,
  ordem,
  projeto_id AS "projetoId",
  usuario_id AS "usuarioId",
  criado_em AS "criadoEm",
  atualizado_em AS "atualizadoEm"
`;

const COLUNAS_ATUALIZAVEIS = {
  texto: 'texto',
  coluna: 'coluna',
  ordem: 'ordem',
  projetoId: 'projeto_id',
};

const STATUS_PERSISTIDOS = {
  afazer: 'todo',
  andamento: 'doing',
  concluido: 'done',
};

function normalizarStatus(status) {
  if (status === undefined) return undefined;

  const valor = String(status).trim().toLowerCase();
  const statusPersistido = STATUS_PERSISTIDOS[valor];

  if (!statusPersistido) {
    throw new Error(`Status de tarefa inválido para o banco de dados: ${status}`);
  }

  return statusPersistido;
}

function criarErroLimiteAndamento() {
  const erro = new Error('Limite de 2 tarefas em andamento por usuário atingido');
  erro.code = 'TASK_IN_PROGRESS_LIMIT';
  return erro;
}

async function bloquearUsuario(client, usuarioId) {
  await client.query(
    'SELECT id FROM usuarios WHERE id = $1 FOR UPDATE',
    [usuarioId]
  );
}

async function contarEmAndamento(client, usuarioId, idIgnorado = null) {
  const resultado = await client.query(
    `SELECT COUNT(*) AS total
     FROM tarefas
     WHERE usuario_id = $1
       AND coluna = 'doing'
       AND ($2::integer IS NULL OR id <> $2)`,
    [usuarioId, idIgnorado]
  );
  return Number(resultado.rows[0].total);
}

async function validarProjetoDoUsuario(client, projetoId, usuarioId) {
  const resultado = await client.query(
    'SELECT id FROM projetos WHERE id = $1 AND usuario_id = $2',
    [projetoId, usuarioId]
  );
  return resultado.rowCount > 0;
}

async function listarTarefas(usuarioId) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_TAREFA}
     FROM tarefas
     WHERE usuario_id = $1
     ORDER BY projeto_id, ordem, id`,
    [usuarioId]
  );
  return resultado.rows;
}

async function buscarTarefaPorId(id, usuarioId) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_TAREFA}
     FROM tarefas
     WHERE id = $1 AND usuario_id = $2`,
    [id, usuarioId]
  );
  return resultado.rows[0];
}

async function buscarPorUsuarioId(usuarioId) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_TAREFA}
     FROM tarefas
     WHERE usuario_id = $1
     ORDER BY projeto_id, ordem, id`,
    [usuarioId]
  );
  return resultado.rows;
}

async function contarTarefasEmAndamento(usuarioId, idIgnorado = null) {
  return contarEmAndamento(pool, usuarioId, idIgnorado);
}

async function adicionarTarefa(dados) {
  const client = await pool.connect();
  const coluna = normalizarStatus(dados.coluna || 'afazer');
  const usuarioId = dados.usuarioId;
  const projetoId = Number(dados.projetoId);

  try {
    await client.query('BEGIN');

    if (coluna === 'doing') {
      await bloquearUsuario(client, usuarioId);
      if (await contarEmAndamento(client, usuarioId) >= 2) {
        throw criarErroLimiteAndamento();
      }
    }

    const resultado = await client.query(
      `INSERT INTO tarefas (texto, coluna, ordem, projeto_id, usuario_id)
       SELECT $1, $2, $3, $4, $5
       FROM projetos
       WHERE id = $4 AND usuario_id = $5
       RETURNING ${CAMPOS_TAREFA}`,
      [
        dados.texto,
        coluna,
        dados.ordem ?? 0,
        projetoId,
        usuarioId,
      ]
    );

    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('COMMIT');
    return resultado.rows[0];
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

async function atualizarTarefa(id, dadosNovos, usuarioId) {
  const atualizacoes = Object.entries(dadosNovos)
    .filter(([campo]) => campo !== 'id');

  for (const [campo] of atualizacoes) {
    if (!Object.prototype.hasOwnProperty.call(COLUNAS_ATUALIZAVEIS, campo)) {
      throw new Error(`Campo de tarefa não suportado pelo banco de dados: ${campo}`);
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const atual = await client.query(
      `SELECT ${CAMPOS_TAREFA}
       FROM tarefas
       WHERE id = $1 AND usuario_id = $2
       FOR UPDATE`,
      [id, usuarioId]
    );

    if (atual.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const tarefaAtual = atual.rows[0];
    const colunaAtual = normalizarStatus(tarefaAtual.coluna);
    const atualizacoesMapeadas = atualizacoes.map(([campo, valor]) => [
      COLUNAS_ATUALIZAVEIS[campo],
      campo === 'coluna' ? normalizarStatus(valor) : valor,
    ]);
    const valoresPorColuna = Object.fromEntries(atualizacoesMapeadas);
    const projetoId = valoresPorColuna.projeto_id ?? tarefaAtual.projetoId;
    const coluna = valoresPorColuna.coluna ?? colunaAtual;

    if (coluna === 'doing') {
      await bloquearUsuario(client, usuarioId);
      if (await contarEmAndamento(client, usuarioId, id) >= 2) {
        throw criarErroLimiteAndamento();
      }
    }

    if (projetoId !== tarefaAtual.projetoId) {
      if (!await validarProjetoDoUsuario(client, projetoId, usuarioId)) {
        await client.query('ROLLBACK');
        return null;
      }
    }

    if (atualizacoesMapeadas.length === 0) {
      await client.query('COMMIT');
      return tarefaAtual;
    }

    const valores = atualizacoesMapeadas.map(([, valor]) => valor);
    const assignments = atualizacoesMapeadas.map(([campo], index) =>
      `${campo} = $${index + 1}`
    );
    valores.push(id);

    const resultado = await client.query(
      `UPDATE tarefas
       SET ${assignments.join(', ')}, atualizado_em = NOW()
       WHERE id = $${valores.length} AND usuario_id = $${valores.length + 1}
       RETURNING ${CAMPOS_TAREFA}`,
      [...valores, usuarioId]
    );

    await client.query('COMMIT');
    return resultado.rows[0] || null;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

async function deletarTarefa(id, usuarioId) {
  const resultado = await pool.query(
    'DELETE FROM tarefas WHERE id = $1 AND usuario_id = $2 RETURNING id',
    [id, usuarioId]
  );
  return resultado.rowCount > 0;
}

module.exports = {
  listarTarefas,
  buscarTarefaPorId,
  buscarPorUsuarioId,
  contarTarefasEmAndamento,
  adicionarTarefa,
  atualizarTarefa,
  deletarTarefa
};
