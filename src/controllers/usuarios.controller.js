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
    throw criarErro(404, 'Recurso não encontrado');
  }

  return res.json(usuario);
}

async function criar(req, res) {
  const corpo = req.body || {};
  const { nome, email, senha } = corpo;

  if (
    typeof nome !== 'string' || !nome.trim() ||
    typeof email !== 'string' || !email.trim() ||
    typeof senha !== 'string' || !senha.trim()
  ) {
    throw criarErro(400, 'Preencha todos os campos: nome, email e senha');
  }

  try {
    const novoUsuario = await usuarioModel.adicionarUsuario(corpo);
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
  const corpo = req.body || {};
  if (!['nome', 'email', 'senha'].some(campo => corpo[campo] !== undefined)) {
    throw criarErro(400, 'Informe ao menos um campo para atualizar');
  }
  for (const campo of ['nome', 'email', 'senha']) {
    if (corpo[campo] !== undefined &&
        (typeof corpo[campo] !== 'string' || !corpo[campo].trim())) {
      throw criarErro(400, `O campo ${campo} não pode ser vazio`);
    }
  }

  let usuarioAtualizado;
  try {
    usuarioAtualizado = await usuarioModel.atualizarUsuario(id, corpo);
  } catch (erro) {
    if (erro.code === 'USER_EMAIL_EXISTS') {
      throw criarErro(400, erro.message);
    }
    throw erro;
  }

  if (!usuarioAtualizado) {
    throw criarErro(404, 'Recurso não encontrado');
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
    throw criarErro(404, 'Recurso não encontrado');
  }

  return res.status(204).end();
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };