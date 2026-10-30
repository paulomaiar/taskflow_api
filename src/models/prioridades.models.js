const prisma = require('../database/prisma');

async function listarPrioridades() {
  return prisma.prioridades.findMany({
    where: { ativo: true },
    select: { id: true, descricao: true },
    orderBy: { id: 'asc' },
  });
}

async function existePrioridade(id) {
  const prioridade = await prisma.prioridades.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });
  return Boolean(prioridade);
}

module.exports = { listarPrioridades, existePrioridade };
