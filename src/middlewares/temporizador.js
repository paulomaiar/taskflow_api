function temporizador(req, res, next) {
  const inicio = Date.now();

  res.on('finish', () => {
    res.tempoResposta = Date.now() - inicio;
  });

  next();
}

module.exports = temporizador;