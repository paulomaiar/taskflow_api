const prisma = require('../database/prisma');

function formatarProjeto(projeto) {
  if (!projeto) return null;

  const { criado_em, atualizado_em, ...resto } = projeto;
  return {
    ...resto,
    criadoEm: criado_em,
    atualizadoEm: atualizado_em,
  };
}

async function listarProjetos(usuarioId) {
  const projetos = await prisma.projetos.findMany({
    where: { usuario_id: Number(usuarioId) },
    orderBy: { nome: 'asc' },
  });
  return projetos.map(formatarProjeto);
}

async function buscarProjetoPorId(id, usuarioId) {
  const projeto = await prisma.projetos.findFirst({
    where: { id: Number(id), usuario_id: Number(usuarioId) },
  });
  return formatarProjeto(projeto);
}

async function adicionarProjeto(dados, usuarioId) {
  const projeto = await prisma.projetos.create({
    data: {
      nome: dados.nome,
      descricao: dados.descricao || null,
      usuarios: { connect: { id: Number(usuarioId) } },
    },
  });
  return formatarProjeto(projeto);
}

async function atualizarProjeto(id, dadosNovos, usuarioId) {
  const dados = {};
  if (dadosNovos.nome !== undefined) dados.nome = dadosNovos.nome;
  if (dadosNovos.descricao !== undefined) dados.descricao = dadosNovos.descricao;

  if (Object.keys(dados).length === 0) {
    return buscarProjetoPorId(id, usuarioId);
  }

  return prisma.$transaction(async tx => {
    const resultado = await tx.projetos.updateMany({
      where: { id: Number(id), usuario_id: Number(usuarioId) },
      data: dados,
    });

    if (resultado.count === 0) return null;

    const projeto = await tx.projetos.findFirst({
      where: { id: Number(id), usuario_id: Number(usuarioId) },
    });
    return formatarProjeto(projeto);
  });
}

async function deletarProjeto(id, usuarioId) {
  const resultado = await prisma.projetos.deleteMany({
    where: { id: Number(id), usuario_id: Number(usuarioId) },
  });
  return resultado.count > 0;
}

module.exports = {
  listarProjetos,
  buscarProjetoPorId,
  adicionarProjeto,
  atualizarProjeto,
  deletarProjeto,
};
