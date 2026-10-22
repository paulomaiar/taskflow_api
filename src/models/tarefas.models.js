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
  projeto_id,
  projeto_id AS "projetoId",
  usuario_id,
  usuario_id AS "usuarioId",
  idprioridade,
  criado_por_id AS "criadoPorId",
  criado_em AS "criadoEm",
  atualizado_em AS "atualizadoEm"
`;

const COLUNAS_ATUALIZAVEIS = {
  texto: 'texto',
  coluna: 'coluna',
  ordem: 'ordem',
  projetoId: 'projeto_id',
  usuarioId: 'usuario_id',
  idprioridade: 'idprioridade',
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
     FROM buscar_tarefas_usuario($1)`,
    [usuarioId]
  );
  return resultado.rows;
}

async function avancarTarefa(id, usuarioId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const autorizacao = await client.query(
      `SELECT id FROM tarefas
       WHERE id = $1 AND (criado_por_id = $2 OR usuario_id = $2)
       FOR UPDATE`,
      [id, usuarioId]
    );

    if (autorizacao.rowCount === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const resultado = await client.query(
      `SELECT ${CAMPOS_TAREFA}
       FROM avancar_tarefa($1)`,
      [id]
    );

    await client.query('COMMIT');
    return resultado.rows[0] || null;
  } catch (erro) {
    await client.query('ROLLBACK');
    if (erro.code === 'P0001' &&
        erro.message === 'Limite de 2 tarefas em andamento por usuário atingido') {
      erro.code = 'TASK_IN_PROGRESS_LIMIT';
    }
    throw erro;
  } finally {
    client.release();
  }
}

async function limparTarefasConcluidas(projetoId, usuarioId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const autorizacao = await client.query(
      'SELECT id FROM projetos WHERE id = $1 AND usuario_id = $2 FOR UPDATE',
      [projetoId, usuarioId]
    );

    if (autorizacao.rowCount === 0) {
      await client.query('ROLLBACK');
      return false;
    }

    await client.query('CALL limpar_tarefas_concluidas($1)', [projetoId]);
    await client.query('COMMIT');
    return true;
  } catch (erro) {
    await client.query('ROLLBACK');
    throw erro;
  } finally {
    client.release();
  }
}

async function buscarTarefaPorId(id, usuarioId) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_TAREFA}
     FROM tarefas
     WHERE id = $1 AND (criado_por_id = $2 OR usuario_id = $2)`,
    [id, usuarioId]
  );
  return resultado.rows[0];
}

async function buscarPorUsuarioId(usuarioId) {
  const resultado = await pool.query(
    `SELECT ${CAMPOS_TAREFA}
     FROM tarefas
     WHERE criado_por_id = $1 OR usuario_id = $1
     ORDER BY projeto_id, ordem, id`,
    [usuarioId]
  );
  return resultado.rows;
}

async function contarTarefasEmAndamento(usuarioId, idIgnorado = null) {
  return contarEmAndamento(pool, usuarioId, idIgnorado);
}

async function adicionarTarefa(dados, criadorId) {
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
      `INSERT INTO tarefas (
         texto, coluna, ordem, projeto_id, usuario_id, criado_por_id, idprioridade
       )
       SELECT $1, $2, $3, $4, $5, $6, $7
       FROM projetos
       WHERE id = $4 AND usuario_id = $6
         AND EXISTS (SELECT 1 FROM usuarios WHERE id = $5)
         AND EXISTS (SELECT 1 FROM prioridades WHERE id = $7)
       RETURNING ${CAMPOS_TAREFA}`,
      [
        dados.texto,
        coluna,
        dados.ordem ?? 0,
        projetoId,
        dados.usuarioId,
        criadorId,
        dados.idprioridade,
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
    .filter(([campo, valor]) => campo !== 'id' && valor !== undefined);

  for (const [campo] of atualizacoes) {
    if (!Object.prototype.hasOwnProperty.call(COLUNAS_ATUALIZAVEIS, campo)) {
      throw new Error(`Campo de tarefa não suportado pelo banco de dados: ${campo}`);
    }
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const atual = await client.query(
      `SELECT ${CAMPOS_TAREFA},
              iniciada_em AS "iniciadaEm"
       FROM tarefas
       WHERE id = $1 AND (criado_por_id = $2 OR usuario_id = $2)
       FOR UPDATE`,
      [id, usuarioId]
    );

    if (atual.rowCount === 0) {
      await client.query('COMMIT');
      return null;
    }

    const tarefaAtual = atual.rows[0];
    if (Number(tarefaAtual.criadoPorId) !== Number(usuarioId) &&
        atualizacoes.some(([campo]) => campo !== 'coluna')) {
      await client.query('ROLLBACK');
      const erro = new Error('Somente o criador pode alterar texto, projeto ou responsável');
      erro.code = 'TASK_PERMISSION_DENIED';
      throw erro;
    }

    const colunaAtual = normalizarStatus(tarefaAtual.coluna);
    const atualizacoesMapeadas = atualizacoes.map(([campo, valor]) => [
      COLUNAS_ATUALIZAVEIS[campo],
      campo === 'coluna' ? normalizarStatus(valor) : valor,
    ]);
    const valoresPorColuna = Object.fromEntries(atualizacoesMapeadas);
    const projetoId = valoresPorColuna.projeto_id ?? tarefaAtual.projeto_id;
    const coluna = valoresPorColuna.coluna ?? colunaAtual;
    const responsavelId = valoresPorColuna.usuario_id ?? tarefaAtual.usuario_id;
    const concluidoEm = valoresPorColuna.coluna === 'done' ? new Date() : null;
    const iniciadoEm = valoresPorColuna.coluna === 'doing' &&
      !tarefaAtual.iniciadaEm
      ? new Date()
      : tarefaAtual.iniciadaEm;

    if (coluna === 'doing' &&
        (colunaAtual !== 'doing' || responsavelId !== tarefaAtual.usuario_id)) {
      await bloquearUsuario(client, responsavelId);
      if (await contarEmAndamento(client, responsavelId, id) >= 2) {
        throw criarErroLimiteAndamento();
      }
    }

    if (projetoId !== tarefaAtual.projeto_id) {
      if (!await validarProjetoDoUsuario(client, projetoId, Number(tarefaAtual.criadoPorId))) {
        await client.query('ROLLBACK');
        return null;
      }
    }

    if (valoresPorColuna.usuario_id !== undefined) {
      const usuarioExiste = await client.query(
        'SELECT id FROM usuarios WHERE id = $1',
        [responsavelId]
      );
      if (usuarioExiste.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
    }

    if (valoresPorColuna.idprioridade !== undefined) {
      const prioridadeExiste = await client.query(
        'SELECT id FROM prioridades WHERE id = $1',
        [valoresPorColuna.idprioridade]
      );
      if (prioridadeExiste.rowCount === 0) {
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
    valores.push(concluidoEm);
    assignments.push(`concluido_em = $${valores.length}`);
    valores.push(iniciadoEm);
    assignments.push(`iniciada_em = $${valores.length}`);
    valores.push(id);

    const resultado = await client.query(
      `UPDATE tarefas
       SET ${assignments.join(', ')}, atualizado_em = NOW()
       WHERE id = $${valores.length}
         AND (criado_por_id = $${valores.length + 1} OR usuario_id = $${valores.length + 1})
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
    'DELETE FROM tarefas WHERE id = $1 AND criado_por_id = $2 RETURNING id',
    [id, usuarioId]
  );
  return resultado.rowCount > 0;
}

module.exports = {
  listarTarefas,
  avancarTarefa,
  limparTarefasConcluidas,
  buscarTarefaPorId,
  buscarPorUsuarioId,
  contarTarefasEmAndamento,
  adicionarTarefa,
  atualizarTarefa,
  deletarTarefa
};
