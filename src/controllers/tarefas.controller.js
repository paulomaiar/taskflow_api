const tarefaModel = require('../models/tarefas.models');

async function listar(req, res) {
  let tarefas = await tarefaModel.listarTarefas();
  const { coluna, prioridade } = req.query;

  if (coluna) {
    tarefas = tarefas.filter(t => t.coluna.toLowerCase() === coluna.toLowerCase());
  }

  if (prioridade) {
    tarefas = tarefas.filter(t => t.prioridade.toLowerCase() === prioridade.toLowerCase());
  }

  return res.json(tarefas);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const tarefa = await tarefaModel.buscarTarefaPorId(id);

  if (!tarefa) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  return res.json(tarefa);
}

async function criar(req, res) {
  const { texto } = req.body;

  if (!texto) {
    return res.status(400).json({ erro: 'O campo texto é obrigatório' });
  }

  const novaTarefa = await tarefaModel.adicionarTarefa(req.body);
  return res.status(201).json(novaTarefa);
}

async function atualizar(req, res) {
  const { id } = req.params;
  const tarefaAtualizada = await tarefaModel.atualizarTarefa(id, req.body);

  if (!tarefaAtualizada) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  return res.json(tarefaAtualizada);
}

async function deletar(req, res) {
  const { id } = req.params;
  const deletado = await tarefaModel.deletarTarefa(id);

  if (!deletado) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  return res.json({ mensagem: 'Tarefa removida com sucesso', id });
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };