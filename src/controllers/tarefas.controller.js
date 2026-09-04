const tarefaModel = require('../models/tarefa.model');
const usuarioModel = require('../models/usuario.model');

const prioridadesValidas = ['alta', 'media', 'baixa'];
const colunasValidas = ['afazer', 'andamento', 'concluido'];

async function listar(req, res) {
  let tarefas = await tarefaModel.listarTarefas();
  const { coluna, prioridade, usuarioId } = req.query;

  if (usuarioId !== undefined) {
    tarefas = tarefas.filter(t => t.usuarioId === Number(usuarioId));
  }

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

  if (coluna === 'andamento' && usuarioId !== undefined && usuarioId !== null) {
    const quantidade = await contarTarefasEmAndamento(usuarioId);

    if (quantidade >= 2) {
      return res.status(400).json({
        erro: 'Limite de 2 tarefas em andamento por usuário atingido'
      });
    }
  }

  const novaTarefa = await tarefaModel.adicionarTarefa(req.body);
  return res.status(201).json(novaTarefa);
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { prioridade, coluna } = req.body;
  const dadosAtualizados = { ...req.body };
  delete dadosAtualizados.concluidaEm;
  

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

  const tarefaAtual = await tarefaModel.buscarTarefaPorId(id);
  if (!tarefaAtual) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }
  const colunaFinal = coluna || tarefaAtual.coluna;

  const usuarioIdFinal =
    req.body.usuarioId !== undefined
      ? req.body.usuarioId
      : tarefaAtual.usuarioId;



  if (
    String(colunaFinal).toLowerCase() === 'andamento' &&
    usuarioIdFinal !== undefined &&
    usuarioIdFinal !== null
  ) {
    const quantidade = await contarTarefasEmAndamento(usuarioIdFinal, id);

    if (quantidade >= 2) {
      return res.status(400).json({
        erro: 'Limite de 2 tarefas em andamento por usuário atingido'
      });
    }

  }

  if (
    coluna !== undefined &&
    String(tarefaAtual.coluna).toLowerCase() === 'concluido' &&
    String(colunaFinal).toLowerCase() !== 'concluido'
  ) {
    dadosAtualizados.concluidaEm = null;
  }

  if (
    coluna !== undefined &&
    String(tarefaAtual.coluna).toLowerCase() !== 'concluido' &&
    String(colunaFinal).toLowerCase() === 'concluido'
  ) {
    dadosAtualizados.concluidaEm = new Date().toISOString();
  }

  const tarefaAtualizada = await tarefaModel.atualizarTarefa(id, dadosAtualizados);

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

async function contarTarefasEmAndamento(usuarioId, idIgnorado = null) {
  const tarefas = await tarefaModel.listarTarefas();

  return tarefas.filter(tarefa =>
    tarefa.usuarioId === usuarioId &&
    String(tarefa.coluna).toLowerCase() === 'andamento' &&
    String(tarefa.id) !== String(idIgnorado)
  ).length;
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };