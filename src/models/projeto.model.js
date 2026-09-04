const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const CAMINHO_ARQUIVO = path.join(__dirname, '../data/projetos.json');

async function listarProjetos() {
  try {
    const conteudo = await fs.readFile(CAMINHO_ARQUIVO, 'utf-8');
    return JSON.parse(conteudo);
  } catch (erro) {
    return [];
  }
}

async function salvarArquivo(lista) {
  await fs.writeFile(CAMINHO_ARQUIVO, JSON.stringify(lista, null, 2));
}

async function buscarProjetoPorId(id) {
  const projetos = await listarProjetos();
  return projetos.find(p => String(p.id) === String(id));
}

async function adicionarProjeto(dados) {
  const projetos = await listarProjetos();
  const novoProjeto = {
    id: crypto.randomInt(1000, 10000),
    nome: dados.nome,
    descricao: dados.descricao || null,
  };

  projetos.push(novoProjeto);
  await salvarArquivo(projetos);
  return novoProjeto;
}

async function atualizarProjeto(id, dadosNovos) {
  const projetos = await listarProjetos();
  const indice = projetos.findIndex(p => String(p.id) === String(id));

  if (indice === -1) return null;

  projetos[indice] = {
    ...projetos[indice],
    ...dadosNovos,
    id: projetos[indice].id,
  };

  await salvarArquivo(projetos);
  return projetos[indice];
}

async function deletarProjeto(id) {
  const projetos = await listarProjetos();
  const projetosFiltrados = projetos.filter(p => String(p.id) !== String(id));

  if (projetos.length === projetosFiltrados.length) return false;

  await salvarArquivo(projetosFiltrados);
  return true;
}

module.exports = {
  listarProjetos,
  buscarProjetoPorId,
  adicionarProjeto,
  atualizarProjeto,
  deletarProjeto,
};