const tarefaModel = require('../models/tarefas.models');
const criarErro = require('../utils/criarErro');

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

function encaminharErroDoModel(erro) {
  if (erro.code === 'TASK_IN_PROGRESS_LIMIT') {
    throw criarErro(400, erro.message);
  }

  throw erro;
}

async function listar(req, res) {
  let tarefas = await tarefaModel.listarTarefas(req.usuario.id);
  const { coluna, projetoId, prioridade } = req.query;

  if (prioridade !== undefined) {
    throw criarErro(400, 'Filtro por prioridade não é suportado pelo schema atual de tarefas');
  }

  if (projetoId !== undefined) {
    tarefas = tarefas.filter(t => String(t.projetoId) === String(projetoId));
  }

  if (coluna) {
    const colunaNormalizada = normalizarColuna(coluna);
    if (!colunasValidas.includes(colunaNormalizada)) {
      throw criarErro(400, 'Coluna inválida. Use: afazer, andamento ou concluido');
    }
    tarefas = tarefas.filter(t => t.coluna === colunaNormalizada);
  }

  return res.json(tarefas);
}

async function buscarPorId(req, res) {
  const { id } = req.params;
  const tarefa = await tarefaModel.buscarTarefaPorId(id, req.usuario.id);

  if (!tarefa) {
    throw criarErro(404, 'Tarefa não encontrada');
  }

  return res.json(tarefa);
}

async function criar(req, res) {
  const { texto, projetoId, ordem, coluna } = req.body;
  const colunaNormalizada = normalizarColuna(coluna);
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    throw criarErro(401, 'Usuário não autenticado');
  }

  const campoNaoSuportado = validarCamposSuportados(req.body);
  if (campoNaoSuportado) {
    throw criarErro(400, `O campo ${campoNaoSuportado} não é suportado pelo schema atual de tarefas`);
  }

  if (!texto) {
    throw criarErro(400, 'O campo texto é obrigatório');
  }

  if (!Number.isInteger(Number(projetoId)) || Number(projetoId) <= 0) {
    throw criarErro(400, 'O campo projetoId é obrigatório e deve ser um número inteiro positivo');
  }

  if (colunaNormalizada !== undefined && !colunasValidas.includes(colunaNormalizada)) {
    throw criarErro(400, 'Coluna inválida. Use: afazer, andamento ou concluido');
  }

  if (ordem !== undefined && !Number.isInteger(ordem)) {
    throw criarErro(400, 'O campo ordem deve ser um número inteiro');
  }

  if (colunaNormalizada === 'andamento') {
    const quantidade = await tarefaModel.contarTarefasEmAndamento(usuarioId);

    if (quantidade >= 2) {
      throw criarErro(400, 'Limite de 2 tarefas em andamento por usuário atingido');
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
      throw criarErro(404, 'Projeto não encontrado para este usuário');
    }
    return res.status(201).json(novaTarefa);
  } catch (erro) {
    return encaminharErroDoModel(erro);
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const { coluna, projetoId, ordem } = req.body;
  const colunaNormalizada = normalizarColuna(coluna);
  const dadosAtualizados = {};
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    throw criarErro(401, 'Usuário não autenticado');
  }

  const campoNaoSuportado = validarCamposSuportados(req.body);
  if (campoNaoSuportado) {
    throw criarErro(400, `O campo ${campoNaoSuportado} não é suportado pelo schema atual de tarefas`);
  }

  if (colunaNormalizada !== undefined && !colunasValidas.includes(colunaNormalizada)) {
    throw criarErro(400, 'Coluna inválida. Use: afazer, andamento ou concluido');
  }

  if (req.body.texto !== undefined) {
    if (!req.body.texto) {
      throw criarErro(400, 'O campo texto não pode ser vazio');
    }
    dadosAtualizados.texto = req.body.texto;
  }

  if (ordem !== undefined) {
    if (!Number.isInteger(ordem)) {
      throw criarErro(400, 'O campo ordem deve ser um número inteiro');
    }
    dadosAtualizados.ordem = ordem;
  }

  if (projetoId !== undefined) {
    if (!Number.isInteger(Number(projetoId)) || Number(projetoId) <= 0) {
      throw criarErro(400, 'O campo projetoId deve ser um número inteiro positivo');
    }
    dadosAtualizados.projetoId = Number(projetoId);
  }

  if (colunaNormalizada !== undefined) {
    dadosAtualizados.coluna = colunaNormalizada;
  }

  const tarefaAtual = await tarefaModel.buscarTarefaPorId(id, usuarioId);
  if (!tarefaAtual) {
    throw criarErro(404, 'Tarefa não encontrada');
  }

  const colunaFinal = colunaNormalizada || tarefaAtual.coluna;
  if (colunaFinal === 'andamento') {
    const quantidade = await tarefaModel.contarTarefasEmAndamento(usuarioId, id);

    if (quantidade >= 2) {
      throw criarErro(400, 'Limite de 2 tarefas em andamento por usuário atingido');
    }
  }

  try {
    const tarefaAtualizada = await tarefaModel.atualizarTarefa(
      id,
      dadosAtualizados,
      usuarioId
    );

    if (!tarefaAtualizada) {
      throw criarErro(404, 'Tarefa ou projeto não encontrado');
    }

    return res.json(tarefaAtualizada);
  } catch (erro) {
    return encaminharErroDoModel(erro);
  }
}

async function deletar(req, res) {
  const { id } = req.params;
  const deletado = await tarefaModel.deletarTarefa(id, req.usuario.id);

  if (!deletado) {
    throw criarErro(404, 'Tarefa não encontrada');
  }

  return res.status(204).end();
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };