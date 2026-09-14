function validarContentType(req, res, next) {
  const metodosComCorpo = ['POST', 'PUT', 'PATCH'];

  if (!metodosComCorpo.includes(req.method)) {
    return next();
  }

  const contentType = req.get('Content-Type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return res.status(415).json({
      erro: 'Content-Type deve ser application/json',
    });
  }

  return next();
}

module.exports = validarContentType;