const usuarioModel = require('../models/usuario.model');
const tarefaModel = require('../models/tarefa.model');

async function listar(req, res) {
  const usuarios = await usuarioModel.listarUsuarios();
  return res.json(usuarios);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const usuario = await usuarioModel.buscarUsuarioPorId(id);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  return res.json(usuario);
}

async function criar(req, res) {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: 'Faltando campo nome ou email' });
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

  return res.json(usuarioAtualizado);
}

async function deletar(req, res) {
  const { id } = req.params;
  const usuarioId = Number(id);

  const tarefas = await tarefaModel.listarTarefas();
  const tarefasDoUsuario = tarefas.filter(
    tarefa => tarefa.usuarioId === usuarioId
  );

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