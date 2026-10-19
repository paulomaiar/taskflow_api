const projetoModel = require('../models/projeto.model');
const criarErro = require('../utils/criarErro');

async function listar(req, res) {
  const projetos = await projetoModel.listarProjetos(req.usuario.id);
  return res.json(projetos);
}

async function buscarPorId(req, res) {
  const projeto = await projetoModel.buscarProjetoPorId(req.params.id, req.usuario.id);

  if (!projeto) {
    throw criarErro(404, 'Recurso não encontrado');
  }

  return res.json(projeto);
}

async function criar(req, res) {
  const corpo = req.body || {};
  const { nome } = corpo;

  if (typeof nome !== 'string' || !nome.trim()) {
    throw criarErro(400, 'Nome é obrigatório');
  }
  if (corpo.descricao !== undefined &&
      corpo.descricao !== null &&
      typeof corpo.descricao !== 'string') {
    throw criarErro(400, 'Descrição deve ser um texto');
  }

  const novoProjeto = await projetoModel.adicionarProjeto(corpo, req.usuario.id);
  return res.status(201).json(novoProjeto);
}

async function atualizar(req, res) {
  const corpo = req.body || {};
  if (!['nome', 'descricao'].some(campo => corpo[campo] !== undefined)) {
    throw criarErro(400, 'Informe ao menos um campo para atualizar');
  }
  if (corpo.nome !== undefined &&
      (typeof corpo.nome !== 'string' || !corpo.nome.trim())) {
    throw criarErro(400, 'Nome não pode ser vazio');
  }
  if (corpo.descricao !== undefined &&
      corpo.descricao !== null &&
      typeof corpo.descricao !== 'string') {
    throw criarErro(400, 'Descrição deve ser um texto');
  }

  const projetoAtualizado = await projetoModel.atualizarProjeto(
    req.params.id,
    corpo,
    req.usuario.id
  );

  if (!projetoAtualizado) {
    throw criarErro(404, 'Recurso não encontrado');
  }

  return res.json(projetoAtualizado);
}

async function remover(req, res) {
  const deletado = await projetoModel.deletarProjeto(req.params.id, req.usuario.id);

  if (!deletado) {
    throw criarErro(404, 'Recurso não encontrado');
  }

  return res.status(204).end();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };