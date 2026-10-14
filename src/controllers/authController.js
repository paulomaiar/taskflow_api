const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuarios.models');

async function login(req, res) {
  const { email, usuario, senha } = req.body;

  // Aceita 'email' ou 'usuario' para fazer a busca
  const identificador = email || usuario;

  if (!identificador || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
  }

  const usuarioEncontrado = await usuarioModel.autenticarUsuario(identificador, senha);

  if (!usuarioEncontrado) {
    return res.status(401).json({ erro: 'E-mail ou senha inválidos' });
  }

  const secret = process.env.JWT_SECRET || 'fallback_secret';
  const token = jwt.sign(
    { id: usuarioEncontrado.id, email: usuarioEncontrado.email },
    secret,
    { expiresIn: '1d' }
  );

  return res.json({
    token,
    usuario: usuarioEncontrado
  });
}

module.exports = { login };