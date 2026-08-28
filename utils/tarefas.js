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
async function BuscarTarefa(id) {
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

// Atualizar Tarefa
async function AtualizarTarefa(id, dadosNovos) {
  const tarefas = await ListarTarefas();
  
  // Usamos String() para garantir a comparação mesmo se um ID for número e o outro texto
  const indice = tarefas.findIndex(t => String(t.id) === String(id));

  if (indice === -1) return null;

  // Mescla os dados antigos com os novos, mantendo o ID original
  tarefas[indice] = {
    ...tarefas[indice],
    ...dadosNovos,
    id: tarefas[indice].id
  };

  await salvarArquivo(tarefas);
  return tarefas[indice];
}
//  Deletar
async function DeletarTarefas(id) {
  const tarefas = await ListarTarefas(); // 1. Lê a lista
  const tarefasFiltradas = tarefas.filter(t => t.id !== Number(id)); // 2. Filtra
  
  if (tarefas.length === tarefasFiltradas.length) return false;

  await salvarArquivo(tarefasFiltradas); // 3. Grava a nova lista no disco
  return true;
}

function obterMaisFrequente(objetoContagem) {
  let maiorChave = 'nenhuma';
  let maiorValor = 0;

  // Object.entries converte o objeto em pares: [['afazer', 3], ['andamento', 5], ...]
  for (const [chave, valor] of Object.entries(objetoContagem)) {
    if (valor > maiorValor) {
      maiorValor = valor; // Atualiza o maior valor encontrado
      maiorChave = chave; // Guarda o nome da categoria com mais itens
    }
  }

  return maiorChave;
}


module.exports = { ListarTarefas, BuscarTarefa, AdicionarTarefas, AtualizarTarefa, DeletarTarefas, obterMaisFrequente };