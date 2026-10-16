function tratarErros(erro, req, res, next) {
  if (res.headersSent) {
    return next(erro);
  }

  const statusInformado = Number(erro.status || erro.statusCode);
  const status =
    Number.isInteger(statusInformado) &&
    statusInformado >= 400 &&
    statusInformado <= 599
      ? statusInformado
      : 500;

  if (status === 500) {
    console.error(erro);
    return res.status(500).json({
      erro: { mensagem: 'Erro interno no servidor' },
    });
  }

  return res.status(status).json({
    erro: { mensagem: erro.message || 'Erro inesperado' },
  });
}

module.exports = tratarErros;
