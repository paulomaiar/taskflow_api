function tratarErros(erro, req, res, next) {
  console.error('[ERRO]', req.method, req.url, erro.message);

  if (res.headersSent) {
    return next(erro);
  }

  const status = erro.status || 500;

  const mensagem = status >= 500
    ? 'Erro interno no servidor'
    : erro.message || 'Erro inesperado';

  const respostaErro = { mensagem };
  if (erro.detalhes !== undefined) {
    respostaErro.detalhes = erro.detalhes;
  }

  return res.status(status).json({ erro: respostaErro });
}

module.exports = tratarErros;
