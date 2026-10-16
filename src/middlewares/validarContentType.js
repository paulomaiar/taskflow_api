const criarErro = require('../utils/criarErro');

function validarContentType(req, res, next) {
  const metodosComCorpo = ['POST', 'PUT', 'PATCH'];

  if (!metodosComCorpo.includes(req.method)) {
    return next();
  }

  const contentType = req.get('Content-Type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return next(criarErro(415, 'Content-Type deve ser application/json'));
  }

  return next();
}

module.exports = validarContentType;