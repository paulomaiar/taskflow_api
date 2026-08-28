const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const { 
  ListarTarefas, 
  BuscarTarefa, 
  AdicionarTarefas, 
  AtualizarTarefa, 
  DeletarTarefas,
  obterMaisFrequente
} = require('./utils/tarefas');

const { 
  ListarUsuarios, 
  BuscarUsuario, 
  AdicionarUsuario, 
  AtualizarUsuario, 
  DeletarUsuario 
} = require('./utils/usuarios');

const app = express();
const PORTA = 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ mensagem: 'TaskFlow API funcionando!' });
});

// --- ROTAS DE TAREFAS ---

app.get('/tarefas', async (req, res) => {
  const tarefas = await ListarTarefas();
  const { coluna, prioridade } = req.query;
  let resultado = tarefas;

  if (coluna) resultado = resultado.filter(t => t.coluna === coluna);
  if (prioridade) resultado = resultado.filter(t => t.prioridade === prioridade);

  res.json(resultado);
});

app.get('/tarefas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const tarefa = await BuscarTarefa(id);

  if (!tarefa) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  res.json(tarefa);
});

app.post('/tarefas', async (req, res) => {
  const { texto, prioridade, coluna, cidade } = req.body;

  if (!texto) {
    return res.status(400).json({ erro: 'O campo texto é obrigatório' });
  }

  const novaTarefa = {
    id: crypto.randomInt(1000, 10000),
    texto: texto,
    prioridade: prioridade || 'media',
    coluna: coluna || 'A FAZER',
    cidade: cidade || '',
  };

  await AdicionarTarefas(novaTarefa);
  res.status(201).json(novaTarefa);
});

app.put('/tarefas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const tarefaAtualizada = await AtualizarTarefa(id, req.body);

  if (!tarefaAtualizada) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  res.json(tarefaAtualizada);
});

app.delete('/tarefas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const deletado = await DeletarTarefas(id);

  if (!deletado) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  res.json({ mensagem: 'Tarefa removida com sucesso', id });
});

// --- ROTAS DE USUÁRIOS ---

app.get('/usuarios', async (req, res) => {
  const usuarios = await ListarUsuarios();
  res.json(usuarios);
});

app.get('/usuarios/:id', async (req, res) => {
  const id = Number(req.params.id);
  const usuario = await BuscarUsuario(id);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  res.json(usuario);
});

app.post('/usuarios', async (req, res) => {
  const { nome, email } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: 'Faltando campo nome ou email' });
  }

  const novoUsuario = {
    id: crypto.randomInt(1000, 10000),
    email: email,
    nome: nome
  };

  try {
    await AdicionarUsuario(novoUsuario);
    res.status(201).json(novoUsuario);
  } catch (erro) {
    res.status(400).json({ erro: erro.message });
  }
});

app.put('/usuarios/:id', async (req, res) => {
  const id = Number(req.params.id);
  const usuario = await AtualizarUsuario(id, req.body);

  if (!usuario) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  res.json(usuario);
});

app.delete('/usuarios/:id', async (req, res) => {
  const id = Number(req.params.id);
  const deletado = await DeletarUsuario(id);

  if (!deletado) {
    return res.status(404).json({ erro: 'Usuário não encontrado' });
  }

  res.json({ mensagem: 'Usuário removido com sucesso', id });
});

// --- ROTA DE ESTATÍSTICAS ---

app.get('/estatisticas', async (req, res) => {
  let tarefas = await ListarTarefas();
  const { coluna } = req.query; // Captura ?coluna=...

  // Se o usuário mandou um filtro na URL, filtramos o array antes de calcular
  if (coluna) {
    tarefas = tarefas.filter(
      t => t.coluna.toLowerCase() === coluna.toLowerCase()
    );
  }

  const totalGeral = tarefas.length;

  // Total de tarefas em cada coluna
  const porColuna = {
    afazer: tarefas.filter(t => t.coluna.toLowerCase() === 'afazer').length,
    andamento: tarefas.filter(t => t.coluna.toLowerCase() === 'andamento').length,
    concluido: tarefas.filter(t => t.coluna.toLowerCase() === 'concluido').length
  };

  // Total de tarefas em cada prioridade
  const porPrioridade = {
    alta: tarefas.filter(t => t.prioridade.toLowerCase() === 'alta').length,
    media: tarefas.filter(t => t.prioridade.toLowerCase() === 'media').length,
    baixa: tarefas.filter(t => t.prioridade.toLowerCase() === 'baixa').length
  };

  // Executa a função do Passo 1 para achar os campeões
  const colunaComMaisTarefas = obterMaisFrequente(porColuna);
  const prioridadeMaisComum = obterMaisFrequente(porPrioridade);

  // Devolve o JSON consolidado
  res.json({
    totalGeral,
    porColuna,
    porPrioridade,
    colunaComMaisTarefas,
    prioridadeMaisComum
  });
});

app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    metodo: req.method,
    caminho: req.url,
  });
});

app.listen(PORTA, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORTA}`);
});