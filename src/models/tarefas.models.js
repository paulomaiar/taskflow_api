const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const CAMINHO_ARQUIVO = path.join(__dirname, '../data/tarefas.json');

async function listarTarefas() {
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

async function buscarTarefaPorId(id) {
  const tarefas = await listarTarefas();
  return tarefas.find(t => String(t.id) === String(id));
}

async function adicionarTarefa(dados) {
  const tarefas = await listarTarefas();
  const novaTarefa = {
    id: crypto.randomInt(1000, 10000),
    texto: dados.texto,
    prioridade: dados.prioridade || 'media',
    coluna: dados.coluna || 'A FAZER',
    cidade: dados.cidade || '',
    concluida: dados.concluida || false
  };

  tarefas.push(novaTarefa);
  await salvarArquivo(tarefas);
  return novaTarefa;
}

async function atualizarTarefa(id, dadosNovos) {
  const tarefas = await listarTarefas();
  const indice = tarefas.findIndex(t => String(t.id) === String(id));

  if (indice === -1) return null;

  tarefas[indice] = {
    ...tarefas[indice],
    ...dadosNovos,
    id: tarefas[indice].id
  };

  await salvarArquivo(tarefas);
  return tarefas[indice];
}

async function deletarTarefa(id) {
  const tarefas = await listarTarefas();
  const tarefasFiltradas = tarefas.filter(t => String(t.id) !== String(id));

  if (tarefas.length === tarefasFiltradas.length) return false;

  await salvarArquivo(tarefasFiltradas);
  return true;
}

module.exports = {
  listarTarefas,
  buscarTarefaPorId,
  adicionarTarefa,
  atualizarTarefa,
  deletarTarefa
};