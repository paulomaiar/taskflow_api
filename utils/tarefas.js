const fs = require('fs/promises');
const path = require('path');

// 1. Guardamos o caminho do arquivo com um nome claro
const CAMINHO_ARQUIVO = path.join(__dirname, '../tarefas.json');

// Função de Leitura
async function ListarTarefas() {
  try {
    const conteudo = await fs.readFile(CAMINHO_ARQUIVO, 'utf-8');
    return JSON.parse(conteudo);
  } catch (erro) {
    return [];
  }
}

//  Função de Escrita
async function salvarArquivo(lista) {
  await fs.writeFile(CAMINHO_ARQUIVO, JSON.stringify(lista, null, 2));
}

//  Buscar por ID
async function BuscarPorId(id) {
  const tarefas = await ListarTarefas(); // Lê o array primeiro
  return tarefas.find(t => t.id === Number(id)); // Busca no array lido
}

//  Adicionar
async function AdicionarTarefas(novaTarefa) {
  const tarefas = await ListarTarefas(); // 1. Lê a lista
  tarefas.push(novaTarefa);              // 2. Altera em memória (sem await no push)
  await salvarArquivo(tarefas);          // 3. Grava no disco
  return novaTarefa;
}

//  Deletar
async function DeletarTarefas(id) {
  const tarefas = await ListarTarefas(); // 1. Lê a lista
  const tarefasFiltradas = tarefas.filter(t => t.id !== Number(id)); // 2. Filtra
  
  if (tarefas.length === tarefasFiltradas.length) return false;

  await salvarArquivo(tarefasFiltradas); // 3. Grava a nova lista no disco
  return true;
}

module.exports = { ListarTarefas, BuscarPorId, AdicionarTarefas, DeletarTarefas };