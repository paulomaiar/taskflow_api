const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const logger = require('./middlewares/logger');
const validarContentType = require('./middlewares/validarContentType');
const temporizador = require('./middlewares/temporizador');
const usuarioModel = require('./models/usuarios.models');

const tarefaRoutes = require('./routes/tarefas.routes');
const usuarioRoutes = require('./routes/usuarios.routes');
const estatisticaRoutes = require('./routes/estatisticas.routes');
const projetosRoutes = require('./routes/projetos.routes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use(logger);
app.use(validarContentType);
app.use(temporizador);

app.get('/', (req, res) => {
  res.json({ mensagem: 'TaskFlow API funcionando com MVC!' });
});

app.post('/auth/login', async (req, res) => {
  const { usuario, senha } = req.body || {};

  if (!usuario || !senha) {
    return res.status(400).json({ erro: 'Usuário e senha são obrigatórios' });
  }

  try {
    const usuarios = await usuarioModel.listarUsuarios();
    const usuarioEncontrado = usuarios.find(
      (item) => item.email === usuario || item.nome === usuario
    );

    if (!usuarioEncontrado) {
      return res.status(401).json({ erro: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        id: usuarioEncontrado.id,
        nome: usuarioEncontrado.nome,
        email: usuarioEncontrado.email,
      },
      process.env.JWT_SECRET || 'taskflow-secret-development',
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      mensagem: 'Login realizado com sucesso',
      token,
      usuario: usuarioEncontrado,
    });
  } catch (erro) {
    return res.status(500).json({ erro: 'Erro interno ao realizar login' });
  }
});

app.use('/tarefas', tarefaRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/estatisticas', estatisticaRoutes);
app.use('/projetos', projetosRoutes);

app.use((req, res) => {
  res.status(404).json({
    erro: 'Rota não encontrada',
    metodo: req.method,
    caminho: req.url,
  });
});

module.exports = app;