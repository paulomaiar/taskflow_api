const express = require('express');
const cors = require('cors');

const tarefaRoutes = require('./routes/tarefas.routes');
const usuarioRoutes = require('./routes/usuarios.routes');
const estatisticaRoutes = require('./routes/estatisticas.routes');
const projetosRoutes = require('./routes/projetos.routes');

const app = express();
const PORTA = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ mensagem: 'TaskFlow API funcionando com MVC!' });
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

app.listen(PORTA, () => {
  console.log(`Servidor MVC rodando na porta ${PORTA}`);
});