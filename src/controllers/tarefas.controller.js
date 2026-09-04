const tarefaModel = require('../models/tarefa.model');
const usuarioModel = require('../models/usuario.model');

const prioridadesValidas = ['alta', 'media', 'baixa'];
const colunasValidas = ['afazer', 'andamento', 'concluido'];

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
  const { texto, usuarioId, prioridade, coluna} = req.body;

  if (usuarioId !== undefined && usuarioId !== null) {
    const usuario = await usuarioModel.buscarUsuarioPorId(usuarioId);

    if (!usuario) {
      return res.status(400).json({ erro: 'Usuário não encontrado' });
    }
  }

  if (!texto) {
    return res.status(400).json({ erro: 'O campo texto é obrigatório' });
  }

  if (
    prioridade !== undefined &&
    !prioridadesValidas.includes(prioridade)
  ) {
    return res.status(400).json({
      erro: 'Prioridade inválida. Use: alta, media ou baixa',
    });
  }

  if (coluna !== undefined && !colunasValidas.includes(coluna)) {
    return res.status(400).json({
      erro: 'Coluna inválida. Use: afazer, andamento ou concluido'
    });
  }

  const novaTarefa = await tarefaModel.adicionarTarefa(req.body);
  return res.status(201).json(novaTarefa);
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { prioridade, coluna } = req.body;
  

  if (prioridade !== undefined && !prioridadesValidas.includes(prioridade)) {
  return res.status(400).json({
    erro: 'Prioridade inválida. Use: alta, media ou baixa',
  });
  }

  if (coluna !== undefined && !colunasValidas.includes(coluna)) {
    return res.status(400).json({
      erro: 'Coluna inválida. Use: afazer, andamento ou concluido',
    });
  }

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