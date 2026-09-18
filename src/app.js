require('dotenv').config();

const express = require('express');
const cors = require('cors');

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'taskflow-secret-development';
}

const logger = require('./middlewares/logger');
const validarContentType = require('./middlewares/validarContentType');
const temporizador = require('./middlewares/temporizador');
const tarefaRoutes = require('./routes/tarefas.routes');
const usuarioRoutes = require('./routes/usuarios.routes');
const estatisticaRoutes = require('./routes/estatisticas.routes');
const projetosRoutes = require('./routes/projetos.routes');
const authRoutes = require('./routes/authRoutes');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true,
}));
app.use(express.json());
app.use(logger);
app.use(validarContentType);
app.use(temporizador);

app.get('/', (req, res) => {
  res.json({ mensagem: 'TaskFlow API funcionando com MVC!' });
});

app.use('/auth', authRoutes);
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