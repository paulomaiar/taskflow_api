const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const { 
  ListarTarefas, 
  BuscarPorId, 
  AdicionarTarefas, 
  AtualizarTarefa, 
  DeletarTarefas 
} = require('./utils/tarefas');

const { ListarUsuarios, AdicionarUsuario } = require('./usuarios');

const app = express();
const PORTA = 3000;

app.use(express.json());
app.use(cors());

// Rota raiz
app.get('/', (req, res) => {
  res.json({ mensagem: 'TaskFlow API funcionando!' });
});

// 1. GET /tarefas (Todas as tarefas ou filtradas)
app.get('/tarefas', async (req, res) => {
  const tarefas = await ListarTarefas();
  const { coluna, prioridade } = req.query;
  let resultado = tarefas;

  if (coluna) {
    resultado = resultado.filter(t => t.coluna === coluna);
  }

  if (prioridade) {
    resultado = resultado.filter(t => t.prioridade === prioridade);
  }

  res.json(resultado);
});

// 2. GET /tarefas/:id (Buscar uma por ID)
app.get('/tarefas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const tarefa = await BuscarPorId(id);

  if (!tarefa) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  res.json(tarefa);
});

// 3. POST /tarefas (Criar nova tarefa)
app.post('/tarefas', async (req, res) => {
  const { texto, prioridade, coluna, cidade } = req.body;

  if (!texto) {
    return res.status(400).json({ erro: 'O campo texto é obrigatório' });
  }

  const novaTarefa = {
    id: crypto.randomInt(1000, 10000),
    texto: texto,
    prioridade: prioridade || 'media',
    coluna: coluna || 'A FAZER', // Padronizado com o React
    cidade: cidade || '',
  };

  await AdicionarTarefas(novaTarefa);
  res.status(201).json(novaTarefa);
});

// 4. PUT /tarefas/:id (Atualizar tarefa existente)
app.put('/tarefas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const tarefaAtualizada = await AtualizarTarefa(id, req.body);

  if (!tarefaAtualizada) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  res.json(tarefaAtualizada);
});

// 5. DELETE /tarefas/:id (Remover tarefa)
app.delete('/tarefas/:id', async (req, res) => {
  const id = Number(req.params.id);
  const deletado = await DeletarTarefas(id);

  if (!deletado) {
    return res.status(404).json({ erro: 'Tarefa não encontrada' });
  }

  res.json({ mensagem: 'Tarefa removida com sucesso', id });
});

// Rotas de Usuários
app.get('/usuarios', async (req, res) => {
  const usuarios = await ListarUsuarios();
  res.json(usuarios);
});

app.post('/usuarios', async (req, res) => {
  const { nome } = req.body;

  if (!nome) {
    return res.status(400).json({ erro: 'O campo nome é obrigatório' });
  }

  const novoUsuario = {
    id: crypto.randomInt(1000, 10000),
    nome: nome
  };

  await AdicionarUsuario(novoUsuario);
  res.status(201).json(novoUsuario);
});

// Rota para tratar 404 (não encontrada)
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