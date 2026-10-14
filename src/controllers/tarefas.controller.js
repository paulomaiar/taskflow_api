const tarefaModel = require('../models/tarefas.models');

const colunasValidas = ['afazer', 'andamento', 'concluido'];
const CAMPOS_NAO_SUPORTADOS = ['prioridade', 'cidade', 'concluida', 'concluidaEm'];

function normalizarColuna(coluna) {
  if (coluna === undefined || coluna === null || coluna === '') return coluna;

  const valor = String(coluna)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const mapeamento = {
    'a fazer': 'afazer',
    afazer: 'afazer',
    todo: 'afazer',
    'em andamento': 'andamento',
    andamento: 'andamento',
    doing: 'andamento',
    concluida: 'concluido',
    concluido: 'concluido',
    done: 'concluido',
  };

  return mapeamento[valor] || valor;
}

function validarCamposSuportados(dados) {
  return CAMPOS_NAO_SUPORTADOS.find(campo =>
    Object.prototype.hasOwnProperty.call(dados, campo)
  );
}

function responderErroDoModel(erro, res) {
  if (erro.code === 'TASK_IN_PROGRESS_LIMIT') {
    return res.status(400).json({ erro: erro.message });
  }

  throw erro;
}

async function listar(req, res) {
  let tarefas = await tarefaModel.listarTarefas(req.usuario.id);
  const { coluna, projetoId, prioridade } = req.query;

  if (prioridade !== undefined) {
    return res.status(400).json({
      erro: 'Filtro por prioridade não é suportado pelo schema atual de tarefas',
    });
  }

  if (projetoId !== undefined) {
    tarefas = tarefas.filter(t => String(t.projetoId) === String(projetoId));
  }

  if (coluna) {
    const colunaNormalizada = normalizarColuna(coluna);
    if (!colunasValidas.includes(colunaNormalizada)) {
      return res.status(400).json({
        erro: 'Coluna inválida. Use: afazer, andamento ou concluido',
      });
    }
    tarefas = tarefas.filter(t => t.coluna === colunaNormalizada);
  }

  return res.json(tarefas);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const tarefa = await tarefaModel.buscarTarefaPorId(id, req.usuario.id);

  if (!tarefa) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  return res.json(tarefa);
}

async function criar(req, res) {
  const { texto, projetoId, ordem, coluna } = req.body;
  const colunaNormalizada = normalizarColuna(coluna);
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Usuário não autenticado' });
  }

  const campoNaoSuportado = validarCamposSuportados(req.body);
  if (campoNaoSuportado) {
    return res.status(400).json({
      erro: `O campo ${campoNaoSuportado} não é suportado pelo schema atual de tarefas`,
    });
  }

  if (!texto) {
    return res.status(400).json({ erro: 'O campo texto é obrigatório' });
  }

  if (!Number.isInteger(Number(projetoId)) || Number(projetoId) <= 0) {
    return res.status(400).json({
      erro: 'O campo projetoId é obrigatório e deve ser um número inteiro positivo',
    });
  }

  if (colunaNormalizada !== undefined && !colunasValidas.includes(colunaNormalizada)) {
    return res.status(400).json({
      erro: 'Coluna inválida. Use: afazer, andamento ou concluido'
    });
  }

  if (ordem !== undefined && !Number.isInteger(ordem)) {
    return res.status(400).json({ erro: 'O campo ordem deve ser um número inteiro' });
  }

  if (colunaNormalizada === 'andamento') {
    const quantidade = await tarefaModel.contarTarefasEmAndamento(usuarioId);

    if (quantidade >= 2) {
      return res.status(400).json({
        erro: 'Limite de 2 tarefas em andamento por usuário atingido'
      });
    }
  }

  const dadosParaSalvar = {
    texto,
    coluna: colunaNormalizada,
    ordem: ordem ?? 0,
    projetoId: Number(projetoId),
    usuarioId,
  };

  try {
    const novaTarefa = await tarefaModel.adicionarTarefa(dadosParaSalvar);
    if (!novaTarefa) {
      return res.status(404).json({ erro: 'Projeto não encontrado para este usuário' });
    }
    return res.status(201).json(novaTarefa);
  } catch (erro) {
    return responderErroDoModel(erro, res);
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { coluna, projetoId, ordem } = req.body;
  const colunaNormalizada = normalizarColuna(coluna);
  const dadosAtualizados = {};
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    return res.status(401).json({ erro: 'Usuário não autenticado' });
  }

  const campoNaoSuportado = validarCamposSuportados(req.body);
  if (campoNaoSuportado) {
    return res.status(400).json({
      erro: `O campo ${campoNaoSuportado} não é suportado pelo schema atual de tarefas`,
    });
  }

  if (colunaNormalizada !== undefined && !colunasValidas.includes(colunaNormalizada)) {
    return res.status(400).json({
      erro: 'Coluna inválida. Use: afazer, andamento ou concluido',
    });
  }

  if (req.body.texto !== undefined) {
    if (!req.body.texto) {
      return res.status(400).json({ erro: 'O campo texto não pode ser vazio' });
    }
    dadosAtualizados.texto = req.body.texto;
  }

  if (ordem !== undefined) {
    if (!Number.isInteger(ordem)) {
      return res.status(400).json({ erro: 'O campo ordem deve ser um número inteiro' });
    }
    dadosAtualizados.ordem = ordem;
  }

  if (projetoId !== undefined) {
    if (!Number.isInteger(Number(projetoId)) || Number(projetoId) <= 0) {
      return res.status(400).json({
        erro: 'O campo projetoId deve ser um número inteiro positivo',
      });
    }
    dadosAtualizados.projetoId = Number(projetoId);
  }

  if (colunaNormalizada !== undefined) {
    dadosAtualizados.coluna = colunaNormalizada;
  }

  const tarefaAtual = await tarefaModel.buscarTarefaPorId(id, usuarioId);
  if (!tarefaAtual) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  if (String(tarefaAtual.usuarioId) !== String(usuarioId)) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  const colunaFinal = colunaNormalizada || tarefaAtual.coluna;
  if (colunaFinal === 'andamento') {
    const quantidade = await tarefaModel.contarTarefasEmAndamento(usuarioId, id);

    if (quantidade >= 2) {
      return res.status(400).json({
        erro: 'Limite de 2 tarefas em andamento por usuário atingido'
      });
    }
  }

  try {
    const tarefaAtualizada = await tarefaModel.atualizarTarefa(
      id,
      dadosAtualizados,
      usuarioId
    );

    if (!tarefaAtualizada) {
      return res.status(404).json({ erro: 'Tarefa ou projeto não encontrado' });
    }

    return res.json(tarefaAtualizada);
  } catch (erro) {
    return responderErroDoModel(erro, res);
  }
}

async function deletar(req, res) {
  const { id } = req.params;
  const deletado = await tarefaModel.deletarTarefa(id, req.usuario.id);

  if (!deletado) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  return res.json({ mensagem: 'Tarefa removida com sucesso', id });
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };