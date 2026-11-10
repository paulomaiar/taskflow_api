// @ts-check

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

  const projetoExistente = await prisma.projetos.findFirst({
    where: { id: Number(id), usuario_id: Number(usuarioId) },
    select: { id: true },
  });
  if (!projetoExistente) return null;

  try {
    const projeto = await prisma.projetos.update({
      where: { id: Number(id) },
      data: dados,
    });
    return formatarProjeto(projeto);
  } catch (erro) {
    if (erro.code === 'P2025') return null;
    throw erro;
  }
}

async function deletarProjeto(id, usuarioId) {
  const projeto = await prisma.projetos.findFirst({
    where: { id: Number(id), usuario_id: Number(usuarioId) },
    select: { id: true },
  });
  if (!projeto) return false;

  try {
    await prisma.projetos.delete({ where: { id: Number(id) } });
    return true;
  } catch (erro) {
    if (erro.code === 'P2025') return false;
    throw erro;
  }
}

module.exports = {
  listarProjetos,
  buscarProjetoPorId,
  adicionarProjeto,
  atualizarProjeto,
  deletarProjeto,
};
