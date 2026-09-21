const projetoModel = require('../models/projeto.model');

async function listar(req, res) {
  const projetos = await projetoModel.listarProjetos();
  return res.json(projetos);
}

async function buscarPorId(req, res) {
  const projeto = await projetoModel.buscarProjetoPorId(req.params.id);

  if (!projeto) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }

  return res.json(projeto);
}

async function criar(req, res) {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'Nome é obrigatório' });
  }

  const novoProjeto = await projetoModel.adicionarProjeto(req.body);
  return res.status(201).json(novoProjeto);
}

async function atualizar(req, res) {
  const projetoAtualizado = await projetoModel.atualizarProjeto(req.params.id, req.body);

  if (!projetoAtualizado) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }

  return res.json(projetoAtualizado);
}

async function remover(req, res) {
  const deletado = await projetoModel.deletarProjeto(req.params.id);

  if (!deletado) {
    return res.status(404).json({ erro: 'Projeto não encontrado' });
  }

  return res.json({ mensagem: 'Projeto removido com sucesso', id: req.params.id });
}

module.exports = { listar, buscarPorId, criar, atualizar, remover };