const tarefaModel = require('../models/tarefas.models');
const usuarioModel = require('../models/usuarios.models');
const prioridadesModel = require('../models/prioridades.models');
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

function traduzirErroDoModel(erro) {
  if (erro.code === 'TASK_IN_PROGRESS_LIMIT') {
    throw criarErro(400, erro.message);
  }

  throw erro;
}

async function listar(req, res) {
  const { usuarioId } = req.query;
  if (usuarioId !== undefined && Number(usuarioId) !== Number(req.usuario.id)) {
    return res.json([]);
  }

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
    throw criarErro(404, 'Recurso não encontrado');
  }

  return res.json(tarefa);
}

async function avancar(req, res) {
  let tarefa;
  try {
    tarefa = await tarefaModel.avancarTarefa(req.params.id, req.usuario.id);
  } catch (erro) {
    return traduzirErroDoModel(erro);
  }

  if (!tarefa) {
    throw criarErro(404, 'Recurso não encontrado');
  }

  return res.json(tarefa);
}

async function criar(req, res) {
  const corpo = req.body || {};
  const { texto, ordem, coluna } = corpo;
  const projetoId = corpo.projeto_id ?? corpo.projetoId;
  const responsavelId = corpo.usuario_id ?? req.usuario.id;
  const idprioridade = corpo.idprioridade ?? 2;
  const colunaNormalizada = normalizarColuna(coluna);
  const criadorId = req.usuario?.id;

  if (!criadorId) {
    throw criarErro(401, 'Usuário não autenticado');
  }

  const campoNaoSuportado = validarCamposSuportados(corpo);
  if (campoNaoSuportado) {
    throw criarErro(400, `O campo ${campoNaoSuportado} não é suportado pelo schema atual de tarefas`);
  }

  if (typeof texto !== 'string' || !texto.trim()) {
    throw criarErro(400, 'O campo texto é obrigatório e não pode ser vazio');
  }

  if (!Number.isInteger(Number(projetoId)) || Number(projetoId) <= 0) {
    throw criarErro(400, 'O campo projeto_id é obrigatório e deve ser um número inteiro positivo');
  }

  if (!Number.isInteger(Number(responsavelId)) || Number(responsavelId) <= 0) {
    throw criarErro(400, 'O campo usuario_id deve ser um número inteiro positivo');
  }

  if (!Number.isInteger(Number(idprioridade)) || Number(idprioridade) <= 0) {
    throw criarErro(400, 'O campo idprioridade deve ser um número inteiro positivo');
  }

  const responsavelExiste = await usuarioModel.buscarUsuarioPorId(responsavelId);
  if (!responsavelExiste) {
    throw criarErro(400, 'O responsável selecionado não existe');
  }

  if (!await prioridadesModel.existePrioridade(Number(idprioridade))) {
    throw criarErro(400, 'A prioridade selecionada não existe');
  }

  if (colunaNormalizada !== undefined && !colunasValidas.includes(colunaNormalizada)) {
    throw criarErro(400, 'Coluna inválida. Use: afazer, andamento ou concluido');
  }

  if (ordem !== undefined && !Number.isInteger(ordem)) {
    throw criarErro(400, 'O campo ordem deve ser um número inteiro');
  }

  if (colunaNormalizada === 'andamento') {
    const quantidade = await tarefaModel.contarTarefasEmAndamento(responsavelId);

    if (quantidade >= 2) {
      throw criarErro(400, 'Limite de 2 tarefas em andamento por usuário atingido');
    }
  }

  const dadosParaSalvar = {
    texto,
    coluna: colunaNormalizada,
    ordem: ordem ?? 0,
    projetoId: Number(projetoId),
    usuarioId: Number(responsavelId),
    idprioridade: Number(idprioridade),
  };

  try {
    const novaTarefa = await tarefaModel.adicionarTarefa(dadosParaSalvar, criadorId);
    if (!novaTarefa) {
      throw criarErro(404, 'Projeto não encontrado para este criador');
    }
    return res.status(201).json(novaTarefa);
  } catch (erro) {
    return traduzirErroDoModel(erro);
  }
}

async function atualizar(req, res) {
  const { id } = req.params;
  const corpo = req.body || {};
  const { coluna, ordem } = corpo;
  const colunaNormalizada = normalizarColuna(coluna);
  const dadosAtualizados = {};
  const usuarioId = req.usuario?.id;

  if (!usuarioId) {
    throw criarErro(401, 'Usuário não autenticado');
  }

  const campoNaoSuportado = validarCamposSuportados(corpo);
  if (campoNaoSuportado) {
    throw criarErro(400, `O campo ${campoNaoSuportado} não é suportado pelo schema atual de tarefas`);
  }

  if (colunaNormalizada !== undefined && !colunasValidas.includes(colunaNormalizada)) {
    throw criarErro(400, 'Coluna inválida. Use: afazer, andamento ou concluido');
  }

  if (corpo.texto !== undefined) {
    if (typeof corpo.texto !== 'string' || !corpo.texto.trim()) {
      throw criarErro(400, 'O campo texto não pode ser vazio');
    }
    dadosAtualizados.texto = corpo.texto;
  }

  const projetoId = corpo.projeto_id ?? corpo.projetoId;
  if (projetoId !== undefined) {
    if (!Number.isInteger(Number(projetoId)) || Number(projetoId) <= 0) {
      throw criarErro(400, 'O campo projeto_id deve ser um número inteiro positivo');
    }
    dadosAtualizados.projetoId = Number(projetoId);
  }

  if (corpo.usuario_id !== undefined) {
    if (!Number.isInteger(Number(corpo.usuario_id)) || Number(corpo.usuario_id) <= 0) {
      throw criarErro(400, 'O campo usuario_id deve ser um número inteiro positivo');
    }
    dadosAtualizados.usuarioId = Number(corpo.usuario_id);
  }

  if (corpo.idprioridade !== undefined) {
    if (!Number.isInteger(Number(corpo.idprioridade)) || Number(corpo.idprioridade) <= 0) {
      throw criarErro(400, 'O campo idprioridade deve ser um número inteiro positivo');
    }
    dadosAtualizados.idprioridade = Number(corpo.idprioridade);
  }

  if (ordem !== undefined) {
    if (!Number.isInteger(ordem)) {
      throw criarErro(400, 'O campo ordem deve ser um número inteiro');
    }
    dadosAtualizados.ordem = ordem;
  }

  if (colunaNormalizada !== undefined) {
    dadosAtualizados.coluna = colunaNormalizada;
  }

  if (Object.keys(dadosAtualizados).length === 0) {
    throw criarErro(400, 'Informe ao menos um campo para atualizar');
  }

  const tarefaAtual = await tarefaModel.buscarTarefaPorId(id, usuarioId);
  if (!tarefaAtual) {
    throw criarErro(404, 'Recurso não encontrado');
  }

  try {
    const tarefaAtualizada = await tarefaModel.atualizarTarefa(
      id,
      dadosAtualizados,
      usuarioId
    );

    if (!tarefaAtualizada) {
      throw criarErro(404, 'Recurso não encontrado');
    }

    return res.json(tarefaAtualizada);
  } catch (erro) {
    if (erro.code === 'TASK_PERMISSION_DENIED') {
      throw criarErro(403, erro.message);
    }
    return traduzirErroDoModel(erro);
  }
}

async function deletar(req, res) {
  const { id } = req.params;
  const deletado = await tarefaModel.deletarTarefa(id, req.usuario.id);

  if (!deletado) {
    throw criarErro(404, 'Recurso não encontrado');
  }

  return res.status(204).end();
}

module.exports = { listar, buscarPorId, avancar, criar, atualizar, deletar };