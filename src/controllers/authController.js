const jwt = require('jsonwebtoken');

const usuarioModel = require('../models/usuarioModel');

async function login(req, res) {
  const { usuario, senha } = req.body || {};

  if (!usuario || !senha) {
    return res.status(400).json({ erro: 'Usuário e senha são obrigatórios' });
  }

  try {
    const usuarioEncontrado = await usuarioModel.buscarPorEmailOuNome(usuario);

    if (!usuarioEncontrado || usuarioEncontrado.senha !== senha) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        id: usuarioEncontrado.id,
        nome: usuarioEncontrado.nome,
        email: usuarioEncontrado.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    const { senha: _senhaRemovida, ...usuarioSemSenha } = usuarioEncontrado;

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: usuarioSemSenha,
    });
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro interno ao realizar login' });
  }
}

module.exports = { login };