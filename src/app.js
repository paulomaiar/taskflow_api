const express = require('express');
const cors = require('cors');

const logger = require('./middlewares/logger');
const validarContentType = require('./middlewares/validarContentType');
const temporizador = require('./middlewares/temporizador');
const tarefaRoutes = require('./routes/tarefas.routes');
const usuarioRoutes = require('./routes/usuarios.routes');
const estatisticaRoutes = require('./routes/estatisticas.routes');
const projetosRoutes = require('./routes/projetos.routes');
const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
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