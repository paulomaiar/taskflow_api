const projetoModel = require('../models/projeto.model');
const criarErro = require('../utils/criarErro');

async function listar(req, res) {
  const projetos = await projetoModel.listarProjetos(req.usuario.id);
  return res.json(projetos);
}

async function buscarPorId(req, res) {
  const projeto = await projetoModel.buscarProjetoPorId(req.params.id, req.usuario.id);

  if (!projeto) {
    throw criarErro(404, 'Projeto não encontrado');
  }

  return res.json(projeto);
}

async function criar(req, res) {
  const { nome } = req.body;

  if (!nome) {
    throw criarErro(400, 'Nome é obrigatório');
  }

  const novoProjeto = await projetoModel.adicionarProjeto(req.body, req.usuario.id);
  return res.status(201).json(novoProjeto);
}

async function atualizar(req, res) {
  const projetoAtualizado = await projetoModel.atualizarProjeto(
    req.params.id,
    req.body,
    req.usuario.id
  );

  if (!projetoAtualizado) {
    throw criarErro(404, 'Projeto não encontrado');
  }

  return res.json(projetoAtualizado);
}

async function remover(req, res) {
  const deletado = await projetoModel.deletarProjeto(req.params.id, req.usuario.id);

  if (!deletado) {
    throw criarErro(404, 'Projeto não encontrado');
  }

  return res.status(204).end();
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };