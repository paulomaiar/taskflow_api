const express = require('express');
const cors = require('cors');
const tarefas = require('./src/routes/tarefas.routes')
const usuarios = require('./src/routes/usuarios.routes')

const app = express();
const PORTA = 3000;

app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.json({ mensagem: 'TaskFlow API funcionando!' });
});

app.use('/tarefas', tarefas);
app.use('/usuarios', usuarios);

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