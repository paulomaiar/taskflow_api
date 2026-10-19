const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuarios.models');
const criarErro = require('../utils/criarErro');

async function login(req, res) {
  const { email, usuario, senha } = req.body || {};

  // Aceita 'email' ou 'usuario' para fazer a busca
  const identificador = email || usuario;

  if (
    typeof identificador !== 'string' || !identificador.trim() ||
    typeof senha !== 'string' || !senha.trim()
  ) {
    throw criarErro(400, 'E-mail e senha são obrigatórios');
  }

  const usuarioEncontrado = await usuarioModel.autenticarUsuario(identificador, senha);

  if (!usuarioEncontrado) {
    throw criarErro(401, 'E-mail ou senha inválidos');
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