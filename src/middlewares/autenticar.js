const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ erro: 'Token não informado' });
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({
      erro: 'Formato do token inválido. Use: Bearer <token>'
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = payload;
    return next();
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }

    if (erro.name === 'JsonWebTokenError') {
      return res.status(401).json({ erro: 'Token inválido.' });
    }

    return res.status(401).json({ erro: 'Erro ao autenticar o token.' });
  }
}

module.exports = autenticar;
