const { Prisma } = require('@prisma/client');
const traduzirErroPrisma = require('../utils/traduzirErroPrisma');

function tratarErros(erro, req, res, next) {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    erro = traduzirErroPrisma(erro, req.method);
  }

  if (res.headersSent) {
    return next(erro);
  }

  const status = erro.status || 500;
  const erroInterno = status >= 500;

  if (erroInterno) {
    console.error('[ERRO]', req.method, req.url, erro);
  }

  const mensagem = erroInterno
    ? 'Erro interno no servidor'
    : erro.message || 'Erro inesperado';

  return res.status(status).json({
    erro: {
      mensagem,
      ...(!erroInterno && erro.detalhes !== undefined
        ? { detalhes: erro.detalhes }
        : {}),
    },
  });
}

module.exports = tratarErros;
