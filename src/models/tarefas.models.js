const prisma = require('../database/prisma');

const incluirNomes = {
  projetos: { select: { nome: true } },
  usuarios: { select: { nome: true } },
};

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

const STATUS_PUBLICOS = {
  todo: 'afazer',
  doing: 'andamento',
  done: 'concluido',
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

function formatarTarefa(tarefa) {
  if (!tarefa) return null;

  const {
    projetos,
    usuarios,
    criado_em,
    atualizado_em,
    iniciada_em,
    concluido_em,
    criado_por_id,
    ...resto
  } = tarefa;

  return {
    ...resto,
    coluna: STATUS_PUBLICOS[tarefa.coluna] || tarefa.coluna,
    projetoId: tarefa.projeto_id,
    usuarioId: tarefa.usuario_id,
    criadoPorId: criado_por_id,
    criadoEm: criado_em,
    atualizadoEm: atualizado_em,
    iniciadaEm: iniciada_em,
    concluidoEm: concluido_em,
    projeto: projetos?.nome || null,
    usuario: usuarios?.nome || null,
  };
}

function criarErroLimiteAndamento() {
  const erro = new Error('Limite de 2 tarefas em andamento por usuário atingido');
  erro.code = 'TASK_IN_PROGRESS_LIMIT';
  return erro;
}

async function bloquearUsuario(tx, usuarioId) {
  await tx.$queryRaw`SELECT id FROM usuarios WHERE id = ${Number(usuarioId)} FOR UPDATE`;
}

async function contarEmAndamento(tx, usuarioId, idIgnorado = null) {
  return tx.tarefas.count({
    where: {
      usuario_id: Number(usuarioId),
      coluna: 'doing',
      ...(idIgnorado === null ? {} : { id: { not: Number(idIgnorado) } }),
    },
  });
}

async function validarProjetoDoUsuario(tx, projetoId, usuarioId) {
  const projeto = await tx.projetos.findFirst({
    where: {
      id: Number(projetoId),
      usuario_id: Number(usuarioId),
    },
    select: { id: true },
  });
  return Boolean(projeto);
}

async function listarTarefas(usuarioId) {
  const tarefas = await prisma.tarefas.findMany({
    where: {
      OR: [
        { criado_por_id: Number(usuarioId) },
        { usuario_id: Number(usuarioId) },
      ],
    },
    include: incluirNomes,
    orderBy: [{ projeto_id: 'asc' }, { ordem: 'asc' }, { id: 'asc' }],
  });
  return tarefas.map(formatarTarefa);
}

async function avancarTarefa(id, usuarioId) {
  return prisma.$transaction(async tx => {
    const tarefaId = Number(id);
    const usuarioAtual = Number(usuarioId);
    await tx.$queryRaw`
      SELECT id FROM tarefas
      WHERE id = ${tarefaId}
        AND (criado_por_id = ${usuarioAtual} OR usuario_id = ${usuarioAtual})
      FOR UPDATE
    `;

    const tarefa = await tx.tarefas.findFirst({
      where: {
        id: tarefaId,
        OR: [
          { criado_por_id: usuarioAtual },
          { usuario_id: usuarioAtual },
        ],
      },
    });
    if (!tarefa) return null;

    const statusAtual = normalizarStatus(
      STATUS_PUBLICOS[tarefa.coluna] || tarefa.coluna
    );
    let coluna = statusAtual;
    const data = {};

    if (statusAtual === 'todo') {
      await bloquearUsuario(tx, tarefa.usuario_id);
      if (await contarEmAndamento(tx, tarefa.usuario_id, tarefa.id) >= 2) {
        throw criarErroLimiteAndamento();
      }
      coluna = 'doing';
      if (!tarefa.iniciada_em) data.iniciada_em = new Date();
    } else if (statusAtual === 'doing') {
      coluna = 'done';
      data.concluido_em = new Date();
    }

    if (coluna !== statusAtual) data.coluna = coluna;
    const atualizada = await tx.tarefas.update({
      where: { id: tarefaId },
      data,
      include: incluirNomes,
    });
    return formatarTarefa(atualizada);
  });
}

async function limparTarefasConcluidas(projetoId, usuarioId) {
  return prisma.$transaction(async tx => {
    const projeto = await tx.projetos.findFirst({
      where: { id: Number(projetoId), usuario_id: Number(usuarioId) },
      select: { id: true },
    });
    if (!projeto) return false;

    await tx.$executeRaw`CALL limpar_tarefas_concluidas(${Number(projetoId)})`;
    return true;
  });
}

async function buscarTarefaPorId(id, usuarioId) {
  const tarefa = await prisma.tarefas.findFirst({
    where: {
      id: Number(id),
      OR: [
        { criado_por_id: Number(usuarioId) },
        { usuario_id: Number(usuarioId) },
      ],
    },
    include: incluirNomes,
  });
  return formatarTarefa(tarefa);
}

async function buscarPorUsuarioId(usuarioId) {
  const tarefas = await prisma.tarefas.findMany({
    where: {
      OR: [
        { criado_por_id: Number(usuarioId) },
        { usuario_id: Number(usuarioId) },
      ],
    },
    include: incluirNomes,
    orderBy: [{ projeto_id: 'asc' }, { ordem: 'asc' }, { id: 'asc' }],
  });
  return tarefas.map(formatarTarefa);
}

async function contarTarefasEmAndamento(usuarioId, idIgnorado = null) {
  return contarEmAndamento(prisma, usuarioId, idIgnorado);
}

async function adicionarTarefa(dados, criadorId) {
  const coluna = normalizarStatus(dados.coluna || 'afazer');
  const usuarioId = Number(dados.usuarioId);
  const projetoId = Number(dados.projetoId);
  const prioridadeId = Number(dados.idprioridade);

  return prisma.$transaction(async tx => {
    if (!await validarProjetoDoUsuario(tx, projetoId, criadorId)) return null;

    const responsavel = await tx.usuarios.findUnique({
      where: { id: usuarioId },
      select: { id: true },
    });
    if (!responsavel) return null;

    const prioridade = await tx.prioridades.findUnique({
      where: { id: prioridadeId },
      select: { id: true },
    });
    if (!prioridade) return null;

    if (coluna === 'doing') {
      await bloquearUsuario(tx, usuarioId);
      if (await contarEmAndamento(tx, usuarioId) >= 2) {
        throw criarErroLimiteAndamento();
      }
    }

    const tarefa = await tx.tarefas.create({
      data: {
        texto: dados.texto,
        coluna,
        ordem: dados.ordem ?? 0,
        projetos: { connect: { id: projetoId } },
        usuarios: { connect: { id: usuarioId } },
        criadores: { connect: { id: Number(criadorId) } },
        prioridades: { connect: { id: prioridadeId } },
        ...(coluna === 'doing' ? { iniciada_em: new Date() } : {}),
        ...(coluna === 'done' ? { concluido_em: new Date() } : {}),
      },
      include: incluirNomes,
    });
    return formatarTarefa(tarefa);
  });
}

async function atualizarTarefa(id, dadosNovos, usuarioId) {
  const atualizacoes = Object.entries(dadosNovos)
    .filter(([campo, valor]) => campo !== 'id' && valor !== undefined);

  for (const [campo] of atualizacoes) {
    if (!Object.prototype.hasOwnProperty.call(COLUNAS_ATUALIZAVEIS, campo)) {
      throw new Error(`Campo de tarefa não suportado pelo banco de dados: ${campo}`);
    }
  }

  return prisma.$transaction(async tx => {
    const tarefaId = Number(id);
    const usuarioAtual = Number(usuarioId);
    await tx.$queryRaw`
      SELECT id FROM tarefas
      WHERE id = ${tarefaId}
        AND (criado_por_id = ${usuarioAtual} OR usuario_id = ${usuarioAtual})
      FOR UPDATE
    `;

    const tarefaAtual = await tx.tarefas.findFirst({
      where: {
        id: tarefaId,
        OR: [
          { criado_por_id: usuarioAtual },
          { usuario_id: usuarioAtual },
        ],
      },
      include: incluirNomes,
    });
    if (!tarefaAtual) return null;

    if (Number(tarefaAtual.criado_por_id) !== Number(usuarioId) &&
        atualizacoes.some(([campo]) => campo !== 'coluna')) {
      const erro = new Error('Somente o criador pode alterar texto, projeto ou responsável');
      erro.code = 'TASK_PERMISSION_DENIED';
      throw erro;
    }

    if (atualizacoes.length === 0) return formatarTarefa(tarefaAtual);

    const dados = {};
    for (const [campo, valor] of atualizacoes) {
      const coluna = COLUNAS_ATUALIZAVEIS[campo];
      dados[coluna] = campo === 'coluna' ? normalizarStatus(valor) : valor;
    }

    const projetoId = dados.projeto_id ?? tarefaAtual.projeto_id;
    const responsavelId = dados.usuario_id ?? tarefaAtual.usuario_id;
    const prioridadeId = dados.idprioridade;
    const statusNovo = dados.coluna ?? tarefaAtual.coluna;

    if (statusNovo === 'doing' &&
        (tarefaAtual.coluna !== 'doing' || responsavelId !== tarefaAtual.usuario_id)) {
      await bloquearUsuario(tx, responsavelId);
      if (await contarEmAndamento(tx, responsavelId, tarefaId) >= 2) {
        throw criarErroLimiteAndamento();
      }
    }

    if (projetoId !== tarefaAtual.projeto_id &&
        !await validarProjetoDoUsuario(tx, projetoId, tarefaAtual.criado_por_id)) {
      return null;
    }

    if (dados.usuario_id !== undefined) {
      const usuario = await tx.usuarios.findUnique({
        where: { id: Number(responsavelId) },
        select: { id: true },
      });
      if (!usuario) return null;
    }

    if (prioridadeId !== undefined) {
      const prioridade = await tx.prioridades.findUnique({
        where: { id: Number(prioridadeId) },
        select: { id: true },
      });
      if (!prioridade) return null;
    }

    if (dados.coluna !== undefined) {
      dados.concluido_em = dados.coluna === 'done' ? new Date() : null;
      if (dados.coluna === 'doing' && !tarefaAtual.iniciada_em) {
        dados.iniciada_em = new Date();
      }
    }

    const atualizada = await tx.tarefas.update({
      where: { id: tarefaId },
      data: dados,
      include: incluirNomes,
    });
    return formatarTarefa(atualizada);
  });
}

async function deletarTarefa(id, usuarioId) {
  const resultado = await prisma.tarefas.deleteMany({
    where: { id: Number(id), criado_por_id: Number(usuarioId) },
  });
  return resultado.count > 0;
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
  deletarTarefa,
};
