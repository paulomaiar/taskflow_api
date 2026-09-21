const usuarioModel = require('../models/usuarios.models');
const tarefaModel = require('../models/tarefas.models');

async function listar(req, res) {
  const usuarios = await usuarioModel.listarUsuarios();
  const usuariosFormatados = usuarios.map(({ senha, ...u }) => u);
  return res.json(usuariosFormatados);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const usuario = await usuarioModel.buscarUsuarioPorId(id);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  const { senha, ...usuarioSemSenha } = usuario;
  return res.json(usuarioSemSenha);
}

async function criar(req, res) {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Preencha todos os campos: nome, email e senha' });
  }

  try {
    const novoUsuario = await usuarioModel.adicionarUsuario(req.body);
    return res.status(201).json(novoUsuario);
  } catch (erro) {
    return res.status(400).json({ erro: erro.message });
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const usuarioAtualizado = await usuarioModel.atualizarUsuario(id, req.body);

  if (!usuarioAtualizado) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  const { senha, ...usuarioSemSenha } = usuarioAtualizado;
  return res.json(usuarioSemSenha);
}

async function deletar(req, res) {
  const { id } = req.params;
  const tarefasDoUsuario = await tarefaModel.buscarPorUsuarioId(id);

  if (tarefasDoUsuario.length > 0) {
    return res.status(400).json({
      erro: 'Usuário possui tarefas. Remova as tarefas antes de deletar o usuário.',
    });
  }

  const deletado = await usuarioModel.deletarUsuario(id);

  if (!deletado) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  return res.json({ mensagem: 'Usuário removido com sucesso', id });
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };