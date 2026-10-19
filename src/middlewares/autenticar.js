const jwt = require('jsonwebtoken');
const criarErro = require('../utils/criarErro');

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return next(criarErro(401, 'Token não informado'));
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    return next(criarErro(401, 'Formato do token inválido'));
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return next(criarErro(401, 'Token expirado. Faça login novamente.'));
    }

    if (erro.name === 'JsonWebTokenError') {
      return next(criarErro(401, 'Token inválido.'));
    }

    return next(erro);
  }

  req.usuario = payload;
  return next();
}

module.exports = autenticar;
