const usuarioModel = require('../models/usuarios.models');
const tarefaModel = require('../models/tarefas.models');
const criarErro = require('../utils/criarErro');

async function listar(req, res) {
  const usuarios = await usuarioModel.listarUsuarios();
  return res.json(usuarios);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const usuario = await usuarioModel.buscarUsuarioPorId(id);

  if (!usuario) {
    throw criarErro(404, 'Usuário não encontrado');
  }

  return res.json(usuario);
}

async function criar(req, res) {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    throw criarErro(400, 'Preencha todos os campos: nome, email e senha');
  }

  try {
    const novoUsuario = await usuarioModel.adicionarUsuario(req.body);
    return res.status(201).json(novoUsuario);
  } catch (erro) {
    if (erro.code === 'USER_EMAIL_EXISTS') {
      throw criarErro(400, erro.message);
    }
    throw erro;
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const usuarioAtualizado = await usuarioModel.atualizarUsuario(id, req.body);

  if (!usuarioAtualizado) {
    throw criarErro(404, 'Usuário não encontrado');
  }

  return res.json(usuarioAtualizado);
}

async function deletar(req, res) {
  const { id } = req.params;
  const tarefasDoUsuario = await tarefaModel.buscarPorUsuarioId(id);

  if (tarefasDoUsuario.length > 0) {
    throw criarErro(400, 'Usuário possui tarefas. Remova as tarefas antes de deletar o usuário.');
  }

  const deletado = await usuarioModel.deletarUsuario(id);

  if (!deletado) {
    throw criarErro(404, 'Usuário não encontrado');
  }

  return res.status(204).end();
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };